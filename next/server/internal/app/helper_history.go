package app

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usage"
)

// Scheduled tasks of helper history.
const (
	HelperPayloadExpiryTask = "core.helper.payload_expiry"
	HelperUsageReplayTask   = "core.helper.usage_replay"
)

// helperUsageReplaySpec replays the helper usage outbox into usage every 5 s
// on one node. The receipt/usage transaction and the outbox digest make a
// replay idempotent, so a run of an old node meanwhile (rolling upgrade)
// does not count anything twice.
func helperUsageReplaySpec(settler *usage.Service, store core.HelperHistory) core.TaskSpec {
	return core.TaskSpec{
		Name:  HelperUsageReplayTask,
		Title: core.LocalizedText{"en": "Replay helper usage", "zh": "回放 helper 用量"},
		Description: core.LocalizedText{
			"en": "Records the usage that helper history entries carry (their outbox) as usage rows; each entry is recorded once.",
			"zh": "把 helper 历史记录带的用量（outbox）记成用量记录，每条只记一次。",
		},
		Scope:   core.TaskCluster,
		Every:   5 * time.Second,
		Timeout: 45 * time.Second,
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			return core.TaskResult{}, settler.DrainHelperHistoryUsage(ctx, store)
		},
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
