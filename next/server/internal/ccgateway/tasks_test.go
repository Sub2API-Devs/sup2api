package ccgateway

import (
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// fakeTasks records registered specs and triggers; tests run handlers
// directly.
type fakeTasks struct {
	mu       sync.Mutex
	specs    map[string]core.TaskSpec
	triggers map[string]int
}

func newFakeTasks() *fakeTasks {
	return &fakeTasks{specs: map[string]core.TaskSpec{}, triggers: map[string]int{}}
}

func (f *fakeTasks) Register(spec core.TaskSpec) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, dup := f.specs[spec.Name]; dup {
		return core.ErrTaskInvalid
	}
	f.specs[spec.Name] = spec
	return nil
}

func (f *fakeTasks) Trigger(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.specs[name]; !ok {
		return core.ErrTaskUnknown
	}
	f.triggers[name]++
	return nil
}

func (f *fakeTasks) Enqueue(context.Context, string, any, core.EnqueueOpts) error { return nil }

func (f *fakeTasks) EnqueueTx(context.Context, pgx.Tx, string, any, core.EnqueueOpts) error {
	return nil
}

func (f *fakeTasks) triggered(name string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.triggers[name]
}

func TestRegisterTasks(t *testing.T) {
	s := New(nil, nil)
	tasks := newFakeTasks()
	if err := s.RegisterTasks(tasks); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{RuntimeSyncTask, DraftSweepTask, ParkRuntimesTask} {
		spec, ok := tasks.specs[name]
		if !ok {
			t.Fatalf("%s not registered", name)
		}
		if spec.Scope != core.TaskCluster {
			t.Errorf("%s: scope %v, want cluster", name, spec.Scope)
		}
	}
	if spec := tasks.specs[RuntimeSyncTask]; spec.Every != reconcileEvery || spec.Timeout <= 0 {
		t.Fatalf("runtime sync: every %v timeout %v", spec.Every, spec.Timeout)
	}
	// sweepSoon is a manual run of the task, without blocking the caller.
	s.sweepSoon()
	deadline := time.Now().Add(5 * time.Second)
	for tasks.triggered(RuntimeSyncTask) != 1 {
		if time.Now().After(deadline) {
			t.Fatal("sweepSoon did not trigger core.ccgateway.runtime_sync")
		}
		time.Sleep(10 * time.Millisecond)
	}
	// Without the framework it does nothing.
	New(nil, nil).sweepSoon()
}

// The pass goes through every runtime, concurrently, and applies each
// account's configuration.
func TestRuntimeSyncReconcilesEveryRuntime(t *testing.T) {
	e := newParkEnv(t, nil)
	const n = 9
	keys := make([]string, 0, n)
	for range n {
		_, key := e.account(t, parkAccount{status: "active", schedul: true})
		keys = append(keys, key)
	}
	res, err := e.s.syncRuntimes(e.ctx, core.TaskRun{Name: RuntimeSyncTask})
	if err != nil {
		t.Fatal(err)
	}
	if res.Count != n || res.Message != "" {
		t.Fatalf("result %+v, want %d runtimes without failures", res, n)
	}
	for _, key := range keys {
		if puts := e.ctl.putsOf(key); len(puts) != 1 || !puts[0] {
			t.Errorf("%s: configurations %v, want one enabled", key, puts)
		}
	}
	// A second pass leaves ready runtimes alone.
	if _, err := e.s.syncRuntimes(e.ctx, core.TaskRun{Name: RuntimeSyncTask}); err != nil {
		t.Fatal(err)
	}
	for _, key := range keys {
		if puts := e.ctl.putsOf(key); len(puts) != 1 {
			t.Errorf("%s: rewritten by the second pass: %v", key, puts)
		}
	}
}

func TestRuntimeSyncOffWithoutAccountRuntimes(t *testing.T) {
	e := newParkEnv(t, nil)
	_, key := e.account(t, parkAccount{status: "active", schedul: true})
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: false, AdminKey: "controller-secret"})
	encrypted, _ := e.s.Cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, err := e.db.Pool.Exec(e.ctx, `UPDATE settings SET value = $2 WHERE key = $1`, settingKey, envelope); err != nil {
		t.Fatal(err)
	}
	res, err := e.s.syncRuntimes(e.ctx, core.TaskRun{Name: RuntimeSyncTask})
	if err != nil || res.Count != 0 || len(e.ctl.putsOf(key)) != 0 {
		t.Fatalf("result %+v (%v), configurations %v", res, err, e.ctl.putsOf(key))
	}
}

// Two nodes running the pass in turn send enabled:false to a parked runtime
// once per blockedFor (the mark is in ccgateway_runtimes, not only in the
// memory of the node that sent it); a change (Kick) on either node blocks it
// again, and a mark older than blockedFor does not count.
func TestBlockedOnceAcrossNodes(t *testing.T) {
	e := newParkEnv(t, nil)
	_, key := e.account(t, parkAccount{status: "disabled", schedul: true, redFor: 4 * time.Hour})
	if res := e.park(t); res.Count != 1 {
		t.Fatalf("parked %d", res.Count)
	}
	nodeA, nodeB := e.s, New(e.db, e.s.Cipher)
	blocks := func() int {
		n := 0
		for _, enabled := range e.ctl.putsOf(key) {
			if !enabled {
				n++
			}
		}
		return n
	}
	for range 3 {
		for _, s := range []*Service{nodeA, nodeB} {
			if _, err := s.syncRuntimes(e.ctx, core.TaskRun{Name: RuntimeSyncTask}); err != nil {
				t.Fatal(err)
			}
		}
	}
	if got := blocks(); got != 1 {
		t.Fatalf("blocked %d times by two nodes in six passes, want 1", got)
	}
	var revision *int64
	var at *time.Time
	if err := e.db.Pool.QueryRow(e.ctx, `SELECT blocked_revision, blocked_at FROM ccgateway_runtimes WHERE key = $1`, key).Scan(&revision, &at); err != nil {
		t.Fatal(err)
	}
	if revision == nil || *revision == 0 || at == nil {
		t.Fatalf("block not recorded: revision %v at %v", revision, at)
	}
	// A change on node B blocks it again there, once.
	nodeB.Kick(key)
	for _, s := range []*Service{nodeB, nodeA, nodeB} {
		if err := s.Reconcile(e.ctx, key); err != nil {
			t.Fatal(err)
		}
	}
	if got := blocks(); got != 2 {
		t.Fatalf("blocked %d times after a change, want 2", got)
	}
	// A mark older than blockedFor: a node that did not send it blocks again.
	if _, err := e.db.Pool.Exec(e.ctx, `UPDATE ccgateway_runtimes SET blocked_at = now() - interval '11 minutes' WHERE key = $1`, key); err != nil {
		t.Fatal(err)
	}
	if err := New(e.db, e.s.Cipher).Reconcile(e.ctx, key); err != nil {
		t.Fatal(err)
	}
	if got := blocks(); got != 3 {
		t.Fatalf("blocked %d times after the mark expired, want 3", got)
	}
}

func TestBlockedRevision(t *testing.T) {
	if blockedRevision("") != 0 || blockedRevision("abc") != 0 || blockedRevision("zzzzzzzzzzzzzzzz") != 0 {
		t.Fatal("short or invalid revisions are 0")
	}
	a := blockedRevision("ffffffffffffffff0000")
	if a <= 0 || a != blockedRevision("ffffffffffffffff1111") {
		t.Fatalf("revision form %d", a)
	}
	if blockedRevision("0123456789abcdef") == blockedRevision("0123456789abcdf1") {
		t.Fatal("different revisions share a form")
	}
}
