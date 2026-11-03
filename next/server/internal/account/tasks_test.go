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
	if tasks.registered(QuotaMirrorTask) {
		t.Fatal("the quota mirror task is registered once the mirror is warm, not before")
	}
}
