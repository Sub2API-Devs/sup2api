package notify

import (
	"context"
	"errors"
	"log/slog"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Start runs the delivery loop until Stop. Every node may run it: rows are
// claimed with SKIP LOCKED and held for the lease.
func (s *Service) Start(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		return
	}
	ctx, s.cancel = context.WithCancel(ctx)
	s.done = make(chan struct{})
	go s.loop(ctx, s.done)
}

// Stop ends the loop and waits for the step in progress.
func (s *Service) Stop(ctx context.Context) {
	s.mu.Lock()
	cancel, done := s.cancel, s.done
	s.mu.Unlock()
	if cancel == nil {
		return
	}
	cancel()
	select {
	case <-done:
	case <-ctx.Done():
	}
}

func (s *Service) loop(ctx context.Context, done chan struct{}) {
	defer close(done)
	tick := time.NewTicker(s.opts.PollInterval)
	defer tick.Stop()
	nextPurge := time.Now()
	for {
		if s.opts.CanRun == nil || s.opts.CanRun() {
			for s.step(ctx) {
			}
			if time.Now().After(nextPurge) {
				s.purge(ctx)
				nextPurge = time.Now().Add(time.Hour)
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		case <-s.wake:
		}
	}
}

type queued struct {
	id         int64
	source     string
	channel    string
	recipients []string
	subject    string
	body       string
	severity   string
	attempt    int32
}

// step claims and delivers one row; it reports whether there was one. One
// row at a time: a row is delivered well within its lease, so a slow
// provider never lets the lease of a waiting row run out and another node
// send it again.
func (s *Service) step(ctx context.Context) bool {
	var q queued
	err := s.db.Pool.QueryRow(ctx, `UPDATE notifications SET status = 'sending', attempts = attempts + 1,
			next_attempt_at = now() + make_interval(secs => $1)
		WHERE id = (SELECT id FROM notifications WHERE status IN ('pending', 'sending') AND next_attempt_at <= now()
			AND attempts < $2 ORDER BY next_attempt_at, id LIMIT 1 FOR UPDATE SKIP LOCKED)
		RETURNING id, source, channel, recipients, subject, body, severity, attempts`, s.opts.Lease.Seconds(), s.opts.MaxAttempts).
		Scan(&q.id, &q.source, &q.channel, &q.recipients, &q.subject, &q.body, &q.severity, &q.attempt)
	if err != nil {
		if !store.IsNoRows(err) && ctx.Err() == nil {
			slog.WarnContext(ctx, "notify: claim", "err", err)
		}
		return false
	}
	s.finish(ctx, q, s.deliver(ctx, q))
	return true
}

// errRejected marks a final refusal by the provider.
type errRejected struct{ reason string }

func (e errRejected) Error() string { return e.reason }

func (s *Service) deliver(ctx context.Context, q queued) error {
	b, ok := s.channel(q.channel)
	if !ok {
		return errors.New("the notification channel is not available (its plugin is disabled or uninstalled)")
	}
	resp, err := b.Client.DeliverNotification(ctx, &pluginv1.DeliverNotificationRequest{Id: q.id, Channel: q.channel, Recipients: q.recipients,
		Subject: q.subject, Body: q.body, Severity: q.severity, Source: q.source, Attempt: q.attempt})
	if err != nil {
		return err
	}
	if r := resp.GetRejected(); r != "" {
		return errRejected{r}
	}
	return nil
}

// finish records the outcome unless the lease ran out and another worker
// claimed the row again (attempts moved on).
func (s *Service) finish(ctx context.Context, q queued, err error) {
	stopping := ctx.Err() != nil
	ctx = context.WithoutCancel(ctx)
	var rejected errRejected
	var exec error
	switch {
	case err != nil && stopping:
		// Cut off by shutdown: not the provider's failure, so the attempt
		// is given back.
		_, exec = s.db.Pool.Exec(ctx, `UPDATE notifications SET status = 'pending', attempts = attempts - 1, next_attempt_at = now()
			WHERE id = $1 AND status = 'sending' AND attempts = $2`, q.id, q.attempt)
	case err == nil:
		_, exec = s.db.Pool.Exec(ctx, `UPDATE notifications SET status = 'sent', sent_at = now(), last_error = ''
			WHERE id = $1 AND status = 'sending' AND attempts = $2`, q.id, q.attempt)
	case errors.As(err, &rejected) || int(q.attempt) >= s.opts.MaxAttempts:
		_, exec = s.db.Pool.Exec(ctx, `UPDATE notifications SET status = 'failed', last_error = $3
			WHERE id = $1 AND status = 'sending' AND attempts = $2`, q.id, q.attempt, truncate(err.Error()))
	default:
		_, exec = s.db.Pool.Exec(ctx, `UPDATE notifications SET status = 'pending', last_error = $3,
				next_attempt_at = now() + make_interval(secs => $4)
			WHERE id = $1 AND status = 'sending' AND attempts = $2`, q.id, q.attempt, truncate(err.Error()), s.backoff(int(q.attempt)).Seconds())
	}
	if exec != nil {
		slog.WarnContext(ctx, "notify: record outcome", "id", q.id, "err", exec)
	}
}

// backoff doubles from BackoffMin per attempt up to BackoffMax.
func (s *Service) backoff(attempt int) time.Duration {
	d := s.opts.BackoffMin
	for i := 1; i < attempt && d < s.opts.BackoffMax; i++ {
		d *= 2
	}
	return min(d, s.opts.BackoffMax)
}

// purge fails the rows whose last attempt never finished (the lease ran out:
// its node died mid-delivery), which step no longer claims, and deletes the
// finished rows past the retention.
func (s *Service) purge(ctx context.Context) {
	if _, err := s.db.Pool.Exec(ctx, `UPDATE notifications SET status = 'failed', last_error = 'the last attempt did not finish'
		WHERE status = 'sending' AND attempts >= $1 AND next_attempt_at <= now()`, s.opts.MaxAttempts); err != nil && ctx.Err() == nil {
		slog.WarnContext(ctx, "notify: fail expired rows", "err", err)
	}
	if _, err := s.db.Pool.Exec(ctx, `DELETE FROM notifications WHERE status IN ('sent', 'failed')
		AND created_at < now() - make_interval(secs => $1)`, s.opts.Retention.Seconds()); err != nil && ctx.Err() == nil {
		slog.WarnContext(ctx, "notify: purge", "err", err)
	}
}

func truncate(s string) string {
	const max = 1000
	if len(s) <= max {
		return s
	}
	return s[:max]
}
