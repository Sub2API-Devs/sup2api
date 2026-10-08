package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

// A replay may run on any ready node. The receipt/usage transaction and outbox
// digest make concurrent delivery idempotent; expiry keeps ownership tombstones.
func startHelperHistoryMaintenance(parent context.Context, settler *usage.Service, store core.HelperHistory, admitted func() bool) func(context.Context) {
	ctx, cancel := context.WithCancel(context.WithoutCancel(parent))
	done := make(chan struct{})
	go func() {
		defer close(done)
		tick := time.NewTicker(5 * time.Second)
		defer tick.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-tick.C:
				if admitted != nil && !admitted() {
					continue
				}
				work, stop := context.WithTimeout(ctx, 45*time.Second)
				if err := settler.DrainHelperHistoryUsage(work, store); err != nil && ctx.Err() == nil {
					slog.ErrorContext(work, "helper history usage replay failed", "error", err)
				}
				if err := store.ExpirePayloads(work); err != nil && ctx.Err() == nil {
					slog.ErrorContext(work, "helper history expiry failed", "error", err)
				}
				stop()
			}
		}
	}()
	return func(wait context.Context) {
		cancel()
		select {
		case <-done:
		case <-wait.Done():
		}
	}
}
