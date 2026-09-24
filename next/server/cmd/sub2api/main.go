package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Version is set at build time with -ldflags "-X main.Version=...".
var Version = "0.1.0-dev"

func main() {
	// Hidden subcommand used by the plugin sandbox launcher (owner: D).
	if len(os.Args) > 1 && os.Args[1] == "plugin-exec" {
		os.Exit(runPluginExec(os.Args[2:]))
	}

	cfg, err := config.Load(runtime.GOOS)
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(2)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	db, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("database", "err", err)
		os.Exit(1)
	}
	defer db.Close()
	applied, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	if err != nil {
		slog.Error("migrate", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied", "files", applied)

	gin.SetMode(gin.ReleaseMode)
	engine := gin.New()
	engine.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "version": Version, "node": cfg.NodeID})
	})
	// Module wiring is added by the integrator in internal/app (phase 1 merge).

	srv := &http.Server{Addr: cfg.HTTPAddr, Handler: engine, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		slog.Info("listening", "addr", cfg.HTTPAddr, "node", cfg.NodeID, "version", Version)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("http", "err", err)
			stop()
		}
	}()
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

// runPluginExec is replaced by the sandbox launcher implementation (owner: D).
var runPluginExec = func(args []string) int {
	slog.Error("plugin-exec not implemented")
	return 1
}
