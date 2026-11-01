package api

import (
	"context"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"time"
)

// ShutdownGrace is how long a graceful exit waits for requests in progress
// (02 §4.5: compose stop_grace_period 15 s, Shutdown 12 s).
const ShutdownGrace = 12 * time.Second

// HTTPServer is the net/http server of 02 §3.1: this handler only (no
// ServeMux: it would redirect //, /./ and the like), 240 s for headers and
// keep-alive idleness, 64 KiB of headers, no error log (it would carry
// URLs).
func (s *Server) HTTPServer() *http.Server {
	return &http.Server{
		Handler:           s,
		ReadHeaderTimeout: s.idle,
		IdleTimeout:       s.idle,
		MaxHeaderBytes:    64 << 10,
		ErrorLog:          log.New(io.Discard, "", 0),
	}
}

// Serve answers on ln until ctx ends, then exits gracefully: no new
// connections, requests in progress get up to grace to finish (then their
// connections are closed), and every open tunnel is closed. It returns
// nil after a graceful exit and the listener's error otherwise.
func (s *Server) Serve(ctx context.Context, ln net.Listener, grace time.Duration) error {
	srv := s.HTTPServer()
	errc := make(chan error, 1)
	go func() { errc <- srv.Serve(ln) }()
	select {
	case err := <-errc:
		s.CloseTunnels()
		return err
	case <-ctx.Done():
	}
	sctx, cancel := context.WithTimeout(context.Background(), grace)
	err := srv.Shutdown(sctx)
	cancel()
	if err != nil {
		srv.Close()
	}
	s.CloseTunnels()
	if err := <-errc; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
