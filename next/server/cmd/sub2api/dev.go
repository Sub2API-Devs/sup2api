package main

import (
	"bufio"
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/url"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/app"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/devenv"
)

// runDev is `sub2api dev`: a complete core on this machine with nothing to
// install or configure (see devenv). `sub2api-plugin dev` runs it with the
// plugin under development in --builtin-dir.
func runDev(args []string) int {
	fs := flag.NewFlagSet("dev", flag.ContinueOnError)
	addr := fs.String("addr", "127.0.0.1:8080", "HTTP listen address")
	state := fs.String("state", "", "state directory: secrets, plugin data (default <user cache>/sub2api-dev)")
	builtin := fs.String("builtin-dir", "", "plugin packages (*.s2plugin) installed and enabled at startup")
	reset := fs.Bool("reset", false, "drop the dev database and plugin data first")
	stdinStop := fs.Bool("exit-on-stdin-close", false, "shut down when stdin closes (used by sub2api-plugin dev)")
	logLevel := fs.String("log-level", "info", "debug | info | warn | error")
	if err := fs.Parse(args); err != nil {
		return 2
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if *stdinStop {
		// A parent that dies or wants a graceful stop closes the pipe; this
		// works on Windows, where a process cannot be sent os.Interrupt.
		go func() {
			_, _ = io.Copy(io.Discard, bufio.NewReader(os.Stdin))
			stop()
		}()
	}

	fmt.Fprintln(os.Stderr, "sub2api dev: starting local PostgreSQL (the first run downloads it, ~25 MB)...")
	env, err := devenv.Prepare(ctx, devenv.Options{StateDir: *state, Addr: *addr, BuiltinDir: *builtin, Reset: *reset})
	if err != nil {
		fmt.Fprintln(os.Stderr, "sub2api dev:", err)
		return 1
	}
	defer env.Close()
	if os.Getenv("SUB2API_LOG_LEVEL") == "" {
		_ = os.Setenv("SUB2API_LOG_LEVEL", *logLevel)
	}
	cfg, err := config.Load(runtime.GOOS)
	if err != nil {
		fmt.Fprintln(os.Stderr, "sub2api dev: config:", err)
		return 2
	}
	var level slog.Level
	if err := level.UnmarshalText([]byte(cfg.LogLevel)); err != nil {
		level = slog.LevelInfo
	}
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level}))
	slog.SetDefault(log)
	if err := hardenProcess(log); err != nil {
		fmt.Fprintln(os.Stderr, "sub2api dev: process hardening:", err)
		return 2
	}

	redis := env.RedisURL
	if env.MemoryRedis {
		redis = "in memory (cleared on exit)"
	}
	fmt.Fprintf(os.Stderr, `
  sub2api dev %s
  console   %s
  admin     %s / %s
  database  %s
  redis     %s
  plugins   %s
  state     %s

`, Version, env.URL, env.AdminEmail, env.AdminPassword, redactPassword(env.DatabaseURL), redis, cfg.Plugins.BuiltinDir, env.StateDir)

	if err := app.Run(ctx, cfg, Version, log); err != nil {
		log.Error("server stopped", "err", err)
		return 1
	}
	return 0
}

// redactPassword hides the password of a URL for printing.
func redactPassword(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "(set)"
	}
	return u.Redacted()
}
