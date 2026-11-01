// Command ccg-controller is the CCGateway account runtime controller.
//
// Subcommands:
//
//	serve        the HTTP API (default) - wired by writer C (api + cmd)
//	healthcheck  the compose health check (exit 0 healthy, 1 not)
//	version      print the version
//
// PLACEHOLDER: writer C replaces serve with the real wiring (02 §4.5);
// healthcheck and version are final.
package main

import (
	"context"
	"fmt"
	"os"

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
	cmd := "serve"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	switch cmd {
	case "healthcheck":
		os.Exit(healthcheck.Run(context.Background(), os.Getenv))
	case "version":
		fmt.Println(version())
	case "serve":
		fmt.Fprintln(os.Stderr, "ccg-controller: serve is not wired yet")
		os.Exit(70)
	default:
		fmt.Fprintf(os.Stderr, "usage: ccg-controller [serve|healthcheck|version]\n")
		os.Exit(2)
	}
}
