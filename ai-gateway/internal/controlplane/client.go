package controlplane

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/connectivity"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
)

// Client is the data plane's narrow dependency on the control plane.
// Keeping this interface protobuf-shaped makes the runtime easy to test while
// preserving one authoritative wire contract.
type Client interface {
	Ready() bool
	ResolveAPIKey(context.Context, *controlv1.ResolveAPIKeyRequest) (*controlv1.ResolveAPIKeyResponse, error)
	RenewAuthGrant(context.Context, *controlv1.RenewAuthGrantRequest) (*controlv1.ResolveAPIKeyResponse, error)
	OpenRequest(context.Context, *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error)
	SignBedrockRequest(context.Context, *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error)
	RenewLease(context.Context, *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error)
	AbortRequest(context.Context, *controlv1.AbortRequestRequest) (*controlv1.AbortRequestResponse, error)
	SettleRequest(context.Context, *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error)
	WatchInvalidations(context.Context, *controlv1.WatchInvalidationsRequest) (InvalidationStream, error)
	Close() error
}

type InvalidationStream interface {
	Recv() (*controlv1.InvalidationEvent, error)
}

type DialConfig struct {
	Target       string
	Insecure     bool
	DialTimeout  time.Duration
	WaitForReady bool
	CAFile       string
	CertFile     string
	KeyFile      string
	ServerName   string
}

type grpcClient struct {
	conn *grpc.ClientConn
	api  controlv1.DataPlaneControlClient
}

// Dial creates a long-lived HTTP/2 gRPC connection. When WaitForReady is set,
// startup blocks until transport readiness or the dial deadline.
func Dial(ctx context.Context, cfg DialConfig) (Client, error) {
	creds, err := transportCredentials(cfg)
	if err != nil {
		return nil, err
	}

	conn, err := grpc.NewClient(
		cfg.Target,
		grpc.WithTransportCredentials(creds),
		grpc.WithDefaultCallOptions(
			grpc.MaxCallRecvMsgSize(4<<20),
			grpc.MaxCallSendMsgSize(4<<20),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("create control-plane client: %w", err)
	}

	if cfg.WaitForReady {
		if err := waitForReady(ctx, conn); err != nil {
			_ = conn.Close()
			return nil, err
		}
	} else {
		conn.Connect()
	}

	return &grpcClient{conn: conn, api: controlv1.NewDataPlaneControlClient(conn)}, nil
}

func (c *grpcClient) Ready() bool {
	state := c.conn.GetState()
	if state == connectivity.Idle {
		c.conn.Connect()
	}
	return state == connectivity.Ready
}

func (c *grpcClient) ResolveAPIKey(ctx context.Context, req *controlv1.ResolveAPIKeyRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	return c.api.ResolveAPIKey(ctx, req)
}

func (c *grpcClient) RenewAuthGrant(ctx context.Context, req *controlv1.RenewAuthGrantRequest) (*controlv1.ResolveAPIKeyResponse, error) {
	return c.api.RenewAuthGrant(ctx, req)
}

func (c *grpcClient) OpenRequest(ctx context.Context, req *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	return c.api.OpenRequest(ctx, req)
}

func (c *grpcClient) SignBedrockRequest(ctx context.Context, req *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error) {
	return c.api.SignBedrockRequest(ctx, req)
}

func (c *grpcClient) RenewLease(ctx context.Context, req *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	return c.api.RenewLease(ctx, req)
}

func (c *grpcClient) AbortRequest(ctx context.Context, req *controlv1.AbortRequestRequest) (*controlv1.AbortRequestResponse, error) {
	return c.api.AbortRequest(ctx, req)
}

func (c *grpcClient) SettleRequest(ctx context.Context, req *controlv1.SettleRequestRequest) (*controlv1.SettleRequestResponse, error) {
	return c.api.SettleRequest(ctx, req)
}

func (c *grpcClient) WatchInvalidations(ctx context.Context, req *controlv1.WatchInvalidationsRequest) (InvalidationStream, error) {
	return c.api.WatchInvalidations(ctx, req)
}

func (c *grpcClient) Close() error { return c.conn.Close() }

func waitForReady(ctx context.Context, conn *grpc.ClientConn) error {
	conn.Connect()
	for {
		state := conn.GetState()
		if state == connectivity.Ready {
			return nil
		}
		if !conn.WaitForStateChange(ctx, state) {
			return fmt.Errorf("control-plane connection not ready: %w", context.Cause(ctx))
		}
	}
}

func transportCredentials(cfg DialConfig) (credentials.TransportCredentials, error) {
	if cfg.Insecure {
		return insecure.NewCredentials(), nil
	}

	pem, err := os.ReadFile(cfg.CAFile)
	if err != nil {
		return nil, fmt.Errorf("read control-plane CA: %w", err)
	}
	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM(pem) {
		return nil, fmt.Errorf("control-plane CA contains no certificates")
	}

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS13,
		RootCAs:    roots,
		ServerName: cfg.ServerName,
	}
	if cfg.CertFile != "" {
		certificate, err := tls.LoadX509KeyPair(cfg.CertFile, cfg.KeyFile)
		if err != nil {
			return nil, fmt.Errorf("load control-plane client certificate: %w", err)
		}
		tlsConfig.Certificates = []tls.Certificate{certificate}
	}
	return credentials.NewTLS(tlsConfig), nil
}
