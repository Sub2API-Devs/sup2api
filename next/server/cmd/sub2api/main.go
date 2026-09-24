package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/app"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/sandbox"
)

// Version is set at build time with -ldflags "-X main.Version=...".
var Version = "0.1.0-dev"

func main() {
	// Hidden subcommand used by the plugin sandbox launcher.
	if len(os.Args) > 1 && os.Args[1] == "plugin-exec" {
		os.Exit(runPluginExec(os.Args[2:]))
	}

	cfg, err := config.Load(runtime.GOOS)
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(2)
	}
	var level slog.Level
	if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
		level = slog.LevelInfo
	}
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})).With("node", cfg.NodeID)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := app.Run(ctx, cfg, Version, log); err != nil {
		log.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

// runPluginExec is the sandbox launcher child (see plugin/sandbox).
var runPluginExec = sandbox.RunExec
