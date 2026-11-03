package task

import (
	"context"
	"fmt"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// HousekeepingTask is the framework's own cluster task (TASK-FRAMEWORK-DESIGN
// §8.1).
const HousekeepingTask = "core.task.housekeeping"

// staleCoreTask is how long a core task's row survives once no node
// registers it any more.
const staleCoreTask = 7 * 24 * time.Hour

func (s *Service) housekeepingSpec() core.TaskSpec {
	return core.TaskSpec{
		Name:        HousekeepingTask,
		Title:       core.LocalizedText{"en": "Scheduled task housekeeping", "zh": "定时任务自身维护"},
		Description: core.LocalizedText{"en": "Removes the records of core tasks no node registers any more and clears expired leases.", "zh": "删除已不再登记的核心任务记录，清理过期租约。"},
		Scope:       core.TaskCluster,
		Every:       time.Hour,
		Timeout:     time.Minute,
		Handler:     s.housekeeping,
	}
}

func (s *Service) housekeeping(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
	db := s.opts.DB
	names := []string{}
	for _, t := range s.reg.List(core.TaskCluster) {
		if t.Source == SourceCore {
			names = append(names, t.Name)
		}
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET seen_at = now(), seen_version = $2
		WHERE source = 'core' AND name = ANY($1)`, names, s.opts.Version); err != nil {
		return core.TaskResult{}, fmt.Errorf("refresh registered tasks: %w", err)
	}
	removed, err := db.Pool.Exec(ctx, `DELETE FROM scheduled_tasks
		WHERE source = 'core' AND seen_at < now() - $1::interval AND NOT (name = ANY($2))
			AND (lease_until IS NULL OR lease_until < now())`, staleCoreTask.String(), names)
	if err != nil {
		return core.TaskResult{}, fmt.Errorf("remove stale tasks: %w", err)
	}
	cleared, err := db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET lease_job_id = NULL, lease_node = NULL, lease_until = NULL,
		updated_at = now() WHERE lease_until < now()`)
	if err != nil {
		return core.TaskResult{}, fmt.Errorf("clear expired leases: %w", err)
	}
	n := int(removed.RowsAffected() + cleared.RowsAffected())
	return core.TaskResult{Count: n, Message: fmt.Sprintf("removed %d stale tasks, cleared %d expired leases",
		removed.RowsAffected(), cleared.RowsAffected())}, nil
}
