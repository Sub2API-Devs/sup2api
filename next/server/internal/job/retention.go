package job

import (
	"context"
	"time"
)

// retentionLoop trims run history once per period on the node that wins
// lock jobs:retention (left to expire so other nodes skip the period).
func (s *Scheduler) retentionLoop() {
	defer s.wg.Done()
	t := time.NewTimer(min(time.Minute, s.opts.RetentionInterval))
	defer t.Stop()
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-t.C:
		}
		t.Reset(s.opts.RetentionInterval)
		ttl := s.opts.RetentionInterval - s.opts.RetentionInterval/10
		_, ok, err := s.locker.TryLock(s.ctx, "jobs:retention", ttl)
		if err != nil || !ok {
			continue
		}
		if n, err := s.PurgeRuns(s.ctx); err != nil {
			s.log.Warn("job run retention failed", "err", err)
		} else if n > 0 {
			s.log.Info("job run retention purged runs", "count", n)
		}
	}
}

// PurgeRuns keeps the newest KeepRuns runs per (plugin, job) and marks runs
// stuck in "running" for longer than StaleAfter as failed. It does not take
// the retention lock.
func (s *Scheduler) PurgeRuns(ctx context.Context) (int64, error) {
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
