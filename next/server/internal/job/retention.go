package job

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// RetentionTask is the cluster task that trims plugin job run history.
const RetentionTask = "core.jobs.retention"

// RetentionTaskSpec runs PurgeRuns every RetentionInterval on one node.
func (s *Bridge) RetentionTaskSpec() core.TaskSpec {
	return core.TaskSpec{
		Name:  RetentionTask,
		Title: core.LocalizedText{"en": "Trim plugin job runs", "zh": "清理插件任务记录"},
		Description: core.LocalizedText{
			"en": "Keeps the newest runs of every plugin job and marks runs whose node went away as failed.",
			"zh": "每个插件任务只保留最近的运行记录，并把所在节点已消失的运行标为失败。",
		},
		Scope:   core.TaskCluster,
		Every:   s.opts.RetentionInterval,
		Timeout: 5 * time.Minute,
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			n, err := s.PurgeRuns(ctx)
			return core.TaskResult{Count: int(n)}, err
		},
	}
}

// PurgeRuns keeps the newest KeepRuns runs per (plugin, job) and marks runs
// stuck in "running" for longer than StaleAfter as failed.
func (s *Bridge) PurgeRuns(ctx context.Context) (int64, error) {
	if _, err := s.db.Pool.Exec(ctx, `UPDATE plugin_job_runs
		SET status = $1, finished_at = now(), message = 'abandoned: the node running it went away'
		WHERE status = $2 AND started_at < now() - make_interval(secs => $3)`,
		StatusFailed, StatusRunning, s.opts.StaleAfter.Seconds()); err != nil {
		return 0, err
	}
	tag, err := s.db.Pool.Exec(ctx, `DELETE FROM plugin_job_runs WHERE id IN (
		SELECT id FROM (
			SELECT id, row_number() OVER (PARTITION BY plugin_key, job_id ORDER BY id DESC) AS rn
			FROM plugin_job_runs) r
		WHERE rn > $1)`, s.opts.KeepRuns)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
