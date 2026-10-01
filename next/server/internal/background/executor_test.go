package background

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestAdmissionRevokedWhileWaitingForCapacity(t *testing.T) {
	var admitted atomic.Bool
	admitted.Store(true)
	e := New(1)
	e.Admitted = admitted.Load
	g := e.Group(context.Background(), 2, 2)
	first, err := g.Acquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	waiting := make(chan error, 1)
	go func() {
		p, err := g.Acquire(context.Background())
		if p != nil {
			p.Release()
		}
		waiting <- err
	}()
	admitted.Store(false)
	first.Release()
	if err := <-waiting; !errors.Is(err, ErrClosed) {
		t.Fatalf("waiting work escaped revoked admission: %v", err)
	}
	if e.Active() != 0 {
		t.Fatal("capacity leak")
	}
}

func TestSharedCapacityGroupIsolationAndRepeatedClose(t *testing.T) {
	e := New(2)
	a, b := e.Group(context.Background(), 1, 2), e.Group(context.Background(), 1, 2)
	pa, err := a.TryAcquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	pb, err := b.TryAcquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if _, err := a.TryAcquire(context.Background()); !errors.Is(err, ErrBusy) {
		t.Fatalf("capacity: %v", err)
	}
	started, release := make(chan struct{}), make(chan struct{})
	go pa.Run(context.Background(), Work{}, func(ctx context.Context) error { close(started); <-ctx.Done(); <-release; return nil })
	<-started
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if err := a.Close(ctx); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("first close: %v", err)
	}
	closed := make(chan struct{})
	go func() { _ = a.Close(context.Background()); close(closed) }()
	select {
	case <-closed:
		t.Fatal("second close skipped running callback")
	case <-time.After(20 * time.Millisecond):
	}
	if b.ctx.Err() != nil {
		t.Fatal("closing one group canceled another")
	}
	if _, err := a.TryAcquire(context.Background()); !errors.Is(err, ErrClosed) {
		t.Fatalf("late admission: %v", err)
	}
	close(release)
	<-closed
	pb.Release()
	if err := b.Close(context.Background()); err != nil {
		t.Fatal(err)
	}
}

func TestQueuedWorkCanceledBeforeCallback(t *testing.T) {
	e := New(1)
	a, b := e.Group(context.Background(), 1, 1), e.Group(context.Background(), 1, 1)
	p, err := a.TryAcquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	defer p.Release()
	var called atomic.Bool
	if err := b.Submit(context.Background(), Work{}, func(context.Context) error { called.Store(true); return nil }); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := b.Close(ctx); err != nil {
		t.Fatal(err)
	}
	if called.Load() {
		t.Fatal("queued callback ran without a global slot")
	}
	// The canceled waiter returned its per-group and pending admission tokens.
	if len(b.slots) != 0 || len(b.pending) != 0 {
		t.Fatal("canceled admission leaked capacity")
	}
}

func TestGroupBudgetAndAcceptedPreparationAreJoined(t *testing.T) {
	g := New(1).Group(context.Background(), 1, 0)
	p, err := g.TryAcquire(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	prep, cancelPrep := p.Context(context.Background())
	defer cancelPrep()
	closed := make(chan struct{})
	go func() { _ = g.Close(context.Background()); close(closed) }()
	<-prep.Done()
	select {
	case <-closed:
		t.Fatal("preparation was not joined")
	default:
	}
	p.Release()
	<-closed
	g = New(1).Group(context.Background(), 1, 0)
	err = g.Run(context.Background(), Work{Timeout: 10 * time.Millisecond}, func(ctx context.Context) error { <-ctx.Done(); return nil })
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("budget: %v", err)
	}
	_ = g.Close(context.Background())
}

type expiredLock struct{ released atomic.Bool }

func (*expiredLock) Until() time.Time                     { return time.Now().Add(-time.Second) }
func (*expiredLock) Extend(context.Context) (bool, error) { return false, nil }
func (l *expiredLock) Release()                           { l.released.Store(true) }
func (*expiredLock) Token() string                        { return "expired" }

func TestExpiredLeaseNeverStartsWork(t *testing.T) {
	for _, retain := range []bool{false, true} {
		lk := &expiredLock{}
		called := false
		err := Scope(context.Background(), Work{Timeout: time.Second, Lease: lk, RetainLease: retain}, func(context.Context) error { called = true; return nil })
		if !errors.Is(err, core.ErrLockLost) || called || lk.released.Load() == retain {
			t.Fatalf("retain=%v err=%v called=%v released=%v", retain, err, called, lk.released.Load())
		}
	}
}
