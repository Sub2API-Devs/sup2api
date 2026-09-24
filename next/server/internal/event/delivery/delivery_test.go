package delivery

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ---------------------------------------------------------------- fakes

// memLocker is an in-memory core.Locker shared by several fake nodes.
type memLocker struct {
	mu    sync.Mutex
	locks map[string]memLock
	seq   int
}

type memLock struct {
	token   int
	expires time.Time
}

func newMemLocker() *memLocker { return &memLocker{locks: map[string]memLock{}} }

func (l *memLocker) TryLock(_ context.Context, key string, ttl time.Duration) (func(), bool, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if cur, ok := l.locks[key]; ok && time.Now().Before(cur.expires) {
		return func() {}, false, nil
	}
	l.seq++
	tok := l.seq
	l.locks[key] = memLock{token: tok, expires: time.Now().Add(ttl)}
	return func() {
		l.mu.Lock()
		defer l.mu.Unlock()
		if cur, ok := l.locks[key]; ok && cur.token == tok {
			delete(l.locks, key)
		}
	}, true, nil
}

type fakeGen struct {
	core.Generation
	subs []core.SubscriptionBinding
}

func (g *fakeGen) Subscriptions() []core.SubscriptionBinding { return g.subs }

type fakeRegistry struct {
	mu  sync.Mutex
	gen core.Generation
	fns map[int]func(core.Generation)
	seq int
}

func newRegistry(subs ...core.SubscriptionBinding) *fakeRegistry {
	return &fakeRegistry{gen: &fakeGen{subs: subs}, fns: map[int]func(core.Generation){}}
}

func (r *fakeRegistry) Current() core.Generation {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.gen
}

func (r *fakeRegistry) OnChange(fn func(core.Generation)) func() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.seq++
	id := r.seq
	r.fns[id] = fn
	return func() {
		r.mu.Lock()
		defer r.mu.Unlock()
		delete(r.fns, id)
	}
}

func (r *fakeRegistry) set(subs ...core.SubscriptionBinding) {
	r.mu.Lock()
	r.gen = &fakeGen{subs: subs}
	fns := make([]func(core.Generation), 0, len(r.fns))
	for _, fn := range r.fns {
		fns = append(fns, fn)
	}
	gen := r.gen
	r.mu.Unlock()
	for _, fn := range fns {
		fn(gen)
	}
}

// fakeApp records delivered events; handle decides the response.
type fakeApp struct {
	mu      sync.Mutex
	calls   [][]int64
	handle  func(ids []int64) (int64, error)
	delay   time.Duration
	inCalls int
	overlap bool
}

func (a *fakeApp) RunJob(context.Context, *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	return nil, errors.New("not used")
}

func (a *fakeApp) OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	ids := make([]int64, 0, len(in.Events))
	for _, e := range in.Events {
		ids = append(ids, e.Id)
	}
	a.mu.Lock()
	a.inCalls++
	if a.inCalls > 1 {
		a.overlap = true
	}
	a.calls = append(a.calls, ids)
	h := a.handle
	a.mu.Unlock()
	defer func() {
		a.mu.Lock()
		a.inCalls--
		a.mu.Unlock()
	}()
	if a.delay > 0 {
		time.Sleep(a.delay)
	}
	if h != nil {
		acked, err := h(ids)
		if err != nil {
			return nil, err
		}
		return &pluginv1.OnEventsResponse{AckedThroughId: acked}, nil
	}
	return &pluginv1.OnEventsResponse{AckedThroughId: ids[len(ids)-1]}, nil
}

func (a *fakeApp) delivered() []int64 {
	a.mu.Lock()
	defer a.mu.Unlock()
	var out []int64
	for _, c := range a.calls {
		out = append(out, c...)
	}
	return out
}

func (a *fakeApp) callCount() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return len(a.calls)
}

// fakeBus delivers published messages synchronously.
type fakeBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
}

func (b *fakeBus) Publish(_ context.Context, ch string, p []byte) error {
	b.mu.Lock()
	hs := append([]func([]byte){}, b.subs[ch]...)
	b.mu.Unlock()
	for _, h := range hs {
		h(p)
	}
	return nil
}

func (b *fakeBus) Subscribe(ch string, h func([]byte)) func() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subs == nil {
		b.subs = map[string][]func([]byte){}
	}
	b.subs[ch] = append(b.subs[ch], h)
	return func() {}
}

// ---------------------------------------------------------------- helpers

func testOpts() Options {
	return Options{
		PollInterval: 20 * time.Millisecond,
		LockTTL:      20 * time.Second,
		CallTimeout:  2 * time.Second,
		BackoffMin:   10 * time.Millisecond,
		BackoffMax:   40 * time.Millisecond,
		GapMinWait:   50 * time.Millisecond,
		GapMaxWait:   5 * time.Second,
	}
}

func binding(key string, app core.AppPlugin, batch int, subscribe ...string) core.SubscriptionBinding {
	return core.SubscriptionBinding{
		Plugin: core.PluginInfo{Key: key, Version: "1.0.0"},
		Events: manifest.Events{Subscribe: subscribe, BatchSize: batch},
		Client: app,
	}
}

func addPlugin(t *testing.T, db *store.DB, key string) {
	t.Helper()
	if _, err := db.Pool.Exec(context.Background(),
		`INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'enabled')`, key); err != nil {
		t.Fatal(err)
	}
}

func emit(t *testing.T, q store.Querier, typ string) int64 {
	t.Helper()
	var id int64
	if err := q.QueryRow(context.Background(),
		`INSERT INTO events (type, payload) VALUES ($1, '{"k":1}') RETURNING id`, typ).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func startNode(t *testing.T, db *store.DB, l core.Locker, bus core.Bus, reg core.PluginRegistry, node string, o Options) *Service {
	t.Helper()
	s := New(db, l, bus, reg, nil, node, o)
	if err := s.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = s.Stop(ctx)
	})
	return s
}

func eventually(t *testing.T, d time.Duration, what string, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if fn() {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

type cursorRow struct {
	last     int64
	failures int
	retry    *time.Time
	lastErr  string
}

func readCursor(t *testing.T, db *store.DB, key string) cursorRow {
	t.Helper()
	var c cursorRow
	err := db.Pool.QueryRow(context.Background(), `SELECT last_event_id, consecutive_failures, next_retry_at, last_error
		FROM plugin_event_cursors WHERE plugin_key = $1`, key).Scan(&c.last, &c.failures, &c.retry, &c.lastErr)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func cursorExists(db *store.DB, key string) bool {
	var ok bool
	_ = db.Pool.QueryRow(context.Background(), `SELECT EXISTS (SELECT 1 FROM plugin_event_cursors WHERE plugin_key = $1)`, key).Scan(&ok)
	return ok
}

func equalIDs(a, b []int64) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

// ---------------------------------------------------------------- unit tests

func TestMatcher(t *testing.T) {
	m := newMatcher([]string{"usage.recorded", "account.*"})
	for typ, want := range map[string]bool{
		"usage.recorded": true, "usage.other": false, "account.created": true,
		"account": false, "accounts.x": false, "balance.changed": false,
	} {
		if got := m.match(typ); got != want {
			t.Errorf("match(%q) = %v, want %v", typ, got, want)
		}
	}
	if !newMatcher([]string{"*"}).match("anything") {
		t.Error("* should match everything")
	}
}

func TestBackoff(t *testing.T) {
	lo, hi := time.Second, 5*time.Minute
	want := []time.Duration{time.Second, 2 * time.Second, 4 * time.Second, 8 * time.Second}
	for i, w := range want {
		if got := backoff(i+1, lo, hi); got != w {
			t.Errorf("backoff(%d) = %v, want %v", i+1, got, w)
		}
	}
	if got := backoff(20, lo, hi); got != hi {
		t.Errorf("backoff(20) = %v, want %v", got, hi)
	}
}

// ---------------------------------------------------------------- db tests

func TestNewSubscriptionSkipsHistory(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	emit(t, db.Pool, "usage.recorded")
	emit(t, db.Pool, "usage.recorded")

	app := &fakeApp{}
	startNode(t, db, newMemLocker(), nil, newRegistry(binding("guard", app, 0, "usage.recorded")), "n1", testOpts())
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })

	want := emit(t, db.Pool, "usage.recorded")
	emit(t, db.Pool, "user.created") // not subscribed
	eventually(t, 20*time.Second, "delivery", func() bool { return len(app.delivered()) > 0 })
	eventually(t, 20*time.Second, "cursor past non-matching event", func() bool { return readCursor(t, db, "guard").last == want+1 })
	if got := app.delivered(); !equalIDs(got, []int64{want}) {
		t.Fatalf("delivered %v, want [%d]", got, want)
	}
}

func TestTwoNodesDeliverEachEventOnce(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	locker := newMemLocker()
	// One shared plugin "instance": the fake detects concurrent calls.
	app := &fakeApp{delay: time.Millisecond}
	o := testOpts()
	startNode(t, db, locker, nil, newRegistry(binding("guard", app, 7, "usage.*", "balance.changed")), "n1", o)
	startNode(t, db, locker, nil, newRegistry(binding("guard", app, 7, "usage.*", "balance.changed")), "n2", o)
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })

	var want []int64
	types := []string{"usage.recorded", "balance.changed", "user.updated"}
	for i := range 90 {
		id := emit(t, db.Pool, types[i%3])
		if i%3 != 2 {
			want = append(want, id)
		}
		if i%10 == 0 {
			time.Sleep(15 * time.Millisecond)
		}
	}
	eventually(t, 20*time.Second, "all events delivered", func() bool { return len(app.delivered()) >= len(want) })
	time.Sleep(100 * time.Millisecond)
	got := app.delivered()
	if !equalIDs(got, want) {
		t.Fatalf("delivered %d events, want %d exactly once in order", len(got), len(want))
	}
	app.mu.Lock()
	overlap := app.overlap
	app.mu.Unlock()
	if overlap {
		t.Fatal("two nodes called OnEvents concurrently")
	}
}

func TestPartialAckRedelivers(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	// Acknowledge at most two events per call.
	app := &fakeApp{handle: func(ids []int64) (int64, error) { return ids[min(1, len(ids)-1)], nil }}
	startNode(t, db, newMemLocker(), nil, newRegistry(binding("guard", app, 5, "usage.recorded")), "n1", testOpts())
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })

	var ids []int64
	tx, err := db.Pool.Begin(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	for range 5 {
		ids = append(ids, emit(t, tx, "usage.recorded"))
	}
	if err := tx.Commit(context.Background()); err != nil {
		t.Fatal(err)
	}
	eventually(t, 20*time.Second, "cursor at last event", func() bool { return readCursor(t, db, "guard").last == ids[4] })
	app.mu.Lock()
	calls := app.calls
	app.mu.Unlock()
	want := [][]int64{ids[0:5], ids[2:5], ids[4:5]}
	if len(calls) != len(want) {
		t.Fatalf("calls %v, want %v", calls, want)
	}
	for i := range want {
		if !equalIDs(calls[i], want[i]) {
			t.Fatalf("call %d = %v, want %v", i, calls[i], want[i])
		}
	}
}

func TestBackoffThenDeadLetter(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	var mu sync.Mutex
	poison := int64(-1)
	app := &fakeApp{handle: func(ids []int64) (int64, error) {
		mu.Lock()
		defer mu.Unlock()
		for _, id := range ids {
			if id == poison {
				return 0, fmt.Errorf("cannot handle %d", id)
			}
		}
		return ids[len(ids)-1], nil
	}}
	o := testOpts()
	o.MaxFailures = 4
	o.BackoffMin = 150 * time.Millisecond
	o.BackoffMax = 150 * time.Millisecond
	startNode(t, db, newMemLocker(), nil, newRegistry(binding("guard", app, 0, "usage.recorded")), "n1", o)
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })

	tx, _ := db.Pool.Begin(context.Background())
	a := emit(t, tx, "usage.recorded")
	b := emit(t, tx, "usage.recorded")
	mu.Lock()
	poison = b
	mu.Unlock()
	if err := tx.Commit(context.Background()); err != nil {
		t.Fatal(err)
	}

	eventually(t, 20*time.Second, "first failure recorded", func() bool { return readCursor(t, db, "guard").failures == 1 })
	c := readCursor(t, db, "guard")
	if c.retry == nil || c.lastErr == "" || c.last != a-1 {
		t.Fatalf("after failure cursor = %+v", c)
	}
	// Backoff: no immediate retry.
	time.Sleep(60 * time.Millisecond)
	if n := app.callCount(); n != 1 {
		t.Fatalf("retried during backoff: %d calls", n)
	}

	eventually(t, 30*time.Second, "dead letter", func() bool { return readCursor(t, db, "guard").last == b })
	c = readCursor(t, db, "guard")
	if c.failures != 0 || c.retry != nil {
		t.Fatalf("failure state not cleared: %+v", c)
	}
	if n := app.callCount(); n != o.MaxFailures {
		t.Fatalf("calls = %d, want %d", n, o.MaxFailures)
	}
	var first, last int64
	var msg string
	if err := db.Pool.QueryRow(context.Background(),
		`SELECT first_event_id, last_event_id, error FROM plugin_event_deadletters WHERE plugin_key = 'guard'`).Scan(&first, &last, &msg); err != nil {
		t.Fatal(err)
	}
	if first != a || last != b || msg == "" {
		t.Fatalf("dead letter = %d..%d %q", first, last, msg)
	}

	// Delivery continues after the dead-lettered batch.
	next := emit(t, db.Pool, "usage.recorded")
	eventually(t, 20*time.Second, "next event", func() bool { return readCursor(t, db, "guard").last == next })
}

func TestZeroAckIsFailure(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	app := &fakeApp{handle: func([]int64) (int64, error) { return 0, nil }}
	startNode(t, db, newMemLocker(), nil, newRegistry(binding("guard", app, 0, "usage.recorded")), "n1", testOpts())
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })
	emit(t, db.Pool, "usage.recorded")
	eventually(t, 20*time.Second, "failure recorded", func() bool { return readCursor(t, db, "guard").failures >= 1 })
}

func TestDisableResumesFromCursor(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	app := &fakeApp{}
	b := binding("guard", app, 0, "usage.recorded")
	reg := newRegistry(b)
	startNode(t, db, newMemLocker(), nil, reg, "n1", testOpts())
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })

	e1 := emit(t, db.Pool, "usage.recorded")
	eventually(t, 20*time.Second, "e1", func() bool { return readCursor(t, db, "guard").last == e1 })

	reg.set() // plugin disabled
	time.Sleep(100 * time.Millisecond)
	e2 := emit(t, db.Pool, "usage.recorded")
	e3 := emit(t, db.Pool, "usage.recorded")
	time.Sleep(2 * time.Second)
	if got := app.delivered(); !equalIDs(got, []int64{e1}) {
		t.Fatalf("delivered while disabled: %v", got)
	}
	if c := readCursor(t, db, "guard"); c.last != e1 {
		t.Fatalf("cursor moved while disabled: %d", c.last)
	}

	reg.set(b) // re-enabled
	eventually(t, 20*time.Second, "resume", func() bool { return len(app.delivered()) == 3 })
	if got := app.delivered(); !equalIDs(got, []int64{e1, e2, e3}) {
		t.Fatalf("delivered %v", got)
	}
}

func TestGapWaitsForUncommittedEvent(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	app := &fakeApp{}
	startNode(t, db, newMemLocker(), nil, newRegistry(binding("guard", app, 0, "usage.recorded")), "n1", testOpts())
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })
	ctx := context.Background()

	// Committed later than a higher id.
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	slow := emit(t, tx, "usage.recorded")
	fast := emit(t, db.Pool, "usage.recorded")
	time.Sleep(2 * time.Second)
	if got := app.delivered(); len(got) != 0 {
		t.Fatalf("delivered past an uncommitted event: %v", got)
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	eventually(t, 20*time.Second, "both delivered", func() bool { return len(app.delivered()) >= 2 })
	if got := app.delivered(); !equalIDs(got, []int64{slow, fast}) {
		t.Fatalf("delivered %v, want [%d %d]", got, slow, fast)
	}

	// Rolled back: the hole is skipped once the transaction is gone.
	tx, err = db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	emit(t, tx, "usage.recorded")
	after := emit(t, db.Pool, "usage.recorded")
	time.Sleep(100 * time.Millisecond)
	_ = tx.Rollback(ctx)
	eventually(t, 30*time.Second, "event after rolled-back hole", func() bool { return len(app.delivered()) == 3 })
	if got := app.delivered(); got[2] != after {
		t.Fatalf("delivered %v", got)
	}
}

func TestBusWakeUp(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	app := &fakeApp{}
	bus := &fakeBus{}
	o := testOpts()
	o.PollInterval = time.Hour
	startNode(t, db, newMemLocker(), bus, newRegistry(binding("guard", app, 0, "usage.recorded")), "n1", o)
	eventually(t, 20*time.Second, "cursor created", func() bool { return cursorExists(db, "guard") })
	id := emit(t, db.Pool, "usage.recorded")
	_ = bus.Publish(context.Background(), ChannelEventsAppended, nil)
	eventually(t, 20*time.Second, "woken delivery", func() bool { return equalIDs(app.delivered(), []int64{id}) })
}

func TestPurgeEvents(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	ctx := context.Background()
	addPlugin(t, db, "guard")
	addPlugin(t, db, "other")
	var ids []int64
	for i := range 6 {
		age := "10 days"
		if i >= 4 {
			age = "1 day"
		}
		var id int64
		if err := db.Pool.QueryRow(ctx, `INSERT INTO events (type, occurred_at, payload)
			VALUES ('usage.recorded', now() - $1::interval, '{}') RETURNING id`, age).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
	}
	// Cursors: guard passed everything, other only the first two events.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugin_event_cursors (plugin_key, last_event_id) VALUES ('guard', $1), ('other', $2)`,
		ids[5], ids[1]); err != nil {
		t.Fatal(err)
	}
	s := New(db, newMemLocker(), nil, newRegistry(), nil, "n1", Options{})
	n, err := s.PurgeEvents(ctx)
	if err != nil || n != 2 {
		t.Fatalf("purged %d, %v; want 2", n, err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE plugin_event_cursors SET last_event_id = $1 WHERE plugin_key = 'other'`, ids[5]); err != nil {
		t.Fatal(err)
	}
	if n, err = s.PurgeEvents(ctx); err != nil || n != 2 {
		t.Fatalf("purged %d, %v; want 2 (recent events kept)", n, err)
	}
	var left []int64
	rows, _ := db.Pool.Query(ctx, `SELECT id FROM events ORDER BY id`)
	left, _ = pgx.CollectRows(rows, pgx.RowTo[int64])
	sort.Slice(left, func(i, j int) bool { return left[i] < left[j] })
	if !equalIDs(left, ids[4:]) {
		t.Fatalf("left %v, want %v", left, ids[4:])
	}
}
