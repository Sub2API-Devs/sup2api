package delivery

import (
	"context"
	"math"
	"time"
)

const retentionChunk = 5000

// retentionLoop periodically purges delivered events. Only the node that
// wins lock events:retention for the period runs the purge; the lock is
// left to expire so other nodes skip the same period.
func (s *Service) retentionLoop() {
	defer s.wg.Done()
	first := min(time.Minute, s.opts.RetentionInterval)
	t := time.NewTimer(first)
	defer t.Stop()
	for {
		select {
		case <-s.ctx.Done():
			return
		case <-t.C:
		}
		t.Reset(s.opts.RetentionInterval)
		ttl := s.opts.RetentionInterval - s.opts.RetentionInterval/10
		_, ok, err := s.locker.TryLock(s.ctx, "events:retention", ttl)
		if err != nil || !ok {
			continue
		}
		n, err := s.PurgeEvents(s.ctx)
		if err != nil {
			s.log.Warn("event retention failed", "err", err)
		} else if n > 0 {
			s.log.Info("event retention purged events", "count", n)
		}
	}
}

// PurgeEvents deletes events older than RetentionAge that every plugin
// cursor has passed. It does not take the retention lock.
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
