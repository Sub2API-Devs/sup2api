package server

import (
	"ccgateway/worker/internal/worker"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Server struct {
	worker   worker.Worker
	port     int
	handler  http.Handler
	srv      *http.Server
	adminKey string
}

func New(w worker.Worker, port int, adminKey ...string) *Server {
	s := &Server{worker: w, port: port}
	if len(adminKey) > 0 {
		s.adminKey = adminKey[0]
	}
	mux := http.NewServeMux()
	mux.Handle("/", w)
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/admin/features", s.handleFeatures)
	s.handler = mux
	// Initialize before Run so Shutdown does not race the server goroutine.
	s.srv = &http.Server{Addr: fmt.Sprintf(":%d", port), Handler: mux, ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 30 * time.Second, IdleTimeout: time.Minute}
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
	_ = json.NewEncoder(w).Encode(status)
}

func (s *Server) Run() error                         { return s.srv.ListenAndServe() }
func (s *Server) Shutdown(ctx context.Context) error { return s.srv.Shutdown(ctx) }
