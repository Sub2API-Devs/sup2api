package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/app"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/sandbox"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/procguard"
)

// Version is set at build time with -ldflags "-X main.Version=...".
var Version = "0.1.0-dev"

func main() {
	if len(os.Args) == 2 && os.Args[1] == "version" {
		fmt.Println(Version)
		return
	}
	if len(os.Args) == 2 && os.Args[1] == "schema-contract" {
		contract, err := app.SchemaContract()
		if err != nil {
			slog.Error("schema contract", "err", err)
			os.Exit(1)
		}
		fmt.Println(contract)
		return
	}
	// Hidden subcommand used by the plugin sandbox launcher.
	if len(os.Args) > 1 && os.Args[1] == "plugin-exec" {
		os.Exit(runPluginExec(os.Args[2:]))
	}
	if len(os.Args) > 1 && os.Args[1] == "dev" {
		os.Exit(runDev(os.Args[2:]))
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
	if err := hardenProcess(log); err != nil {
		log.Error("process hardening", "err", err)
		os.Exit(2)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := app.Run(ctx, cfg, Version, log); err != nil {
		log.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

// runPluginExec is the sandbox launcher child (see plugin/sandbox).
var runPluginExec = sandbox.RunExec

// hardenProcess runs once the configuration is loaded: the secret variables
// leave the process environment (everything later reads the loaded Config)
// and, on Linux, the process becomes non-dumpable so other processes of the
// same user - plugins included - cannot read /proc/<pid>/environ or memory.
// A failure to blank the initial environment block is logged; a failure to
// clear the dumpable flag stops the start.
func hardenProcess(log *slog.Logger) error {
	keys := append(append([]string(nil), config.SensitiveEnv...), ccgateway.SensitiveEnv...)
	if err := procguard.ScrubEnv(keys); err != nil {
		log.Warn("could not blank secrets in the initial environment block", "err", err)
	}
	return procguard.DisableDumping()
}
