package delivery

import (
	"context"
	"math"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

const retentionChunk = 5000

// RetentionTask is the cluster task that purges delivered events.
const RetentionTask = "core.events.retention"

// RetentionTaskSpec runs PurgeEvents every RetentionInterval on one node.
func (s *Service) RetentionTaskSpec() core.TaskSpec {
	return core.TaskSpec{
		Name:  RetentionTask,
		Title: core.LocalizedText{"en": "Purge delivered events", "zh": "清理 7 天前事件"},
		Description: core.LocalizedText{
			"en": "Deletes events older than the retention age that every plugin subscription has already received.",
			"zh": "删除超过保留期且所有插件订阅都已收到的事件。",
		},
		Scope:   core.TaskCluster,
		Every:   s.opts.RetentionInterval,
		Timeout: 5 * time.Minute,
		Handler: func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			n, err := s.PurgeEvents(ctx)
			return core.TaskResult{Count: int(n)}, err
		},
	}
}

// PurgeEvents deletes events older than RetentionAge that every plugin
// cursor has passed.
func (s *Service) PurgeEvents(ctx context.Context) (int64, error) {
	var total int64
	for {
		tag, err := s.db.Pool.Exec(ctx, `
			DELETE FROM events WHERE id IN (
				SELECT id FROM events
				WHERE occurred_at < now() - make_interval(secs => $1)
				  AND id <= (SELECT COALESCE(min(last_event_id), $2) FROM plugin_event_cursors)
				ORDER BY id LIMIT $3)`,
			s.opts.RetentionAge.Seconds(), int64(math.MaxInt64), retentionChunk)
		if err != nil {
			return total, err
		}
		total += tag.RowsAffected()
		if tag.RowsAffected() < retentionChunk {
			return total, nil
		}
	}
}
