package account

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// fakeTasks records registered specs; tests run their handlers directly.
type fakeTasks struct {
	mu       sync.Mutex
	specs    map[string]core.TaskSpec
	triggers map[string]int
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

func (f *fakeTasks) spec(t *testing.T, name string) core.TaskSpec {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	spec, ok := f.specs[name]
	if !ok {
		t.Fatalf("task %s not registered", name)
	}
	return spec
}

func (f *fakeTasks) registered(name string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.specs[name]
	return ok
}

func (f *fakeTasks) triggered(name string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.triggers[name]
}

// run runs one run of task name through its handler.
func (f *fakeTasks) run(t *testing.T, ctx context.Context, name string) (core.TaskResult, error) {
	t.Helper()
	spec := f.spec(t, name)
	ctx, cancel := context.WithTimeout(ctx, spec.Timeout)
	defer cancel()
	return spec.Handler(ctx, core.TaskRun{Name: name, ScheduledAt: time.Now(), Attempt: 1})
}

func newFakeTasks() *fakeTasks {
	return &fakeTasks{specs: map[string]core.TaskSpec{}, triggers: map[string]int{}}
}

func registerTasks(t *testing.T, s *Service) *fakeTasks {
	t.Helper()
	tasks := newFakeTasks()
	if err := s.RegisterTasks(tasks); err != nil {
		t.Fatal(err)
	}
	return tasks
}

func TestAccountTaskSpecs(t *testing.T) {
	tasks := registerTasks(t, New(Deps{}))
	for _, name := range []string{AutomaticRecoveryTask, LifecycleStatusTask, PreparationCleanupTask} {
		spec := tasks.spec(t, name)
		if spec.Scope != core.TaskCluster || spec.Every != time.Minute || spec.Timeout != 50*time.Second {
			t.Fatalf("%s: %+v", name, spec)
		}
	}
	for name, want := range map[string]struct {
		scope core.TaskScope
		every time.Duration
	}{
		UsageLimitsTask:       {core.TaskCluster, 5 * time.Second},
		CredentialRefreshTask: {core.TaskCluster, 5 * time.Minute},
		QuotaSweepTask:        {core.TaskNode, 5 * time.Second},
	} {
		spec := tasks.spec(t, name)
		if spec.Scope != want.scope || spec.Every != want.every || spec.Timeout <= 0 {
			t.Fatalf("%s: %+v", name, spec)
		}
	}
	if !tasks.spec(t, QuotaSweepTask).RequireWork || !tasks.spec(t, CredentialRefreshTask).RunOnStart {
		t.Fatal("quota sweep runs on working nodes only; credential refresh runs when a node takes over")
	}
	if tasks.registered(QuotaMirrorTask) {
		t.Fatal("the quota mirror task is registered once the mirror is warm, not before")
	}
}

// core.account.usage_limits folds the journal and then enforces: usage
// recorded after a limit was saved disables the account at the next run.
func TestUsageLimitsTaskFoldsAndEnforces(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	tasks := registerTasks(t, e.svc)
	id := e.mkRawAccount("anthropic", "apikey", "usage-task", "sk-good-key-123", true)
	code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit",
		map[string]any{"enabled": true, "amount": "5", "period": "day", "period_count": 1, "timezone": "UTC"})
	if code != 200 {
		t.Fatal(code, out)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		total_cost, billing_status, billing_detail, rate_multiplier, input_tokens, output_tokens)
		VALUES ('task-u1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 6, 'billed', '{"cost":"5"}', 1.2, 100, 20)`, id); err != nil {
		t.Fatal(err)
	}
	status := func() string {
		var s string
		if err := e.db.Pool.QueryRow(ctx, `SELECT status FROM accounts WHERE id = $1`, id).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return s
	}
	if s := status(); s != "active" {
		t.Fatalf("status %s before the run", s)
	}
	if _, err := tasks.run(t, ctx, UsageLimitsTask); err != nil {
		t.Fatal(err)
	}
	var pending int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM account_usage_deltas`).Scan(&pending); err != nil || pending != 0 {
		t.Fatalf("journal rows left: %d (%v)", pending, err)
	}
	if s := status(); s != "auto_disabled" {
		t.Fatalf("status %s after the run, want auto_disabled", s)
	}
}
