package notify

import (
	"context"
	"errors"
	"log/slog"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Start runs the delivery loop until ctx ends or Stop. Every node may run it:
// rows are claimed with SKIP LOCKED and held for the lease.
//
// The end of ctx (the process got SIGTERM) or Stop only ends claiming: the
// delivery in progress runs on a context of its own and finishes within its
// deadline (30 s, grpcruntime.TimeoutNotification). Cancelling it would give
// the attempt back although the provider may already have sent it (an SMTP
// server that accepted DATA before the answer reached the core), and the row
// would be sent again after the restart. Only a drain past DrainTimeout
// cancels it.
func (s *Service) Start(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.cancel != nil {
		return
	}
	var claim, deliver context.Context
	claim, s.cancel = context.WithCancel(ctx)
	deliver, s.abort = context.WithCancel(context.WithoutCancel(ctx))
	s.done = make(chan struct{})
	go s.loop(claim, deliver, s.done)
}

// abortWait bounds the wait for a delivery cut off by Stop to record its
// outcome (one UPDATE).
const abortWait = 5 * time.Second

// Stop ends claiming, lets the delivery in progress finish for up to
// DrainTimeout (or until ctx ends, the caller's shutdown budget), and only
// then cancels it.
func (s *Service) Stop(ctx context.Context) {
	s.mu.Lock()
	cancel, abort, done := s.cancel, s.abort, s.done
	s.mu.Unlock()
	if cancel == nil {
		return
	}
	defer abort()
	cancel()
	drain := time.NewTimer(s.opts.DrainTimeout)
	defer drain.Stop()
	select {
	case <-done:
		return
	case <-drain.C:
	case <-ctx.Done():
	}
	abort()
	wait := time.NewTimer(abortWait)
	defer wait.Stop()
	select {
	case <-done:
	case <-wait.C:
	case <-ctx.Done():
	}
}

// loop claims rows while claim lasts and delivers them on deliver.
func (s *Service) loop(claim, deliver context.Context, done chan struct{}) {
	defer close(done)
	tick := time.NewTicker(s.opts.PollInterval)
	defer tick.Stop()
	nextPurge := time.Now()
	for {
		if s.opts.CanRun == nil || s.opts.CanRun() {
			for claim.Err() == nil && s.step(deliver) {
			}
			if claim.Err() == nil && time.Now().After(nextPurge) {
				// One node per period: the lock is left to expire.
				held := s.opts.Locker == nil
				if !held {
					_, held, _ = s.opts.Locker.TryLock(claim, "notify:purge", time.Hour-time.Hour/10)
				}
				if held {
					s.purge(claim)
				}
				nextPurge = time.Now().Add(time.Hour)
			}
		}
		select {
		case <-claim.Done():
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
	provider   *string // the plugin that provided channel at queue time; nil on rows from before 0069
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
		RETURNING id, source, channel, provider, recipients, subject, body, severity, attempts`, s.opts.Lease.Seconds(), s.opts.MaxAttempts).
		Scan(&q.id, &q.source, &q.channel, &q.provider, &q.recipients, &q.subject, &q.body, &q.severity, &q.attempt)
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

// errUnbound: the plugin that provided the channel is not bound to it now
// (not loaded yet at startup, disabled, uninstalled, or the channel went to
// another plugin). Not a delivery attempt: the row waits for it until
// UnboundFor.
var errUnbound = errors.New("the plugin providing the notification channel is not available (it is starting, restarting, disabled or uninstalled)")

// providerNotRunning reports an error of a provider call the plugin instance
// refused before it reached the plugin process: it is starting, waiting to
// restart after a crash, or draining for an upgrade or a stop (grpcruntime
// marks these with a PluginNotRunning method). Like errUnbound, not a
// delivery attempt.
func providerNotRunning(err error) bool {
	var m interface{ PluginNotRunning() bool }
	return errors.As(err, &m) && m.PluginNotRunning()
}

func (s *Service) deliver(ctx context.Context, q queued) error {
	b, ok := s.channel(q.channel)
	if !ok || q.provider != nil && *q.provider != b.Plugin.Key {
		return errUnbound
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
// claimed the row again (attempts moved on). ctx is the delivery context:
// it ends only when Stop gave up waiting for the delivery.
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
	case errors.Is(err, errUnbound) || providerNotRunning(err):
		// The attempt is given back and the row is tried again after
		// BackoffMin; it fails only once it waited UnboundFor since it was
		// queued, so a plugin that never comes back does not keep it forever.
		_, exec = s.db.Pool.Exec(ctx, `UPDATE notifications SET attempts = attempts - 1, last_error = $3,
				status = CASE WHEN created_at < now() - make_interval(secs => $4) THEN 'failed' ELSE 'pending' END,
				next_attempt_at = now() + make_interval(secs => $5)
			WHERE id = $1 AND status = 'sending' AND attempts = $2`, q.id, q.attempt, truncate(err.Error()), s.opts.UnboundFor.Seconds(), s.opts.BackoffMin.Seconds())
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
