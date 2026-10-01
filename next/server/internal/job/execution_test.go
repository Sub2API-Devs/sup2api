package job

import (
	"context"
	"errors"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type blockingPreparationLock struct{}

func (blockingPreparationLock) TryLock(ctx context.Context, _ string, _ time.Duration) (core.Lock, bool, error) {
	<-ctx.Done()
	return nil, false, ctx.Err()
}

func TestScheduledPreparationSharesExecutionDeadline(t *testing.T) {
	s := New(nil, blockingPreparationLock{}, newRegistry(), nil, "node", Options{DefaultTimeout: 20 * time.Millisecond})
	s.ctx = context.Background()
	done := make(chan struct{})
	go func() {
		s.runScheduledAdmitted(context.Background(), jobBinding("p", "j", "@every 1h", 0, &fakeApp{}), time.Now())
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("lock preparation had no execution deadline")
	}
}

func TestManualBusyCreatesNoRunAndStopJoinsRecordedRun(t *testing.T) {
	db := testutil.DB(t)
	addPlugin(t, db, "busy-test")
	executor := background.New(1)
	other := executor.Group(context.Background(), 1, 0)
	held, err := other.TryAcquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	entered, release := make(chan struct{}), make(chan struct{})
	app := &fakeApp{run: func(ctx context.Context, _ *pluginv1.RunJobRequest) (string, error) {
		close(entered)
		<-ctx.Done()
		<-release
		return "", ctx.Err()
	}}
	s := New(db, newMemLocker(), newRegistry(jobBinding("busy-test", "job", "@every 1h", 0, app)), nil, "node", Options{Executor: executor})
	if err := s.Start(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Stop(context.Background()) })
	t.Cleanup(func() {
		select {
		case <-release:
		default:
			close(release)
		}
	})
	if err := s.RunNow(context.Background(), "busy-test", "job", 7); err == nil || core.AsError(err).Code != "unavailable" {
		t.Fatalf("busy: %v", err)
	}
	if rs := runs(t, db, "busy-test", "job"); len(rs) != 0 {
		t.Fatal("busy manual execution created a run")
	}
	held.Release()
	_ = other.Close(context.Background())
	if err := s.RunNow(context.Background(), "busy-test", "job", 7); err != nil {
		t.Fatal(err)
	}
	<-entered
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := s.Stop(ctx); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("first stop: %v", err)
	}
	done := make(chan error, 1)
	go func() { done <- s.Stop(context.Background()) }()
	select {
	case err := <-done:
		t.Fatalf("second stop skipped running job: %v", err)
	case <-time.After(20 * time.Millisecond):
	}
	close(release)
	if err := <-done; err != nil {
		t.Fatal(err)
	}
	rs := runs(t, db, "busy-test", "job")
	if len(rs) != 1 || rs[0].status != StatusFailed {
		t.Fatalf("shutdown result was not persisted: %+v", rs)
	}
}
