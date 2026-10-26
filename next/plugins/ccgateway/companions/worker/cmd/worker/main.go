// The account container has a CPU quota (2 cores) on a host with hundreds: size
// GOMAXPROCS to the quota as Go 1.25+ does by default (go.mod is 1.24), or
// the GC starts a mark worker per host core and the quota throttles every
// request in the container (CONTRACTS §63.6).
//
//go:debug containermaxprocs=1
//go:debug updatemaxprocs=1
package main

import (
	"ccgateway/worker/internal/config"
	"ccgateway/worker/internal/server"
	"ccgateway/worker/internal/worker"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	w, err := worker.New(cfg)
	if err != nil {
		return fmt.Errorf("create worker: %w", err)
	}
	defer w.Close()
	srv := server.New(w, cfg.Port, cfg.AdminKey)
	srv.BindHost(cfg.BindHost)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	done := make(chan error, 1)
	go func() { done <- srv.Run() }()
	select {
	case err := <-done:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		return srv.Shutdown(shutdown)
	}
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
