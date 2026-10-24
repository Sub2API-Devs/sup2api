// Package app wires every module into one server process. It is the only
// place that imports module packages side by side; modules depend on each
// other only through internal/core interfaces.
package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
)

// Run starts the server and blocks until ctx is cancelled, then shuts down
// in reverse order.
func Run(ctx context.Context, cfg *config.Config, version string, log *slog.Logger) error {
	if cfg.Managed.Enabled {
		return runManaged(ctx, cfg, version, log)
	}
	return run(ctx, cfg, version, log, nil)
}

// run brings the process up phase by phase (see phases.go) and tears it down
// in exactly the reverse order of what succeeded.
func run(ctx context.Context, cfg *config.Config, version string, log *slog.Logger, managed *managedCore) error {
	b := &boot{ctx: ctx, cfg: cfg, version: version, log: log, managed: managed, stopper: newTeardown()}
	defer func() {
		sctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		// The supervisor observes its own drain deadline. It must never receive
		// completion while core producers are still running after a timeout.
		if managed != nil {
			sctx = context.Background()
		}
		b.stopper.run(sctx)
	}()

	// ------------------------------------------------------------ storage
	if err := b.openStorage(); err != nil {
		return err
	}

	// ------------------------------------------------------------ cluster
	if err := b.startCluster(); err != nil {
		return err
	}

	// ------------------------------------------------------------ core services
	trust, err := b.buildCoreServices()
	if err != nil {
		return err
	}

	// ------------------------------------------------------------ plugin runtime
	if err := b.startPluginRuntime(trust); err != nil {
		return err
	}
	// A managed core builds the background pair now (the console holds it) and
	// starts it on admission; a standalone core starts it right away.
	b.buildBackground()
	if managed == nil {
		if err := b.startBackground(); err != nil {
			return err
		}
	}

	// ------------------------------------------------------------ HTTP
	return b.startHTTP()
}
