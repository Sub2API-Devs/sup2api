package server

import (
	"ccgateway/worker/internal/worker"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"time"
)

type Server struct {
	worker   worker.Worker
	port     int
	srv      *http.Server
	adminKey string
}

// idleTimeout is how long an idle keep-alive connection stays open. The core
// reuses a connection it kept for up to 110 s (its own idle limit), so this
// must stay well above it: a connection both sides would close at the same
// time is one the core can write into after this end closed it
// (CONTRACTS §63.8).
const idleTimeout = 180 * time.Second

// New serves w on port; adminKey opens /admin/features (empty opens nothing).
func New(w worker.Worker, port int, adminKey string) *Server {
	s := &Server{worker: w, port: port, adminKey: adminKey}
	mux := http.NewServeMux()
	mux.Handle("/", w)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/admin/features", s.handleFeatures)
	// Initialize before Run so Shutdown does not race the server goroutine.
	s.srv = &http.Server{Addr: fmt.Sprintf(":%d", port), Handler: mux, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: idleTimeout}
	return s
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	status, err := s.worker.Health(ctx)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "unhealthy"})
		return
	}
	if status.Status != "healthy" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	_ = json.NewEncoder(w).Encode(status)
}

func (s *Server) Run() error                         { return s.srv.ListenAndServe() }
func (s *Server) Shutdown(ctx context.Context) error { return s.srv.Shutdown(ctx) }

// BindHost must be configured before Run. Empty keeps the historical wildcard
// listener; loopback/IPv6 hosts are joined without changing the worker port.
func (s *Server) BindHost(host string) { s.srv.Addr = net.JoinHostPort(host, fmt.Sprint(s.port)) }
