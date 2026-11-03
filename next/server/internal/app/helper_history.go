package app

import (
	"context"
	"log/slog"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

// HelperPayloadExpiryTask clears expired helper history content.
const HelperPayloadExpiryTask = "core.helper.payload_expiry"

// A replay may run on any ready node. The receipt/usage transaction and outbox
// digest make concurrent delivery idempotent. (It moves to the task
// framework with the billing tasks.)
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

// helperPayloadExpirySpec clears expired helper content once a minute on one
// node; the ownership tombstones stay.
func helperPayloadExpirySpec(store core.HelperHistory) core.TaskSpec {
	return core.TaskSpec{
		Name:  HelperPayloadExpiryTask,
		Title: core.LocalizedText{"en": "Clear expired helper payloads", "zh": "清空过期 helper 负载"},
		Description: core.LocalizedText{
			"en": "Clears the content of expired helper history entries, keeping their ownership records.",
			"zh": "清空已过期 helper 历史记录的内容，保留归属记录。",
		},
		Scope:   core.TaskCluster,
		Every:   time.Minute,
		Timeout: 50 * time.Second,
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			return core.TaskResult{}, store.ExpirePayloads(ctx)
		},
	}
}
