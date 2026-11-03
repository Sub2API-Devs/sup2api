package account

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// fakeQuotaDB is the loader of the quota mirror in unit tests: rows by
// account id, read when a load starts (like a PG statement), then held until
// released when hold is set.
type fakeQuotaDB struct {
	mu      sync.Mutex
	rows    map[int64]*store.QuotaSnapshot
	invalid map[int64]bool
	covered []int64 // accounts of the full reload
	err     error
	hold    chan struct{} // nil: loads return at once
	started chan []int64  // receives the ids of every load when not nil
	clock   time.Time
	loads   atomic.Int32
	reloads atomic.Int32
}

func newFakeQuotaDB() *fakeQuotaDB {
	return &fakeQuotaDB{rows: map[int64]*store.QuotaSnapshot{}, invalid: map[int64]bool{}, clock: time.Unix(1_800_000_000, 0)}
}

func (f *fakeQuotaDB) set(id, generation int64, util float64) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.rows[id] = &store.QuotaSnapshot{AccountID: id, Generation: generation, Revision: 1,
		Windows: map[string]store.QuotaWindow{"7d_fable": {Utilization: util}}}
}

func (f *fakeQuotaDB) setHold(ch chan struct{}) {
	f.mu.Lock()
	f.hold = ch
	f.mu.Unlock()
}

// release lets the held loads go and the next ones return at once.
func (f *fakeQuotaDB) release() {
	f.mu.Lock()
	if f.hold != nil {
		close(f.hold)
	}
	f.hold = nil
	f.mu.Unlock()
}

func (f *fakeQuotaDB) read(ids []int64) (*store.QuotaRead, chan struct{}, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.clock = f.clock.Add(time.Millisecond)
	if f.err != nil {
		return nil, f.hold, f.err
	}
	out := &store.QuotaRead{At: f.clock, Snapshots: map[int64]*store.QuotaSnapshot{}, Invalid: map[int64]error{}}
	for _, id := range ids {
		if f.invalid[id] {
			out.Invalid[id] = errors.New("bad windows")
		} else if row := f.rows[id]; row != nil {
			copied := *row
			out.Snapshots[id] = &copied
		}
	}
	return out, f.hold, nil
}

func (f *fakeQuotaDB) load(ctx context.Context, ids []int64) (*store.QuotaRead, error) {
	f.loads.Add(1)
	f.mu.Lock()
	started := f.started
	f.mu.Unlock()
	if started != nil {
		started <- append([]int64(nil), ids...)
	}
	read, hold, err := f.read(ids)
	if hold != nil {
		select {
		case <-hold:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	return read, err
}

func (f *fakeQuotaDB) loadAll(ctx context.Context) (*store.QuotaRead, error) {
	f.reloads.Add(1)
	f.mu.Lock()
	covered := append([]int64(nil), f.covered...)
	f.mu.Unlock()
	read, err := f.load(ctx, covered)
	f.loads.Add(-1)
	if read != nil {
		read.Accounts = covered
	}
	return read, err
}

func (f *fakeQuotaDB) mirror() *quotaMirror { return newQuotaMirror(f.load, f.loadAll) }

func utilization(t *testing.T, v core.QuotaView, id int64) float64 {
	t.Helper()
	snap := v.Snapshots[id]
	require.NotNil(t, snap, "snapshot of %d", id)
	require.Len(t, snap.Windows, 1)
	return snap.Windows[0].Utilization
}

func waitUntil(t *testing.T, what string, cond func() bool) {
	t.Helper()
	for deadline := time.Now().Add(5 * time.Second); !cond(); {
		if time.Now().After(deadline) {
			t.Fatal("timed out waiting for " + what)
		}
		time.Sleep(time.Millisecond)
	}
}

// entryState reads an entry under the lock: whether it holds a value, and
// whether it is stale.
func entryState(m *quotaMirror, id int64) (has, stale bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if e := m.entries[id]; e != nil {
		return e.has, e.stale
	}
	return false, false
}

func TestQuotaMirrorHitWithoutLoad(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	m := db.mirror()
	v, err := m.view(t.Context(), []int64{1, 1}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(30), utilization(t, v, 1))
	require.EqualValues(t, 1, db.loads.Load())
	for range 3 {
		again, err := m.view(t.Context(), []int64{1}, m.staleWait)
		require.NoError(t, err)
		require.Same(t, v.Snapshots[1], again.Snapshots[1], "shared, read-only value")
		require.Empty(t, again.Stale)
		require.Empty(t, again.Missing)
	}
	require.EqualValues(t, 1, db.loads.Load(), "a fresh entry is read without I/O")
}

// TestQuotaMirrorInvalidationDuringRead: a read asked for after an
// invalidation does not join the one begun before it; the older result is
// handed to its waiters but not stored.
func TestQuotaMirrorInvalidationDuringRead(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	gate := make(chan struct{})
	db.setHold(gate)
	db.started = make(chan []int64, 8)
	m := db.mirror()
	first := make(chan core.QuotaView, 1)
	go func() {
		v, _ := m.view(context.Background(), []int64{1}, m.staleWait)
		first <- v
	}()
	<-db.started // the first read has read the old row and is held
	db.set(1, 10, 100)
	m.invalidate(1)
	require.Len(t, db.started, 0, "no cached value: the invalidation itself reads nothing")
	db.setHold(nil) // the next read returns at once
	second, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(100), utilization(t, second, 1), "a new read, not the one begun before the invalidation")
	require.EqualValues(t, 2, db.loads.Load())
	// Release the first read: its waiter gets its result, the cache keeps the
	// newer one.
	close(gate)
	v := <-first
	require.Equal(t, float64(30), utilization(t, v, 1), "the waiter of the old read gets its result")
	after, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(100), utilization(t, after, 1), "the old result was not stored")
	require.EqualValues(t, 2, db.loads.Load())
}

// TestQuotaMirrorStaleReadKeyCarriesVersion: an id with a cached value,
// invalidated while its refill runs, gets a new refill; the old refill does
// not overwrite the newer value.
func TestQuotaMirrorStaleReadKeyCarriesVersion(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	m := db.mirror()
	_, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	gate := make(chan struct{})
	db.setHold(gate)
	db.started = make(chan []int64, 8)
	db.set(1, 10, 50)
	m.invalidate(1) // refill A starts, reads 50 and is held
	<-db.started
	db.set(1, 10, 100)
	m.invalidate(1) // refill B starts, reads 100 and is held
	<-db.started
	v, err := m.view(t.Context(), []int64{1}, 5*time.Millisecond)
	require.NoError(t, err)
	require.True(t, v.Stale[1], "the old value, marked stale")
	require.Equal(t, float64(30), utilization(t, v, 1))
	require.Len(t, db.started, 0, "the view joined refill B")
	close(gate)
	waitUntil(t, "refill", func() bool { has, stale := entryState(m, 1); return has && !stale })
	after, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(100), utilization(t, after, 1))
	require.EqualValues(t, 3, db.loads.Load())
}

func TestQuotaMirrorReloadKeepsChangedEntries(t *testing.T) {
	db := newFakeQuotaDB()
	for id := int64(1); id <= 4; id++ {
		db.set(id, 10, float64(id))
	}
	m := db.mirror()
	_, err := m.view(t.Context(), []int64{1, 2, 3}, m.staleWait)
	require.NoError(t, err)
	// The reload covers 1 and 2 (3 is no longer covered) and is held after
	// reading its rows.
	db.covered = []int64{1, 2}
	gate := make(chan struct{})
	db.setHold(gate)
	db.started = make(chan []int64, 8)
	done := make(chan error, 1)
	go func() { done <- m.reload(context.Background()) }()
	<-db.started
	db.setHold(nil)
	// Meanwhile 1 changes and is read again, and 4 (not covered) is read.
	db.set(1, 11, 100)
	m.invalidate(1)
	<-db.started
	waitUntil(t, "refill of 1", func() bool { has, stale := entryState(m, 1); return has && !stale })
	_, err = m.view(t.Context(), []int64{4}, m.staleWait)
	require.NoError(t, err)
	<-db.started
	close(gate)
	require.NoError(t, <-done)
	m.mu.Lock()
	_, kept3 := m.entries[3]
	_, kept4 := m.entries[4]
	m.mu.Unlock()
	require.False(t, kept3, "an unchanged entry the reload no longer covers is dropped")
	require.True(t, kept4, "an entry filled during the reload is kept")
	v, err := m.view(t.Context(), []int64{1, 2, 4}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(100), utilization(t, v, 1), "the reload did not overwrite the newer value")
	require.EqualValues(t, 11, v.Snapshots[1].Generation)
	require.Equal(t, float64(2), utilization(t, v, 2))
	require.Equal(t, float64(4), utilization(t, v, 4))
	require.EqualValues(t, 1, db.reloads.Load())
}

func TestQuotaMirrorReloadSkippedByWipe(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	db.covered = []int64{1}
	m := db.mirror()
	_, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	gate := make(chan struct{})
	db.setHold(gate)
	db.started = make(chan []int64, 8)
	done := make(chan error, 1)
	go func() { done <- m.reload(context.Background()) }()
	<-db.started
	db.setHold(nil)
	db.set(1, 12, 100)
	m.invalidate(0)
	<-db.started
	waitUntil(t, "refill", func() bool { has, stale := entryState(m, 1); return has && !stale })
	close(gate)
	require.NoError(t, <-done)
	v, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.EqualValues(t, 12, v.Snapshots[1].Generation)
}

func TestQuotaMirrorBusPayloads(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	db.set(2, 10, 2)
	s := &Service{quotaMirror: db.mirror()}
	_, err := s.AccountQuotaView(t.Context(), []int64{1, 2})
	require.NoError(t, err)
	stale := func(id int64) bool { _, st := entryState(s.quotaMirror, id); return st }
	settle := func() { waitUntil(t, "refill", func() bool { return !stale(1) && !stale(2) }) }

	// A quota write: only that account's quota, the directory stays.
	db.setHold(make(chan struct{}))
	s.groups = map[int64]groupSnap{7: {}}
	s.onAccountChanged([]byte(`{"account_id":1,"kind":"quota"}`))
	require.True(t, stale(1))
	require.False(t, stale(2))
	require.Len(t, s.groups, 1, "a quota write keeps the directory snapshots")
	require.Zero(t, s.epoch)
	db.release()
	settle()

	// A change of one account: the directory and that account's quota.
	db.setHold(make(chan struct{}))
	s.onAccountChanged([]byte(`{"account_id":2}`))
	require.False(t, stale(1))
	require.True(t, stale(2))
	require.Empty(t, s.groups)
	require.EqualValues(t, 1, s.epoch)
	db.release()
	settle()

	// Without an id: every account.
	for _, payload := range []string{`{}`, `{"reason":"group_deleted"}`, `not json`, `{"kind":"quota"}`} {
		db.setHold(make(chan struct{}))
		s.onAccountChanged([]byte(payload))
		require.True(t, stale(1), payload)
		require.True(t, stale(2), payload)
		db.release()
		settle()
	}
	require.EqualValues(t, 4, s.epoch, "the quota-only message without an id kept the directory")

	// The node that changed an account drops its mirrored quota too.
	db.setHold(make(chan struct{}))
	s.invalidateNode(1)
	require.True(t, stale(1))
	require.False(t, stale(2))
	db.release()
	settle()
}

func TestQuotaMirrorLoadErrorKeepsStaleValue(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	m := db.mirror()
	_, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	db.mu.Lock()
	db.err = errors.New("connection refused")
	db.mu.Unlock()
	m.invalidate(1)
	v, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err, "an old value is not an error")
	require.True(t, v.Stale[1])
	require.Empty(t, v.Missing)
	require.Equal(t, float64(30), utilization(t, v, 1))
	// AccountQuotaSnapshots keeps the old value as well.
	s := &Service{quotaMirror: m}
	snaps, err := s.AccountQuotaSnapshots(t.Context(), []int64{1})
	require.NoError(t, err)
	require.NotNil(t, snaps[1])
}

func TestQuotaMirrorColdMissAtDeadline(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	db.set(2, 10, 40)
	m := db.mirror()
	_, err := m.view(t.Context(), []int64{2}, m.staleWait)
	require.NoError(t, err)
	gate := make(chan struct{})
	db.setHold(gate)
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Millisecond)
	defer cancel()
	v, err := m.view(ctx, []int64{1, 2}, m.staleWait)
	require.ErrorIs(t, err, context.DeadlineExceeded)
	require.Equal(t, []int64{1}, v.Missing)
	require.Equal(t, float64(40), utilization(t, v, 2), "cached ids are still answered")
	require.Nil(t, v.Snapshots[1])
	// The read goes on in the background and fills the entry.
	close(gate)
	waitUntil(t, "background fill", func() bool { has, _ := entryState(m, 1); return has })
	v, err = m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.Equal(t, float64(30), utilization(t, v, 1))
	require.EqualValues(t, 2, db.loads.Load())
	// A cancelled request on a cold id gets Missing at once.
	cancelled, stop := context.WithCancel(t.Context())
	stop()
	db.setHold(make(chan struct{}))
	defer db.release()
	v, err = m.view(cancelled, []int64{3}, m.staleWait)
	require.ErrorIs(t, err, context.Canceled)
	require.Equal(t, []int64{3}, v.Missing)
}

func TestQuotaMirrorConcurrentMissesLoadOnce(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 30)
	gate := make(chan struct{})
	db.setHold(gate)
	m := db.mirror()
	var wg sync.WaitGroup
	var entered atomic.Int32
	errs := make(chan error, 50)
	for range 50 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			entered.Add(1)
			v, err := m.view(context.Background(), []int64{1}, m.staleWait)
			if err == nil && v.Snapshots[1] == nil {
				err = errors.New("no snapshot")
			}
			errs <- err
		}()
	}
	waitUntil(t, "callers", func() bool { return entered.Load() == 50 })
	time.Sleep(50 * time.Millisecond)
	close(gate)
	wg.Wait()
	close(errs)
	for err := range errs {
		require.NoError(t, err)
	}
	require.EqualValues(t, 1, db.loads.Load())
}

func TestQuotaMirrorNegativeEntry(t *testing.T) {
	db := newFakeQuotaDB()
	m := db.mirror()
	for range 3 {
		v, err := m.view(t.Context(), []int64{5}, m.staleWait)
		require.NoError(t, err)
		require.Empty(t, v.Snapshots)
		require.Empty(t, v.Missing, "no snapshot row is an answer, not a miss")
	}
	require.EqualValues(t, 1, db.loads.Load())
	// The row is created and announced.
	db.set(5, 10, 1)
	m.invalidate(5)
	v, err := m.view(t.Context(), []int64{5}, -1)
	require.NoError(t, err)
	require.NotNil(t, v.Snapshots[5])
}

func TestQuotaMirrorBadRowSkipsOnlyItself(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	db.set(2, 0, 2) // generation 0 is not a valid snapshot
	db.invalid[3] = true
	db.set(4, 10, 4)
	m := db.mirror()
	v, err := m.view(t.Context(), []int64{1, 2, 3, 4}, m.staleWait)
	require.NoError(t, err)
	require.Empty(t, v.Missing)
	require.Len(t, v.Snapshots, 2)
	require.Equal(t, float64(1), utilization(t, v, 1))
	require.Equal(t, float64(4), utilization(t, v, 4))
}

func TestQuotaMirrorRetryBackoffAndMaxStale(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	m := db.mirror()
	now := time.Unix(1_800_000_000, 0)
	var clock sync.Mutex
	m.now = func() time.Time { clock.Lock(); defer clock.Unlock(); return now }
	advance := func(d time.Duration) { clock.Lock(); now = now.Add(d); clock.Unlock() }
	_, err := m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)

	// Past the fresh period without an invalidation: read again.
	advance(quotaMirrorFresh + time.Second)
	db.set(1, 10, 2)
	v, err := m.view(t.Context(), []int64{1}, -1)
	require.NoError(t, err)
	require.Equal(t, float64(2), utilization(t, v, 1))
	require.EqualValues(t, 2, db.loads.Load())

	// A failed read of a cold id is not repeated within 1 s.
	db.mu.Lock()
	db.err = errors.New("timeout")
	db.mu.Unlock()
	v, err = m.view(t.Context(), []int64{9}, m.staleWait)
	require.Error(t, err)
	require.Equal(t, []int64{9}, v.Missing)
	require.EqualValues(t, 3, db.loads.Load())
	v, err = m.view(t.Context(), []int64{9}, m.staleWait)
	require.ErrorIs(t, err, errQuotaMirrorBackoff)
	require.Equal(t, []int64{9}, v.Missing)
	require.EqualValues(t, 3, db.loads.Load())
	advance(quotaMirrorRetry + time.Millisecond)
	_, err = m.view(t.Context(), []int64{9}, m.staleWait)
	require.Error(t, err)
	require.EqualValues(t, 4, db.loads.Load())

	// An old value is kept while reads fail, for at most 10 minutes.
	m.invalidate(1)
	waitUntil(t, "failed refill", func() bool { return db.loads.Load() == 5 })
	v, err = m.view(t.Context(), []int64{1}, m.staleWait)
	require.NoError(t, err)
	require.True(t, v.Stale[1])
	advance(quotaMirrorMaxStale)
	v, err = m.view(t.Context(), []int64{1}, m.staleWait)
	require.Error(t, err)
	require.Equal(t, []int64{1}, v.Missing)
	require.Empty(t, v.Snapshots)
}

// reconnectBus is a bus that can report a reconnect.
type reconnectBus struct {
	fakeBus
	mu         sync.Mutex
	reconnects []func()
}

func (b *reconnectBus) OnReconnect(fn func()) func() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.reconnects = append(b.reconnects, fn)
	return func() {}
}

func (b *reconnectBus) reconnect() {
	b.mu.Lock()
	fns := append([]func(){}, b.reconnects...)
	b.mu.Unlock()
	for _, fn := range fns {
		fn()
	}
}

// changingRegistry reports generation switches to OnChange listeners.
type changingRegistry struct {
	fakeRegistry
	mu        sync.Mutex
	listeners []func(core.Generation)
}

func (r *changingRegistry) OnChange(fn func(core.Generation)) func() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.listeners = append(r.listeners, fn)
	return func() {}
}

func (r *changingRegistry) publish() {
	r.mu.Lock()
	fns := append([]func(core.Generation){}, r.listeners...)
	r.mu.Unlock()
	for _, fn := range fns {
		fn(nil)
	}
}

func TestQuotaMirrorReconnectAndPluginSwitch(t *testing.T) {
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	db.set(2, 10, 2)
	bus := &reconnectBus{}
	reg := &changingRegistry{}
	s := &Service{d: Deps{Bus: bus, Registry: reg}, quotaMirror: db.mirror()}
	cancel := s.watchChanges(t.Context())
	defer cancel()
	_, err := s.AccountQuotaView(t.Context(), []int64{1, 2})
	require.NoError(t, err)
	stale := func(id int64) bool { _, st := entryState(s.quotaMirror, id); return st }

	// account:changed reaches the service through the bus.
	gate := make(chan struct{})
	db.setHold(gate)
	require.NoError(t, core.PublishAccountQuotaChanged(t.Context(), bus, 1))
	require.True(t, stale(1))
	require.False(t, stale(2))
	close(gate)
	waitUntil(t, "refill", func() bool { return !stale(1) })

	// Messages may have been lost while the bus was disconnected.
	gate = make(chan struct{})
	db.setHold(gate)
	bus.reconnect()
	require.True(t, stale(1))
	require.True(t, stale(2))
	close(gate)
	waitUntil(t, "refill", func() bool { return !stale(1) && !stale(2) })

	// A plugin generation switch invalidates at once and again after the
	// plugins row is committed.
	old := pluginsDelay
	pluginsDelay = 30 * time.Millisecond
	defer func() { pluginsDelay = old }()
	wipe := func() uint64 {
		s.quotaMirror.mu.Lock()
		defer s.quotaMirror.mu.Unlock()
		return s.quotaMirror.wipe
	}
	before := wipe()
	gate = make(chan struct{})
	db.setHold(gate)
	reg.publish()
	require.True(t, stale(1))
	require.Equal(t, before+1, wipe())
	close(gate)
	waitUntil(t, "second invalidation", func() bool { return wipe() == before+2 })
	waitUntil(t, "refill", func() bool { return !stale(1) && !stale(2) })
}

func TestQuotaMirrorWarmsUpWithBackoffThenRegistersItsTask(t *testing.T) {
	oldMin, oldMax := quotaMirrorWarmMin, quotaMirrorWarmMax
	quotaMirrorWarmMin, quotaMirrorWarmMax = 10*time.Millisecond, 20*time.Millisecond
	defer func() { quotaMirrorWarmMin, quotaMirrorWarmMax = oldMin, oldMax }()
	db := newFakeQuotaDB()
	db.set(1, 10, 1)
	db.covered = []int64{1, 2}
	db.err = errors.New("no plugin generation loaded yet")
	tasks := newFakeTasks()
	s := &Service{quotaMirror: db.mirror()}
	s.tasks.Store(&[]core.Tasks{tasks}[0])
	m := s.quotaMirror
	ctx, cancel := context.WithCancel(t.Context())
	done := make(chan struct{})
	go func() { s.runQuotaMirror(ctx); close(done) }()
	waitUntil(t, "retries", func() bool { return db.reloads.Load() >= 3 })
	require.False(t, tasks.registered(QuotaMirrorTask), "registered before the mirror was warm")
	db.mu.Lock()
	db.err = nil
	db.mu.Unlock()
	<-done
	require.True(t, tasks.registered(QuotaMirrorTask))
	spec := tasks.spec(t, QuotaMirrorTask)
	require.Equal(t, core.TaskNode, spec.Scope)
	require.Equal(t, quotaMirrorReload, spec.Every)
	require.False(t, spec.RequireWork)
	v, err := m.view(t.Context(), []int64{1, 2}, m.staleWait)
	require.NoError(t, err)
	require.NotNil(t, v.Snapshots[1])
	require.Nil(t, v.Snapshots[2], "a covered account without a row is a negative entry")
	require.Zero(t, db.loads.Load(), "the warm-up answered both ids")
	// Then the task reloads it.
	n := db.reloads.Load()
	_, err = tasks.run(t, t.Context(), QuotaMirrorTask)
	require.NoError(t, err)
	require.Equal(t, n+1, db.reloads.Load())
	cancel()
}

func TestQuotaMirrorReloadSoonTriggersItsTask(t *testing.T) {
	db := newFakeQuotaDB()
	db.covered = []int64{1}
	reg := &changingRegistry{}
	tasks := newFakeTasks()
	s := &Service{d: Deps{Registry: reg}, quotaMirror: db.mirror()}
	s.tasks.Store(&[]core.Tasks{tasks}[0])
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	defer s.watchChanges(ctx)()
	s.runQuotaMirror(ctx)
	require.Equal(t, int32(1), db.reloads.Load())
	// Plugins start after the service: their generation switch loads the
	// account types they declare at once, not a minute later.
	db.set(1, 10, 1)
	reg.publish()
	waitUntil(t, "trigger on switch", func() bool { return tasks.triggered(QuotaMirrorTask) == 1 })
	_, err := tasks.run(t, t.Context(), QuotaMirrorTask)
	require.NoError(t, err)
	has, _ := entryState(s.quotaMirror, 1)
	require.True(t, has)
	v, err := s.AccountQuotaView(t.Context(), []int64{1})
	require.NoError(t, err)
	require.NotNil(t, v.Snapshots[1])
}

// A reload asked for while the task runs (its trigger is skipped) is done
// by the same run.
func TestQuotaMirrorTaskRepeatsAReloadAskedDuringIt(t *testing.T) {
	db := newFakeQuotaDB()
	db.covered = []int64{1}
	m := db.mirror()
	gate := make(chan struct{})
	db.setHold(gate)
	done := make(chan error, 1)
	go func() { _, err := m.reloadTask(t.Context(), core.TaskRun{}); done <- err }()
	waitUntil(t, "first reload started", func() bool { return db.reloads.Load() == 1 })
	m.reloadSoon()
	close(gate)
	require.NoError(t, <-done)
	require.Equal(t, int32(2), db.reloads.Load())
}

func TestPublishAccountQuotaChangedPayload(t *testing.T) {
	bus := &fakeBus{}
	var got []byte
	bus.Subscribe(core.ChannelAccountChanged, func(p []byte) { got = p })
	require.NoError(t, core.PublishAccountQuotaChanged(t.Context(), bus, 9))
	var m map[string]any
	require.NoError(t, json.Unmarshal(got, &m))
	require.Equal(t, map[string]any{"account_id": float64(9), "kind": "quota"}, m)
	id, kind := core.ParseAccountChanged(got)
	require.EqualValues(t, 9, id)
	require.Equal(t, core.AccountChangeQuota, kind)
	require.NoError(t, core.PublishAccountQuotaChanged(t.Context(), nil, 9))
}
