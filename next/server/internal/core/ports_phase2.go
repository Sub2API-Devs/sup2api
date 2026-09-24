package core

import "context"

// ============================================================ phase 2 ports (G gateway, H events-jobs)

// JobTrigger (H) runs a plugin job immediately on this node, recording a
// manual plugin_job_runs row. Returns ErrNotFound for unknown jobs and
// ErrPluginUnavailable when the plugin is not active.
type JobTrigger interface {
	RunNow(ctx context.Context, pluginKey, jobID string, actorID int64) error
}

// HookStat is the cluster-wide counter set for one plugin hook.
type HookStat struct {
	HookID      string `json:"hook_id"`
	Point       string `json:"point"`
	Calls       int64  `json:"calls"`
	Denies      int64  `json:"denies"`
	Timeouts    int64  `json:"timeouts"`
	Errors      int64  `json:"errors"`
	P99Ms       int    `json:"p99_ms"`
	BreakerOpen bool   `json:"breaker_open"`
}

// HookStatsSource (G) exposes hook counters for the plugin detail page.
type HookStatsSource interface {
	HookStats(ctx context.Context, pluginKey string) ([]HookStat, error)
}
