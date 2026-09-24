package delivery

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

const maxErrorLen = 2000

// worker delivers events to one plugin. It runs on every node; only the
// holder of lock events:{plugin} does any work.
type worker struct {
	s      *Service
	key    string
	ctx    context.Context
	cancel context.CancelFunc
	wake   chan struct{}

	mu      sync.Mutex
	binding core.SubscriptionBinding
	match   matcher

	// owned by the run goroutine
	release    func()
	leaseUntil time.Time
	gap        *gapState
}

// gapState tracks the first hole in the id sequence after the cursor. A
// hole is an id allocated by a transaction that has not committed (yet) or
// rolled back; delivering past it too early would lose that event.
type gapState struct {
	start    int64     // first missing id
	seenAt   time.Time // when the hole was first observed
	xmax     uint64    // pg snapshot xmax at first observation
	resolved bool
}

func newWorker(s *Service, b core.SubscriptionBinding) *worker {
	ctx, cancel := context.WithCancel(s.ctx)
	w := &worker{s: s, key: b.Plugin.Key, ctx: ctx, cancel: cancel, wake: make(chan struct{}, 1)}
	w.setBinding(b)
	return w
}

func (w *worker) setBinding(b core.SubscriptionBinding) {
	w.mu.Lock()
	w.binding = b
	w.match = newMatcher(b.Events.Subscribe)
	w.mu.Unlock()
	w.poke()
}

func (w *worker) current() (core.SubscriptionBinding, matcher) {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.binding, w.match
}

func (w *worker) poke() {
	select {
	case w.wake <- struct{}{}:
	default:
	}
}

func (w *worker) run() {
	defer w.dropLock()
	poll := w.s.opts.PollInterval
	for {
		if w.ctx.Err() != nil {
			return
		}
		wait := poll
		if w.holdLock() {
			// The step never outlives the lease, so two nodes can not call
			// the plugin at the same time.
			sctx, cancel := context.WithDeadline(w.ctx, w.leaseUntil)
			d, err := w.step(sctx)
			cancel()
			if err != nil {
				if w.ctx.Err() != nil {
					return
				}
				w.s.log.Warn("event delivery step failed", "plugin", w.key, "err", err)
				d = poll
			}
			wait = d
		}
		if wait <= 0 {
			continue
		}
		t := time.NewTimer(wait)
		select {
		case <-w.ctx.Done():
			t.Stop()
			return
		case <-w.wake:
			t.Stop()
		case <-t.C:
		}
	}
}

// holdLock makes sure this node holds events:{plugin} with enough lease left
// for one full step. core.Locker has no extend operation, so the lease is
// renewed by releasing and re-acquiring between steps; another node may take
// over in that window, which is safe because the cursor is committed before.
func (w *worker) holdLock() bool {
	o := w.s.opts
	if w.release != nil && time.Until(w.leaseUntil) > o.CallTimeout+5*time.Second {
		return true
	}
	w.dropLock()
	start := time.Now() // the lease is counted from before the request
	release, ok, err := w.s.locker.TryLock(w.ctx, "events:"+w.key, o.LockTTL)
	if err != nil {
		if w.ctx.Err() == nil {
			w.s.log.Warn("event delivery lock failed", "plugin", w.key, "err", err)
		}
		return false
	}
	if !ok {
		return false
	}
	w.release = release
	w.leaseUntil = start.Add(o.LockTTL)
	return true
}

func (w *worker) dropLock() {
	if w.release != nil {
		w.release()
		w.release = nil
	}
}

type cursor struct {
	last      int64
	failures  int
	nextRetry *time.Time
}

type outboxRow struct {
	id  int64
	typ string
}

// step runs one delivery attempt and returns how long to wait before the
// next one (0 = immediately).
func (w *worker) step(ctx context.Context) (time.Duration, error) {
	o := w.s.opts
	b, m := w.current()

	cur, err := w.loadCursor(ctx)
	if err != nil {
		return 0, err
	}
	if cur.nextRetry != nil {
		if d := time.Until(*cur.nextRetry); d > 0 {
			return min(d, o.PollInterval), nil
		}
	}
	if w.gap != nil && !w.gap.resolved {
		if err := w.checkGap(ctx); err != nil {
			return 0, err
		}
	}

	rows, err := w.scan(ctx, cur.last, o.ScanLimit)
	if err != nil {
		return 0, err
	}
	batchSize := b.Events.BatchSize
	if batchSize <= 0 {
		batchSize = o.BatchSize
	}
	var ids []int64
	horizon := cur.last // highest id known to be settled (delivered or not matching)
	blocked := false
	expected := cur.last + 1
	for _, r := range rows {
		if r.id != expected {
			ok, err := w.gapPassable(ctx, expected)
			if err != nil {
				return 0, err
			}
			if !ok {
				blocked = true
				break
			}
		}
		horizon, expected = r.id, r.id+1
		if m.match(r.typ) {
			ids = append(ids, r.id)
			if len(ids) >= batchSize {
				break
			}
		}
	}
	more := !blocked && (len(rows) >= o.ScanLimit || len(ids) >= batchSize)

	if len(ids) == 0 {
		if horizon > cur.last {
			if err := w.advance(ctx, cur.last, horizon); err != nil {
				return 0, err
			}
		}
		if more {
			return 0, nil
		}
		return o.PollInterval, nil
	}

	events, err := w.load(ctx, ids)
	if err != nil {
		return 0, err
	}
	batchMax := ids[len(ids)-1]

	cctx, cancel := context.WithTimeout(ctx, o.CallTimeout)
	resp, callErr := b.Client.OnEvents(cctx, &pluginv1.OnEventsRequest{Events: events})
	cancel()
	if ctx.Err() != nil {
		return 0, ctx.Err() // stopping or lease lost: the batch will be redelivered
	}
	if callErr == nil {
		acked := resp.GetAckedThroughId()
		if acked > cur.last {
			next := acked
			if acked >= batchMax {
				next = horizon
			}
			if err := w.advance(ctx, cur.last, next); err != nil {
				return 0, err
			}
			return 0, nil
		}
		callErr = fmt.Errorf("plugin acknowledged through id %d, not past cursor %d", acked, cur.last)
	}
	return w.fail(ctx, cur, ids[0], batchMax, horizon, callErr)
}

// fail records a failed batch: backoff, or dead-letter after MaxFailures.
func (w *worker) fail(ctx context.Context, cur cursor, first, last, horizon int64, cause error) (time.Duration, error) {
	o := w.s.opts
	msg := truncate(cause.Error())
	failures := cur.failures + 1
	if failures >= o.MaxFailures {
		w.s.log.Error("event batch dead-lettered", "plugin", w.key, "first_event_id", first, "last_event_id", last, "err", msg)
		err := w.s.db.Tx(ctx, func(tx pgx.Tx) error {
			if _, err := tx.Exec(ctx, `INSERT INTO plugin_event_deadletters (plugin_key, first_event_id, last_event_id, error)
				VALUES ($1, $2, $3, $4)`, w.key, first, last, msg); err != nil {
				return err
			}
			tag, err := tx.Exec(ctx, `UPDATE plugin_event_cursors
				SET last_event_id = $3, consecutive_failures = 0, next_retry_at = NULL, last_error = $4, updated_at = now()
				WHERE plugin_key = $1 AND last_event_id = $2`, w.key, cur.last, horizon, msg)
			if err != nil {
				return err
			}
			if tag.RowsAffected() == 0 {
				return errCursorMoved
			}
			return nil
		})
		if err != nil {
			return 0, err
		}
		return 0, nil
	}
	delay := backoff(failures, o.BackoffMin, o.BackoffMax)
	w.s.log.Warn("event delivery failed", "plugin", w.key, "failures", failures, "retry_in", delay, "err", msg)
	next := time.Now().Add(delay)
	_, err := w.s.db.Pool.Exec(ctx, `UPDATE plugin_event_cursors
		SET consecutive_failures = $3, next_retry_at = $4, last_error = $5, updated_at = now()
		WHERE plugin_key = $1 AND last_event_id = $2`, w.key, cur.last, failures, next, msg)
	if err != nil {
		return 0, err
	}
	return min(delay, o.PollInterval), nil
}

var errCursorMoved = errors.New("cursor moved concurrently")

// advance moves the cursor forward and clears the failure state. The update
// is conditional on the cursor we read, so a node that lost its lease
// mid-step can never move the cursor backwards.
func (w *worker) advance(ctx context.Context, from, to int64) error {
	tag, err := w.s.db.Pool.Exec(ctx, `UPDATE plugin_event_cursors
		SET last_event_id = $3, consecutive_failures = 0, next_retry_at = NULL, last_error = '', updated_at = now()
		WHERE plugin_key = $1 AND last_event_id = $2`, w.key, from, to)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errCursorMoved
	}
	return nil
}

// loadCursor reads the cursor, creating it at the current max event id for
// a new subscription (history is not replayed).
func (w *worker) loadCursor(ctx context.Context) (cursor, error) {
	var c cursor
	q := `SELECT last_event_id, consecutive_failures, next_retry_at FROM plugin_event_cursors WHERE plugin_key = $1`
	err := w.s.db.Pool.QueryRow(ctx, q, w.key).Scan(&c.last, &c.failures, &c.nextRetry)
	if store.IsNoRows(err) {
		if _, err := w.s.db.Pool.Exec(ctx, `INSERT INTO plugin_event_cursors (plugin_key, last_event_id)
			SELECT $1, COALESCE(max(id), 0) FROM events ON CONFLICT (plugin_key) DO NOTHING`, w.key); err != nil {
			return c, fmt.Errorf("create cursor: %w", err)
		}
		err = w.s.db.Pool.QueryRow(ctx, q, w.key).Scan(&c.last, &c.failures, &c.nextRetry)
	}
	return c, err
}

func (w *worker) scan(ctx context.Context, after int64, limit int) ([]outboxRow, error) {
	rows, err := w.s.db.Pool.Query(ctx, `SELECT id, type FROM events WHERE id > $1 ORDER BY id LIMIT $2`, after, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (outboxRow, error) {
		var o outboxRow
		err := r.Scan(&o.id, &o.typ)
		return o, err
	})
}

func (w *worker) load(ctx context.Context, ids []int64) ([]*pluginv1.Event, error) {
	rows, err := w.s.db.Pool.Query(ctx, `SELECT id, type, occurred_at, payload::text FROM events WHERE id = ANY($1) ORDER BY id`, ids)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (*pluginv1.Event, error) {
		var (
			ev pluginv1.Event
			at time.Time
		)
		err := r.Scan(&ev.Id, &ev.Type, &at, &ev.PayloadJson)
		ev.OccurredAtUnixMs = at.UnixMilli()
		return &ev, err
	})
}

// gapPassable reports whether the hole starting at id start may be skipped.
// A new hole is recorded and blocks until checkGap resolves it on a later
// step (the check must run before the scan that skips the hole, otherwise a
// row committed in between could be missed).
func (w *worker) gapPassable(ctx context.Context, start int64) (bool, error) {
	if w.gap != nil && w.gap.start == start {
		return w.gap.resolved, nil
	}
	_, xmax, err := w.snapshot(ctx)
	if err != nil {
		return false, err
	}
	w.gap = &gapState{start: start, seenAt: time.Now(), xmax: xmax}
	return false, nil
}

// checkGap resolves the recorded hole once every transaction that was
// running when it was observed has finished (so the missing id can never
// appear), or after GapMaxWait.
func (w *worker) checkGap(ctx context.Context) error {
	g := w.gap
	age := time.Since(g.seenAt)
	if age < w.s.opts.GapMinWait {
		return nil
	}
	if age >= w.s.opts.GapMaxWait {
		w.s.log.Warn("skipping event id gap after max wait; a late commit would not be delivered",
			"plugin", w.key, "event_id", g.start, "waited", age)
		g.resolved = true
		return nil
	}
	xmin, _, err := w.snapshot(ctx)
	if err != nil {
		return err
	}
	g.resolved = xmin >= g.xmax
	return nil
}

func (w *worker) snapshot(ctx context.Context) (xmin, xmax uint64, err error) {
	var a, b string
	if err = w.s.db.Pool.QueryRow(ctx, `SELECT pg_snapshot_xmin(s)::text, pg_snapshot_xmax(s)::text FROM pg_current_snapshot() s`).Scan(&a, &b); err != nil {
		return 0, 0, err
	}
	if xmin, err = strconv.ParseUint(a, 10, 64); err != nil {
		return 0, 0, err
	}
	xmax, err = strconv.ParseUint(b, 10, 64)
	return xmin, xmax, err
}

func backoff(failures int, lo, hi time.Duration) time.Duration {
	d := lo
	for i := 1; i < failures && d < hi; i++ {
		d *= 2
	}
	return min(d, hi)
}

func truncate(s string) string {
	if len(s) > maxErrorLen {
		return s[:maxErrorLen]
	}
	return s
}

// matcher implements subscription patterns: exact type, "prefix.*" or "*".
type matcher struct {
	all      bool
	exact    map[string]bool
	prefixes []string
}

func newMatcher(patterns []string) matcher {
	m := matcher{exact: map[string]bool{}}
	for _, p := range patterns {
		switch {
		case p == "*":
			m.all = true
		case strings.HasSuffix(p, ".*"):
			m.prefixes = append(m.prefixes, strings.TrimSuffix(p, "*"))
		case p != "":
			m.exact[p] = true
		}
	}
	return m
}

func (m matcher) match(typ string) bool {
	if m.all || m.exact[typ] {
		return true
	}
	for _, p := range m.prefixes {
		if strings.HasPrefix(typ, p) {
			return true
		}
	}
	return false
}
