package job

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ---------------------------------------------------------------- fakes

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
	jobs []core.JobBinding
}

func (g *fakeGen) Jobs() []core.JobBinding { return g.jobs }

func (g *fakeGen) Plugin(key string) (core.PluginInfo, bool) {
	for _, j := range g.jobs {
		if j.Plugin.Key == key {
			return j.Plugin, true
		}
	}
	return core.PluginInfo{}, false
}

type fakeRegistry struct {
	mu  sync.Mutex
	gen core.Generation
	fns []func(core.Generation)
}

func newRegistry(jobs ...core.JobBinding) *fakeRegistry {
	return &fakeRegistry{gen: &fakeGen{jobs: jobs}}
}

func (r *fakeRegistry) Current() core.Generation {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.gen
}

func (r *fakeRegistry) OnChange(fn func(core.Generation)) func() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.fns = append(r.fns, fn)
	return func() {}
}

func (r *fakeRegistry) set(jobs ...core.JobBinding) {
	r.mu.Lock()
	r.gen = &fakeGen{jobs: jobs}
	fns, gen := r.fns, r.gen
	r.mu.Unlock()
	for _, fn := range fns {
		fn(gen)
	}
}

type fakeApp struct {
	mu    sync.Mutex
	calls []*pluginv1.RunJobRequest
	run   func(ctx context.Context, in *pluginv1.RunJobRequest) (string, error)
}

func (a *fakeApp) OnEvents(context.Context, *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	return nil, errors.New("not used")
}

func (a *fakeApp) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	a.mu.Lock()
	a.calls = append(a.calls, in)
	run := a.run
	a.mu.Unlock()
	msg := "ok"
	if run != nil {
		var err error
		if msg, err = run(ctx, in); err != nil {
			return nil, err
		}
	}
	return &pluginv1.RunJobResponse{Message: msg}, nil
}

func (a *fakeApp) snapshot() []*pluginv1.RunJobRequest {
	a.mu.Lock()
	defer a.mu.Unlock()
	return append([]*pluginv1.RunJobRequest(nil), a.calls...)
}

// ---------------------------------------------------------------- helpers

func jobBinding(key, id, schedule string, timeoutSec int, app core.AppPlugin) core.JobBinding {
	return core.JobBinding{
		Plugin: core.PluginInfo{Key: key, Version: "1.0.0"},
		Job:    manifest.Job{ID: id, Schedule: schedule, TimeoutSec: timeoutSec},
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

func start(t *testing.T, db *store.DB, l core.Locker, reg core.PluginRegistry, node string) *Scheduler {
	t.Helper()
	s := New(db, l, reg, nil, node, Options{})
	if err := s.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
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
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

type runRow struct {
	id        int64
	node      string
	scheduled time.Time
	status    string
	manual    bool
	message   string
	finished  *time.Time
}

func runs(t *testing.T, db *store.DB, key, job string) []runRow {
	t.Helper()
	rows, err := db.Pool.Query(context.Background(), `SELECT id, node_id, scheduled_at, status, manual, message, finished_at
		FROM plugin_job_runs WHERE plugin_key = $1 AND job_id = $2 ORDER BY id`, key, job)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []runRow
	for rows.Next() {
		var r runRow
		if err := rows.Scan(&r.id, &r.node, &r.scheduled, &r.status, &r.manual, &r.message, &r.finished); err != nil {
			t.Fatal(err)
		}
		out = append(out, r)
	}
	return out
}

// ---------------------------------------------------------------- unit tests

func TestParseSchedule(t *testing.T) {
	s, err := ParseSchedule("@every 5m")
	if err != nil {
		t.Fatal(err)
	}
	base := time.Date(2026, 1, 1, 10, 0, 0, 0, time.UTC)
	// Nodes that evaluate at different instants in the same period agree.
	for _, off := range []time.Duration{time.Second, 2 * time.Minute, 4*time.Minute + 59*time.Second} {
		if got := s.Next(base.Add(off)); !got.Equal(base.Add(5 * time.Minute)) {
			t.Errorf("Next(+%v) = %v", off, got)
		}
	}
	c, err := ParseSchedule("0 3 * * *")
	if err != nil {
		t.Fatal(err)
	}
	loc := time.FixedZone("UTC+8", 8*3600)
	got := c.Next(time.Date(2026, 1, 1, 10, 0, 0, 0, loc)) // 02:00 UTC
	if want := time.Date(2026, 1, 1, 3, 0, 0, 0, time.UTC); !got.Equal(want) {
		t.Errorf("cron Next = %v, want %v (UTC)", got, want)
	}
	tz, err := ParseSchedule("CRON_TZ=Asia/Shanghai 0 3 * * *")
	if err == nil {
		got := tz.Next(time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
		if want := time.Date(2026, 1, 1, 19, 0, 0, 0, time.UTC); !got.Equal(want) {
			t.Errorf("CRON_TZ Next = %v, want %v", got, want)
		}
	}
	if _, err := ParseSchedule("every day"); err == nil {
		t.Error("invalid schedule accepted")
	}
}

// ---------------------------------------------------------------- db tests

func TestTwoNodesRunEachSlotOnce(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	locker := newMemLocker()
	app := &fakeApp{}
	b := jobBinding("guard", "tick", "@every 1s", 0, app)
	reg1, reg2 := newRegistry(b), newRegistry(b)
	s1 := start(t, db, locker, reg1, "n1")
	start(t, db, locker, reg2, "n2")

	eventually(t, 20*time.Second, "several slots", func() bool { return len(app.snapshot()) >= 4 })
	// Disable on both nodes, then let in-flight runs finish.
	reg1.set()
	reg2.set()
	eventually(t, 5*time.Second, "schedule rebuilt", func() bool {
		_, ok := s1.NextRun("guard", "tick")
		return !ok
	})
	time.Sleep(2 * time.Second)

	calls := app.snapshot()
	seen := map[int64]bool{}
	for _, c := range calls {
		if seen[c.ScheduledAtUnix] {
			t.Fatalf("slot %d ran twice", c.ScheduledAtUnix)
		}
		seen[c.ScheduledAtUnix] = true
		if c.Manual || c.JobId != "tick" {
			t.Fatalf("unexpected request %+v", c)
		}
	}
	rs := runs(t, db, "guard", "tick")
	if len(rs) != len(calls) {
		t.Fatalf("%d runs recorded for %d calls", len(rs), len(calls))
	}
	for _, r := range rs {
		if !seen[r.scheduled.Unix()] || r.status != StatusSucceeded || r.message != "ok" || r.finished == nil {
			t.Fatalf("bad run %+v", r)
		}
	}
	// No more runs after the plugin left the generation.
	n := len(app.snapshot())
	time.Sleep(1500 * time.Millisecond)
	if m := len(app.snapshot()); m != n {
		t.Fatalf("job ran after disable: %d -> %d", n, m)
	}
}

func TestRunNowConflictAndTimeout(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	release := make(chan struct{})
	app := &fakeApp{run: func(ctx context.Context, in *pluginv1.RunJobRequest) (string, error) {
		select {
		case <-release:
			return "manual done", nil
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}}
	// Scheduled far in the future so only manual runs happen.
	s := start(t, db, newMemLocker(), newRegistry(jobBinding("guard", "rollup", "0 0 1 1 *", 2, app)), "n1")
	ctx := context.Background()

	if err := s.RunNow(ctx, "guard", "rollup", 7); err != nil {
		t.Fatal(err)
	}
	var ce *core.Error
	if err := s.RunNow(ctx, "guard", "rollup", 7); !errors.As(err, &ce) || ce.Code != "conflict" {
		t.Fatalf("second RunNow = %v, want conflict", err)
	}
	close(release)
	eventually(t, 10*time.Second, "manual run finished", func() bool {
		rs := runs(t, db, "guard", "rollup")
		return len(rs) == 1 && rs[0].status == StatusSucceeded
	})
	r := runs(t, db, "guard", "rollup")[0]
	if !r.manual || r.message != "manual done" || r.node != "n1" {
		t.Fatalf("run = %+v", r)
	}
	if c := app.snapshot(); len(c) != 1 || !c[0].Manual {
		t.Fatalf("calls = %+v", c)
	}

	// Timeout: the plugin blocks past timeoutSec (2s).
	app.mu.Lock()
	app.run = func(ctx context.Context, _ *pluginv1.RunJobRequest) (string, error) {
		<-ctx.Done()
		return "", ctx.Err()
	}
	app.mu.Unlock()
	if err := s.RunNow(ctx, "guard", "rollup", 7); err != nil {
		t.Fatal(err)
	}
	eventually(t, 15*time.Second, "timeout recorded", func() bool {
		rs := runs(t, db, "guard", "rollup")
		return len(rs) == 2 && rs[1].status == StatusTimeout
	})

	// Failure message.
	app.mu.Lock()
	app.run = func(context.Context, *pluginv1.RunJobRequest) (string, error) { return "", fmt.Errorf("boom") }
	app.mu.Unlock()
	eventually(t, 10*time.Second, "lock released", func() bool { return s.RunNow(ctx, "guard", "rollup", 7) == nil })
	eventually(t, 10*time.Second, "failure recorded", func() bool {
		rs := runs(t, db, "guard", "rollup")
		return len(rs) == 3 && rs[2].status == StatusFailed && rs[2].message == "boom"
	})
}

func TestRunNowLookup(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	addPlugin(t, db, "off")
	s := start(t, db, newMemLocker(), newRegistry(jobBinding("guard", "rollup", "@every 1h", 0, &fakeApp{})), "n1")
	ctx := context.Background()
	cases := map[[2]string]string{
		{"guard", "nope"}: "not_found",
		{"off", "rollup"}: "plugin_unavailable",
		{"ghost", "x"}:    "not_found",
	}
	for in, code := range cases {
		err := s.RunNow(ctx, in[0], in[1], 1)
		var ce *core.Error
		if !errors.As(err, &ce) || ce.Code != code {
			t.Errorf("RunNow(%v) = %v, want %s", in, err, code)
		}
	}
}

func TestStartRecoversAbandonedRuns(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status)
		VALUES ('guard', 'a', 'n1', now(), now(), 'running'), ('guard', 'a', 'n2', now(), now(), 'running')`); err != nil {
		t.Fatal(err)
	}
	start(t, db, newMemLocker(), newRegistry(), "n1")
	rs := runs(t, db, "guard", "a")
	if rs[0].status != StatusFailed || rs[0].finished == nil || rs[1].status != StatusRunning {
		t.Fatalf("runs = %+v", rs)
	}
}

func TestPurgeRuns(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	addPlugin(t, db, "guard")
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status, message)
		SELECT 'guard', 'a', 'n1', now(), now(), 'succeeded', g::text FROM generate_series(1, 1005) g`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status)
		VALUES ('guard', 'b', 'n1', now(), now(), 'succeeded'),
		       ('guard', 'b', 'n1', now(), now() - interval '2 days', 'running')`); err != nil {
		t.Fatal(err)
	}
	s := New(db, newMemLocker(), newRegistry(), nil, "n1", Options{})
	n, err := s.PurgeRuns(ctx)
	if err != nil || n != 5 {
		t.Fatalf("purged %d, %v; want 5", n, err)
	}
	a := runs(t, db, "guard", "a")
	if len(a) != 1000 || a[0].message != "6" || a[999].message != "1005" {
		t.Fatalf("kept %d runs, first %q", len(a), a[0].message)
	}
	b := runs(t, db, "guard", "b")
	if len(b) != 2 || b[1].status != StatusFailed {
		t.Fatalf("job b runs = %+v", b)
	}
}
