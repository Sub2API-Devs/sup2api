package core_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

const keepTTL = 200 * time.Millisecond

func takeLock(t *testing.T, l *testutil.MemLocker, key string) core.Lock {
	t.Helper()
	lk, ok, err := l.TryLock(context.Background(), key, keepTTL)
	if err != nil || !ok {
		t.Fatalf("lock: ok=%v err=%v", ok, err)
	}
	return lk
}

func waitDone(t *testing.T, ctx context.Context, d time.Duration) {
	t.Helper()
	select {
	case <-ctx.Done():
	case <-time.After(d):
		t.Fatalf("context still alive after %v", d)
	}
}

func TestKeepLockOutlivesTheTTL(t *testing.T) {
	l := testutil.NewMemLocker()
	lk := takeLock(t, l, "k")
	ctx, stop := core.KeepLock(context.Background(), lk)
	defer stop()

	for range 5 {
		time.Sleep(keepTTL)
		if ctx.Err() != nil {
			t.Fatalf("context ended while the lock was kept: %v", context.Cause(ctx))
		}
		if h := l.Holder("k"); h != lk.Token() {
			t.Fatalf("holder = %q, want %q: the lock lapsed", h, lk.Token())
		}
	}
}

func TestKeepLockLost(t *testing.T) {
	l := testutil.NewMemLocker()
	lk := takeLock(t, l, "k")
	ctx, stop := core.KeepLock(context.Background(), lk)
	defer stop()

	l.Expire("k")
	// The loss shows at the next extend, at most half a ttl away.
	waitDone(t, ctx, keepTTL)
	if cause := context.Cause(ctx); !errors.Is(cause, core.ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
	// Someone else may hold it now; the old holder must not touch it.
	other := takeLock(t, l, "k")
	time.Sleep(keepTTL / 2)
	if h := l.Holder("k"); h != other.Token() {
		t.Fatalf("holder = %q, want the new owner %q", h, other.Token())
	}
}

func TestKeepLockStop(t *testing.T) {
	l := testutil.NewMemLocker()
	lk := takeLock(t, l, "k")
	ctx, stop := core.KeepLock(context.Background(), lk)

	time.Sleep(keepTTL / 4)
	start := time.Now()
	stop()
	if d := time.Since(start); d > 50*time.Millisecond {
		t.Fatalf("stop took %v", d)
	}
	if ctx.Err() == nil {
		t.Fatal("stop did not cancel the context")
	}
	if cause := context.Cause(ctx); errors.Is(cause, core.ErrLockLost) {
		t.Fatal("a stopped context must not report a lost lock")
	}
	stop() // idempotent

	// stop does not release, and nothing extends any more.
	if h := l.Holder("k"); h != lk.Token() {
		t.Fatalf("holder = %q right after stop", h)
	}
	time.Sleep(keepTTL + 50*time.Millisecond)
	if h := l.Holder("k"); h != "" {
		t.Fatalf("lock still held (%q) after stop: renewal went on", h)
	}
}

// Renewal ends with the parent context, so a holder stuck past its own
// deadline lets the lock lapse.
func TestKeepLockEndsWithParent(t *testing.T) {
	l := testutil.NewMemLocker()
	lk := takeLock(t, l, "k")
	parent, cancel := context.WithTimeout(context.Background(), keepTTL)
	defer cancel()
	ctx, stop := core.KeepLock(parent, lk)
	defer stop()

	waitDone(t, ctx, 2*keepTTL)
	if cause := context.Cause(ctx); !errors.Is(cause, context.DeadlineExceeded) {
		t.Fatalf("cause = %v, want the parent's", cause)
	}
	// An extend racing the deadline may have pushed the expiry one more ttl.
	time.Sleep(2 * keepTTL)
	if h := l.Holder("k"); h != "" {
		t.Fatalf("lock still held (%q) after the parent ended", h)
	}
}

func TestKeepLockNotHeld(t *testing.T) {
	l := testutil.NewMemLocker()
	takeLock(t, l, "k")
	lk, ok, _ := l.TryLock(context.Background(), "k", keepTTL) // contended
	if ok {
		t.Fatal("second lock")
	}
	ctx, stop := core.KeepLock(context.Background(), lk)
	defer stop()
	waitDone(t, ctx, 50*time.Millisecond)
	if cause := context.Cause(ctx); !errors.Is(cause, core.ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
}

// hungLock is held until `until`, and its Extend hangs until its context
// ends - Redis stopped answering.
type hungLock struct {
	until time.Time
	calls chan struct{}
}

func (h *hungLock) Token() string    { return "t" }
func (h *hungLock) Until() time.Time { return h.until }
func (h *hungLock) Release()         {}
func (h *hungLock) Extend(ctx context.Context) (bool, error) {
	select {
	case h.calls <- struct{}{}:
	default:
	}
	<-ctx.Done()
	return false, ctx.Err()
}

// An extend that gets no answer is an unknown outcome, retried - but only
// while the lock is still valid. Once Until passes the context ends, even
// with an extend still in flight.
func TestKeepLockUnknownOutcomeEndsAtUntil(t *testing.T) {
	lk := &hungLock{until: time.Now().Add(keepTTL), calls: make(chan struct{}, 1)}
	ctx, stop := core.KeepLock(context.Background(), lk)
	defer stop()

	select {
	case <-lk.calls:
	case <-time.After(keepTTL):
		t.Fatal("no extend attempted")
	}
	waitDone(t, ctx, time.Until(lk.until)+50*time.Millisecond)
	if cause := context.Cause(ctx); !errors.Is(cause, core.ErrLockLost) {
		t.Fatalf("cause = %v, want ErrLockLost", cause)
	}
	if late := time.Since(lk.until); late > 50*time.Millisecond {
		t.Fatalf("lost lock noticed %v after Until", late)
	}
}

// flakyLock fails its first extends with an error, then succeeds.
type flakyLock struct {
	ttl   time.Duration
	fails int
	until time.Time
}

func (f *flakyLock) Token() string    { return "t" }
func (f *flakyLock) Until() time.Time { return f.until }
func (f *flakyLock) Release()         {}
func (f *flakyLock) Extend(context.Context) (bool, error) {
	if f.fails > 0 {
		f.fails--
		return false, errors.New("redis: i/o timeout")
	}
	f.until = time.Now().Add(f.ttl)
	return true, nil
}

// A transient error is retried, not taken for a loss.
func TestKeepLockRetriesUnknownOutcome(t *testing.T) {
	lk := &flakyLock{ttl: 400 * time.Millisecond, fails: 2, until: time.Now().Add(400 * time.Millisecond)}
	ctx, stop := core.KeepLock(context.Background(), lk)
	time.Sleep(time.Second)
	if ctx.Err() != nil {
		t.Fatalf("context ended after transient extend errors: %v", context.Cause(ctx))
	}
	stop()
}
