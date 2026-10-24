package locklease

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// fakeLock is a Lock whose validity and Extend outcome the test controls.
type fakeLock struct {
	mu      sync.Mutex
	until   time.Time
	extend  func(context.Context) (bool, error)
	extends int
}

func (f *fakeLock) Until() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.until
}

func (f *fakeLock) Extend(ctx context.Context) (bool, error) {
	f.mu.Lock()
	f.extends++
	extend := f.extend
	f.mu.Unlock()
	return extend(ctx)
}

func (f *fakeLock) count() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.extends
}

// waitCause waits for ctx to be cancelled and returns its cause.
func waitCause(t *testing.T, ctx context.Context) error {
	t.Helper()
	select {
	case <-ctx.Done():
		return context.Cause(ctx)
	case <-time.After(5 * time.Second):
		t.Fatal("context was not cancelled")
		return nil
	}
}

func TestKeepLockExtendsWhileHeld(t *testing.T) {
	lk := &fakeLock{until: time.Now().Add(200 * time.Millisecond)}
	lk.extend = func(context.Context) (bool, error) {
		lk.mu.Lock()
		// Each successful extend grants a new, short window.
		lk.until = time.Now().Add(200 * time.Millisecond)
		lk.mu.Unlock()
		return true, nil
	}
	parent, cancelParent := context.WithCancel(context.Background())
	ctx, stop := KeepLock(parent, lk)
	time.Sleep(450 * time.Millisecond)
	if lk.count() < 2 {
		t.Fatalf("expected repeated renewals, got %d", lk.count())
	}
	select {
	case <-ctx.Done():
		t.Fatalf("context cancelled while the lock was held: %v", context.Cause(ctx))
	default:
	}
	cancelParent()
	stop()
}

func TestKeepLockLosesLockWhenExtendReportsNotHeld(t *testing.T) {
	lk := &fakeLock{until: time.Now().Add(100 * time.Millisecond)}
	lk.extend = func(context.Context) (bool, error) { return false, nil }
	ctx, stop := KeepLock(context.Background(), lk)
	defer stop()
	if cause := waitCause(t, ctx); !errors.Is(cause, ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
}

func TestKeepLockZeroUntilIsLostImmediately(t *testing.T) {
	lk := &fakeLock{extend: func(context.Context) (bool, error) {
		t.Error("Extend must not be called for a lock with no validity")
		return true, nil
	}}
	ctx, stop := KeepLock(context.Background(), lk)
	defer stop()
	if cause := waitCause(t, ctx); !errors.Is(cause, ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
}

func TestKeepLockStopsRenewingAfterContextEnds(t *testing.T) {
	lk := &fakeLock{until: time.Now().Add(100 * time.Millisecond)}
	lk.extend = func(context.Context) (bool, error) {
		lk.mu.Lock()
		lk.until = time.Now().Add(100 * time.Millisecond)
		lk.mu.Unlock()
		return true, nil
	}
	parent, cancelParent := context.WithCancel(context.Background())
	ctx, stop := KeepLock(parent, lk)
	time.Sleep(250 * time.Millisecond)
	cancelParent()
	stop()
	// stop waits for the renewing goroutine, so the count is stable here.
	after := lk.count()
	time.Sleep(250 * time.Millisecond)
	if got := lk.count(); got != after {
		t.Fatalf("renewed %d more times after stop", got-after)
	}
	select {
	case <-ctx.Done():
	default:
		t.Fatal("returned context must be cancelled once the parent ends")
	}
}

func TestKeepLockRetriesTransientExtendErrors(t *testing.T) {
	lk := &fakeLock{until: time.Now().Add(400 * time.Millisecond)}
	var fails int
	lk.extend = func(context.Context) (bool, error) {
		lk.mu.Lock()
		defer lk.mu.Unlock()
		if fails < 2 {
			fails++
			return false, errors.New("redis timeout")
		}
		lk.until = time.Now().Add(400 * time.Millisecond)
		return true, nil
	}
	parent, cancelParent := context.WithCancel(context.Background())
	ctx, stop := KeepLock(parent, lk)
	time.Sleep(600 * time.Millisecond)
	if cause := context.Cause(ctx); cause != nil {
		t.Fatalf("lock lost on recoverable errors: %v", cause)
	}
	if lk.count() < 3 {
		t.Fatalf("expected retries, got %d extends", lk.count())
	}
	cancelParent()
	stop()
}
