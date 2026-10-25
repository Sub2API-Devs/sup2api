package engine

import (
	"context"
	"time"
)

// Resources always acquire authority before a CLI slot. In particular, a
// request waiting for authority must never consume a slot needed by the model
// request that already owns that authority. Polling TryLock also lets canceled
// waiters release their upload spool without waiting for a long model turn.
// tryLock is the authority's TryLock, or its TryRLock for a shared hold.
func lockResourceAuthority(ctx context.Context, tryLock func() bool) error {
	return waitLock(ctx, "authority", tryLock)
}

// waitLock takes a lock through tryLock until ctx ends; phase names the wait
// in the resource diagnostics.
func waitLock(ctx context.Context, phase string, tryLock func() bool) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if tryLock() {
		return nil
	}
	resourceWaiting(ctx, phase)
	timer := time.NewTicker(10 * time.Millisecond)
	defer timer.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timer.C:
			if err := ctx.Err(); err != nil {
				return err
			}
			if tryLock() {
				return nil
			}
		}
	}
}

func waitResourceSlot(ctx context.Context, slots chan struct{}) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	select {
	case slots <- struct{}{}:
		return nil
	default:
	}
	resourceWaiting(ctx, "slot")
	select {
	case slots <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Internal context observer gives concurrency tests an exact barrier after a
// failed acquisition. HTTP clients cannot install it. The same event explains
// wait time in enabled resource diagnostics.
type resourceWaitObserverKey struct{}

func resourceWaiting(ctx context.Context, phase string) {
	resourceDiagnostic(ctx).trace("resource_waiting", Object{"for": phase})
	if observe, ok := ctx.Value(resourceWaitObserverKey{}).(func(string)); ok {
		observe(phase)
	}
}
