package account

import (
	"context"
	"errors"
	"log/slog"
	"slices"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"golang.org/x/sync/singleflight"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Quota mirror (MODEL-AVAILABILITY-PRECHECK-DESIGN §4): this node's copy of
// the account quota snapshots the model availability precheck reads, so the
// request path does not query PG. PG stays the source of truth; the mirror
// only follows it:
//
//   - A change of one account (account:changed with its id, or a write on
//     this node) marks its entry stale and bumps its version; a change of
//     every account (no id, bus reconnect, plugin generation switch) bumps
//     wipe and marks every entry stale. Stale entries keep their value for
//     reads that cannot wait, and are read again in the background.
//   - A read stores its result only if neither the entry's version nor wipe
//     moved since it began and it is not older than what is stored; the
//     single-flight key carries both, so a read begun after an invalidation
//     never joins one begun before it. A result that is not stored is still
//     handed to the requests waiting for it.
//   - Every 60 s (and at start, retrying 1 s -> 30 s) the snapshots of every
//     account of the account types declaring modelAvailability are read
//     again under the same rules: this covers lost bus messages and changes
//     that are not announced (the plugins table trigger).

const (
	// quotaMirrorFresh is how long an entry that was not invalidated is used
	// without reading it again: one reload period plus slack, so the reload,
	// not the request path, normally refreshes entries.
	quotaMirrorFresh = 75 * time.Second
	// quotaMirrorStaleWait is how long a request waits for the new value of
	// a stale entry before it takes the old one.
	quotaMirrorStaleWait = 40 * time.Millisecond
	// quotaMirrorReadTimeout bounds one read of PG for the request path; it
	// runs in the background, so it may outlive the request that started it.
	quotaMirrorReadTimeout = 3 * time.Second
	// quotaMirrorReloadTimeout bounds one full reload.
	quotaMirrorReloadTimeout = 10 * time.Second
	// quotaMirrorMaxStale is the age past which an entry that could not be
	// read again counts as absent.
	quotaMirrorMaxStale = 10 * time.Minute
	// quotaMirrorRetry is how long a failed read of one set of ids is not
	// repeated.
	quotaMirrorRetry = time.Second
	// quotaMirrorLogEvery throttles the warnings of failed reads.
	quotaMirrorLogEvery = 10 * time.Second
)

// The period of the full reload and the backoff bounds of a failed one;
// variables so tests can shorten them.
var (
	quotaMirrorReload  = 60 * time.Second
	quotaMirrorWarmMin = time.Second
	quotaMirrorWarmMax = 30 * time.Second
)

var errQuotaMirrorBackoff = errors.New("quota snapshots: the last read of these accounts failed less than 1 s ago")

// quotaLoader reads the snapshot rows of ids; quotaScopeLoader reads those of
// every account the mirror covers (QuotaRead.Accounts lists them).
type (
	quotaLoader      func(ctx context.Context, ids []int64) (*store.QuotaRead, error)
	quotaScopeLoader func(ctx context.Context) (*store.QuotaRead, error)
)

type quotaMirror struct {
	load    quotaLoader
	loadAll quotaScopeLoader
	now     func() time.Time
	// staleWait is quotaMirrorStaleWait; tests may change it.
	staleWait time.Duration

	mu      sync.Mutex
	wipe    uint64                      // bumped when every entry is invalidated
	entries map[int64]*quotaMirrorEntry // by account id
	// inflight counts the reads that captured versions and have not stored
	// yet; while there are any, invalidating an id without an entry leaves a
	// placeholder carrying the new version, so a read that captured "no
	// entry" does not store what it read.
	inflight int
	failed   map[string]time.Time // id set -> when its read failed
	flight   singleflight.Group
	loggedAt atomic.Int64  // unix nanos of the last read failure logged
	kick     chan struct{} // asks run for a full reload now
}

type quotaMirrorEntry struct {
	snap   *pluginv1.AccountQuotaSnapshot // nil: no snapshot row (negative entry)
	has    bool                           // false: a placeholder, nothing read yet
	ver    uint64                         // bumped when the id is invalidated
	stale  bool
	dbAt   time.Time // database time the stored read began
	filled time.Time // local time the value was stored
}

// quotaFill is the outcome of one read: the snapshot of every id read (nil
// for an id without a valid snapshot row), or the error.
type quotaFill struct {
	snaps map[int64]*pluginv1.AccountQuotaSnapshot
	err   error
}

func newQuotaMirror(load quotaLoader, loadAll quotaScopeLoader) *quotaMirror {
	return &quotaMirror{load: load, loadAll: loadAll, now: time.Now, staleWait: quotaMirrorStaleWait,
		entries: map[int64]*quotaMirrorEntry{}, failed: map[string]time.Time{}, kick: make(chan struct{}, 1)}
}

// reloadSoon asks run for a full reload now (the set of account types
// declaring modelAvailability may have changed); it never blocks.
func (m *quotaMirror) reloadSoon() {
	select {
	case m.kick <- struct{}{}:
	default:
	}
}

func (e *quotaMirrorEntry) version() uint64 {
	if e == nil {
		return 0
	}
	return e.ver
}

// view answers AccountQuotaView: fresh entries without I/O; stale ones after
// at most staleWait (the old value, marked Stale, when the new one is not
// there by then; staleWait < 0 waits like for absent ones); absent ones as
// soon as they are read, or Missing when ctx ends or the read fails first.
// The error is non-nil exactly when Missing is not empty, and says why.
func (m *quotaMirror) view(ctx context.Context, ids []int64, staleWait time.Duration) (core.QuotaView, error) {
	v := core.QuotaView{Snapshots: make(map[int64]*pluginv1.AccountQuotaSnapshot, len(ids))}
	now := m.now()
	var stale, cold, need []int64
	seen := make(map[int64]bool, len(ids))
	m.mu.Lock()
	for _, id := range ids {
		if seen[id] {
			continue
		}
		seen[id] = true
		e := m.entries[id]
		switch {
		case e != nil && e.has && !e.stale && now.Sub(e.filled) < quotaMirrorFresh:
			if e.snap != nil {
				v.Snapshots[id] = e.snap
			}
			continue
		case e != nil && e.has && now.Sub(e.filled) < quotaMirrorMaxStale:
			if e.snap != nil {
				v.Snapshots[id] = e.snap
			}
			stale = append(stale, id)
		default:
			cold = append(cold, id)
		}
		need = append(need, id)
	}
	if len(need) == 0 {
		m.mu.Unlock()
		return v, nil
	}
	slices.Sort(need)
	ch := m.readLocked(need)
	m.mu.Unlock()

	var fill quotaFill
	got := false
	if ch != nil {
		var timeout <-chan time.Time
		if len(cold) == 0 && staleWait >= 0 {
			t := time.NewTimer(staleWait)
			defer t.Stop()
			timeout = t.C
		}
		select {
		case r := <-ch:
			fill, got = r.Val.(quotaFill), true
		case <-timeout:
		case <-ctx.Done():
		}
	}
	if got && fill.err == nil {
		for _, id := range need {
			if snap := fill.snaps[id]; snap != nil {
				v.Snapshots[id] = snap
			} else {
				delete(v.Snapshots, id)
			}
		}
		return v, nil
	}
	if len(stale) > 0 {
		v.Stale = make(map[int64]bool, len(stale))
		for _, id := range stale {
			v.Stale[id] = true
		}
	}
	if len(cold) == 0 {
		return v, nil
	}
	v.Missing = cold
	switch {
	case got:
		return v, fill.err
	case ch == nil:
		return v, errQuotaMirrorBackoff
	case ctx.Err() != nil:
		return v, ctx.Err()
	}
	return v, context.DeadlineExceeded
}

// readLocked starts (or joins) the read of ids, sorted, unless the read of
// the same set failed less than quotaMirrorRetry ago (nil then). The
// single-flight key carries wipe and the version of every id, so a read
// asked for after an invalidation never joins one asked for before it.
func (m *quotaMirror) readLocked(ids []int64) <-chan singleflight.Result {
	set := quotaIDSet(ids)
	if at, ok := m.failed[set]; ok && m.now().Sub(at) < quotaMirrorRetry {
		return nil
	}
	var key strings.Builder
	key.WriteString("w" + strconv.FormatUint(m.wipe, 10) + "|")
	for i, id := range ids {
		if i > 0 {
			key.WriteByte(',')
		}
		key.WriteString(strconv.FormatInt(id, 10) + ":" + strconv.FormatUint(m.entries[id].version(), 10))
	}
	return m.flight.DoChan(key.String(), func() (any, error) {
		return m.fill(ids, set), nil
	})
}

// fill reads ids from PG, outside any request's context, and stores what it
// read under the version rules. The versions are captured when the read
// starts (they may be newer than the ones in the single-flight key: the
// read still begins after them).
func (m *quotaMirror) fill(ids []int64, set string) quotaFill {
	m.mu.Lock()
	wipe := m.wipe
	vers := make(map[int64]uint64, len(ids))
	for _, id := range ids {
		vers[id] = m.entries[id].version()
	}
	m.inflight++
	m.mu.Unlock()
	defer func() {
		m.mu.Lock()
		m.inflight--
		m.mu.Unlock()
	}()
	ctx, cancel := context.WithTimeout(context.Background(), quotaMirrorReadTimeout)
	defer cancel()
	read, err := m.load(ctx, ids)
	if err == nil && read == nil {
		err = errors.New("quota snapshots: empty read")
	}
	if err != nil {
		m.mu.Lock()
		if len(m.failed) >= 1024 {
			clear(m.failed)
		}
		m.failed[set] = m.now()
		m.mu.Unlock()
		m.logFailure("account: read quota snapshots", "accounts", len(ids), "err", err)
		return quotaFill{err: err}
	}
	snaps := pluginQuotas(read)
	m.mu.Lock()
	delete(m.failed, set)
	filled := m.now()
	for _, id := range ids {
		m.storeLocked(id, snaps[id], vers[id], wipe, read.At, filled)
	}
	m.mu.Unlock()
	return quotaFill{snaps: snaps}
}

// storeLocked stores what a read begun at version ver and wipe read for id,
// unless the id was invalidated since or holds a newer read.
func (m *quotaMirror) storeLocked(id int64, snap *pluginv1.AccountQuotaSnapshot, ver, wipe uint64, dbAt, filled time.Time) {
	e := m.entries[id]
	if m.wipe != wipe || e.version() != ver || e != nil && e.has && e.dbAt.After(dbAt) {
		return
	}
	if e == nil {
		e = &quotaMirrorEntry{}
		m.entries[id] = e
	}
	e.snap, e.has, e.stale, e.dbAt, e.filled = snap, true, false, dbAt, filled
}

// invalidate marks the entry of id (0: every entry) stale and reads the
// cached ids again in the background. It never blocks on PG.
func (m *quotaMirror) invalidate(id int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var ids []int64
	if id <= 0 {
		m.wipe++
		for id, e := range m.entries {
			e.stale = true
			if e.has {
				ids = append(ids, id)
			}
		}
	} else {
		e := m.entries[id]
		if e == nil {
			if m.inflight == 0 {
				return
			}
			e = &quotaMirrorEntry{}
			m.entries[id] = e
		}
		e.ver++
		e.stale = true
		if e.has {
			ids = append(ids, id)
		}
	}
	if len(ids) > 0 {
		slices.Sort(ids)
		m.readLocked(ids)
	}
}

// reload reads every account the mirror covers and stores the results under
// the version rules; entries of accounts it no longer covers are dropped
// unless they changed or were read again meanwhile.
func (m *quotaMirror) reload(ctx context.Context) error {
	if m.loadAll == nil {
		return nil
	}
	_, err, _ := m.flight.Do("all", func() (any, error) {
		m.mu.Lock()
		wipe := m.wipe
		vers := make(map[int64]uint64, len(m.entries))
		for id, e := range m.entries {
			vers[id] = e.ver
		}
		m.inflight++
		m.mu.Unlock()
		defer func() {
			m.mu.Lock()
			m.inflight--
			m.mu.Unlock()
		}()
		ctx, cancel := context.WithTimeout(ctx, quotaMirrorReloadTimeout)
		defer cancel()
		read, err := m.loadAll(ctx)
		if err != nil {
			return nil, err
		}
		if read == nil {
			return nil, errors.New("quota snapshots: empty read")
		}
		snaps := pluginQuotas(read)
		m.mu.Lock()
		defer m.mu.Unlock()
		if m.wipe != wipe {
			return nil, nil // everything was invalidated meanwhile
		}
		covered := make(map[int64]bool, len(read.Accounts))
		filled := m.now()
		for _, id := range read.Accounts {
			covered[id] = true
			m.storeLocked(id, snaps[id], vers[id], wipe, read.At, filled)
		}
		for id, e := range m.entries {
			ver, known := vers[id]
			// A placeholder may protect a read still running (inflight
			// counts this reload too): keep it until that read is done.
			if covered[id] || !known || e.ver != ver || e.dbAt.After(read.At) || !e.has && m.inflight > 1 {
				continue
			}
			delete(m.entries, id)
		}
		return nil, nil
	})
	return err
}

// run loads the mirror at start, retrying with backoff, then reloads it
// every quotaMirrorReload, and at once when asked (reloadSoon), until ctx is
// done.
func (m *quotaMirror) run(ctx context.Context) {
	delay := quotaMirrorWarmMin
	for {
		wait := quotaMirrorReload
		if err := m.reload(ctx); err != nil {
			if ctx.Err() != nil {
				return
			}
			slog.WarnContext(ctx, "account: reload quota snapshots", "err", err, "retry_in", delay)
			wait = delay
			delay = min(delay*2, quotaMirrorWarmMax)
		} else {
			delay = quotaMirrorWarmMin
		}
		t := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			t.Stop()
			return
		case <-t.C:
		case <-m.kick:
			t.Stop()
		}
	}
}

func (m *quotaMirror) logFailure(msg string, args ...any) {
	now := time.Now().UnixNano()
	last := m.loggedAt.Load()
	if now-last < int64(quotaMirrorLogEvery) || !m.loggedAt.CompareAndSwap(last, now) {
		return
	}
	slog.Warn(msg, args...)
}

func quotaIDSet(ids []int64) string {
	var b strings.Builder
	for i, id := range ids {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatInt(id, 10))
	}
	return b.String()
}

// pluginQuotas converts the rows of a read; a row that is not a valid
// snapshot is skipped (as if absent) and logged, without failing the others.
func pluginQuotas(read *store.QuotaRead) map[int64]*pluginv1.AccountQuotaSnapshot {
	out := make(map[int64]*pluginv1.AccountQuotaSnapshot, len(read.Snapshots))
	for id, snap := range read.Snapshots {
		q, err := toPluginQuota(snap)
		if err != nil {
			slog.Warn("account: invalid quota snapshot skipped", "account", id, "err", err)
			continue
		}
		out[id] = q
	}
	for id, err := range read.Invalid {
		slog.Warn("account: invalid quota snapshot skipped", "account", id, "err", err)
	}
	return out
}

// toPluginQuota converts a stored snapshot to the form plugins receive.
func toPluginQuota(snap *store.QuotaSnapshot) (*pluginv1.AccountQuotaSnapshot, error) {
	if snap.Generation <= 0 || snap.Windows == nil {
		return nil, errors.New("invalid stored quota snapshot")
	}
	q := &pluginv1.AccountQuotaSnapshot{Revision: snap.Revision, Generation: snap.Generation, Error: snap.Error}
	if snap.UpdatedAt != nil {
		q.UpdatedAtUnix = snap.UpdatedAt.Unix()
	}
	for key, w := range snap.Windows {
		window := &pluginv1.QuotaWindow{Key: key, Utilization: w.Utilization, UtilizationUnknown: w.UtilizationUnknown, Status: w.Status, Used: w.Used, Limit: w.Limit}
		if w.ResetsAt != nil {
			window.ResetsAtUnix = w.ResetsAt.Unix()
		}
		q.Windows = append(q.Windows, window)
	}
	sort.Slice(q.Windows, func(i, j int) bool { return q.Windows[i].Key < q.Windows[j].Key })
	return q, nil
}

// quotas returns the quota mirror, built on first use (tests build Service
// values directly, and may install their own mirror first).
func (s *Service) quotas() *quotaMirror {
	s.quotaMirrorOnce.Do(func() {
		if s.quotaMirror == nil {
			s.quotaMirror = newQuotaMirror(s.readQuotas, s.readAvailabilityQuotas)
		}
	})
	return s.quotaMirror
}

// invalidateQuota drops this node's mirrored quota snapshot of account id
// (0: of every account).
func (s *Service) invalidateQuota(id int64) { s.quotas().invalidate(id) }

func (s *Service) readQuotas(ctx context.Context, ids []int64) (*store.QuotaRead, error) {
	if s.d.DB == nil {
		return nil, errors.New("account: no database")
	}
	return s.d.DB.ReadAccountQuotas(ctx, ids)
}

// readAvailabilityQuotas reads the snapshots of every account not deleted of
// the account types declaring modelAvailability: the only ones the precheck
// asks for.
func (s *Service) readAvailabilityQuotas(ctx context.Context) (*store.QuotaRead, error) {
	if s.d.DB == nil {
		return nil, errors.New("account: no database")
	}
	g := s.gen()
	if g == nil {
		return nil, errors.New("account: no plugin generation loaded yet")
	}
	return s.d.DB.ReadAccountQuotasOfTypes(ctx, modelAvailabilityTypes(g))
}

// modelAvailabilityTypes lists the "plugin/type" pairs declaring
// modelAvailability.
func modelAvailabilityTypes(g core.Generation) []string {
	keys := []string{}
	for _, bt := range g.AccountTypes() {
		if bt.Type.ModelAvailability {
			keys = append(keys, bt.Plugin.Key+"/"+bt.Type.ID)
		}
	}
	return keys
}

// AccountQuotaView reads the snapshots of ids from the mirror for the
// availability precheck (core.QuotaView). The snapshots are shared and
// read-only. The error is non-nil exactly when Missing is not empty.
func (s *Service) AccountQuotaView(ctx context.Context, ids []int64) (core.QuotaView, error) {
	m := s.quotas()
	return m.view(ctx, ids, m.staleWait)
}

// AccountQuotaSnapshots reads the snapshots of ids from the mirror for
// callers off the request path: it waits for invalidated values to be read
// again (within ctx) instead of taking them after 40 ms, keeps them when that
// read fails, and fails when an id could not be read at all. The snapshots
// are shared and read-only.
func (s *Service) AccountQuotaSnapshots(ctx context.Context, ids []int64) (map[int64]*pluginv1.AccountQuotaSnapshot, error) {
	v, err := s.quotas().view(ctx, ids, -1)
	if err != nil {
		return nil, err
	}
	return v.Snapshots, nil
}
