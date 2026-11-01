// Command ccg-controller is the CCGateway account runtime controller.
//
// Subcommands:
//
//	serve        the HTTP API (default)
//	healthcheck  the compose health check (exit 0 healthy, 1 not)
//	version      print the version
package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"

	"ccgateway/controller/internal/healthcheck"
)

// buildVersion is set with -ldflags "-X main.buildVersion=<v>".
var buildVersion = ""

func version() string {
	if v := os.Getenv("CCG_CONTROLLER_VERSION"); v != "" {
		return v
	}
	if buildVersion != "" {
		return buildVersion
	}
	return "dev"
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}

func run(args []string, stdout, stderr io.Writer) int {
	cmd := "serve"
	if len(args) > 0 {
		cmd = args[0]
	}
	switch cmd {
	case "healthcheck":
		return healthcheck.Run(context.Background(), os.Getenv)
	case "version":
		fmt.Fprintln(stdout, version())
		return 0
	case "serve":
		ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
		defer stop()
		return serve(ctx, os.LookupEnv, stderr, build, nil)
	default:
		fmt.Fprintf(stderr, "usage: ccg-controller [serve|healthcheck|version]\n")
		return 2
	}
}
