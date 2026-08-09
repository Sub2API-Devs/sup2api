package controlplane

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/config"
	controlv1 "github.com/Wei-Shaw/sub2api/internal/controlplane/controlv1"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/google/wire"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

var ProviderSet = wire.NewSet(
	ProvideGrantSigner,
	ProvideWorkerAdmissionRepository,
	NewLeaseStore,
	NewAdmissionController,
	NewSettlementController,
	NewWorkerLogBridge,
	NewRPCService,
	NewServer,
)

func ProvideWorkerAdmissionRepository(repo service.WorkerRepository) WorkerAdmissionRepository {
	return repo
}

type Server struct {
	cfg     config.DataPlaneControlConfig
	service *RPCService
	hub     *InvalidationHub

	mu       sync.Mutex
	grpc     *grpc.Server
	listener net.Listener
	cancel   context.CancelFunc
}

func ProvideGrantSigner(cfg *config.Config) (*GrantSigner, error) {
	if cfg == nil || !cfg.DataPlaneControl.Enabled {
		return nil, nil
	}
	return NewGrantSigner(cfg.DataPlaneControl.GrantSecret, time.Duration(cfg.DataPlaneControl.GrantTTLSeconds)*time.Second)
}

func NewServer(cfg *config.Config, rpc *RPCService, cache service.APIKeyCache) (*Server, error) {
	if cfg == nil {
		return nil, fmt.Errorf("data-plane control config is required")
	}
	hub := NewInvalidationHub(cache)
	if rpc != nil {
		rpc.invalidations = hub
	}
	return &Server{cfg: cfg.DataPlaneControl, service: rpc, hub: hub}, nil
}

func (s *Server) Enabled() bool { return s != nil && s.cfg.Enabled }

func (s *Server) Start(parent context.Context) error {
	if !s.Enabled() {
		return nil
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.grpc != nil {
		return nil
	}
	listener, err := listenControl(s.cfg)
	if err != nil {
		return err
	}
	options, err := grpcServerOptions(s.cfg)
	if err != nil {
		_ = listener.Close()
		return err
	}
	server := grpc.NewServer(options...)
	controlv1.RegisterDataPlaneControlServer(server, s.service)
	ctx, cancel := context.WithCancel(parent)
	s.grpc = server
	s.listener = listener
	s.cancel = cancel
	s.hub.Start(ctx)
	if s.service != nil && s.service.leases != nil {
		s.service.leases.Start(ctx)
	}
	go func() {
		if serveErr := server.Serve(listener); serveErr != nil && !errors.Is(serveErr, grpc.ErrServerStopped) {
			slog.Error("Sup2API data-plane control server stopped unexpectedly", "error", serveErr)
		}
	}()
	return nil
}

func (s *Server) Stop(ctx context.Context) error {
	if s == nil {
		return nil
	}
	s.mu.Lock()
	server := s.grpc
	listener := s.listener
	cancel := s.cancel
	s.grpc = nil
	s.listener = nil
	s.cancel = nil
	s.mu.Unlock()
	if server == nil {
		return nil
	}
	if cancel != nil {
		cancel()
	}
	if s.service != nil && s.service.leases != nil {
		s.service.leases.Stop()
	}
	s.hub.Stop()
	done := make(chan struct{})
	go func() {
		server.GracefulStop()
		close(done)
	}()
	select {
	case <-done:
	case <-ctx.Done():
		server.Stop()
		<-done
	}
	if listener != nil {
		_ = listener.Close()
	}
	if s.cfg.Network == "unix" {
		if err := os.Remove(s.cfg.Address); err != nil && !errors.Is(err, os.ErrNotExist) {
			return fmt.Errorf("remove data-plane control socket: %w", err)
		}
	}
	return nil
}

func listenControl(cfg config.DataPlaneControlConfig) (net.Listener, error) {
	if cfg.Network == "unix" {
		if err := prepareUnixSocket(cfg.Address); err != nil {
			return nil, err
		}
	}
	listener, err := net.Listen(cfg.Network, cfg.Address)
	if err != nil {
		return nil, fmt.Errorf("listen for data-plane control RPC: %w", err)
	}
	if cfg.Network == "unix" {
		if err := os.Chmod(cfg.Address, 0o600); err != nil {
			_ = listener.Close()
			return nil, fmt.Errorf("secure data-plane control socket: %w", err)
		}
	}
	return listener, nil
}

func prepareUnixSocket(path string) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return fmt.Errorf("create data-plane control socket directory: %w", err)
	}
	info, err := os.Lstat(path)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("inspect data-plane control socket: %w", err)
	}
	if info.Mode()&os.ModeSocket == 0 {
		return fmt.Errorf("refusing to replace non-socket data-plane control path %q", path)
	}
	if err := os.Remove(path); err != nil {
		return fmt.Errorf("remove stale data-plane control socket: %w", err)
	}
	return nil
}

func grpcServerOptions(cfg config.DataPlaneControlConfig) ([]grpc.ServerOption, error) {
	options := []grpc.ServerOption{grpc.MaxRecvMsgSize(1 << 20), grpc.MaxSendMsgSize(1 << 20)}
	if cfg.Network != "tcp" || cfg.Insecure {
		return options, nil
	}
	certificate, err := tls.LoadX509KeyPair(cfg.TLS.CertFile, cfg.TLS.KeyFile)
	if err != nil {
		return nil, fmt.Errorf("load data-plane control server certificate: %w", err)
	}
	caPEM, err := os.ReadFile(cfg.TLS.CAFile)
	if err != nil {
		return nil, fmt.Errorf("read data-plane control client CA: %w", err)
	}
	clientCAs := x509.NewCertPool()
	if !clientCAs.AppendCertsFromPEM(caPEM) {
		return nil, fmt.Errorf("parse data-plane control client CA")
	}
	tlsConfig := &tls.Config{
		MinVersion:   tls.VersionTLS13,
		Certificates: []tls.Certificate{certificate},
		ClientAuth:   tls.RequireAndVerifyClientCert,
		ClientCAs:    clientCAs,
	}
	return append(options, grpc.Creds(credentials.NewTLS(tlsConfig))), nil
}
