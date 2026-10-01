package locklease

import (
	"context"
	"errors"
	"time"
)

type Lock interface {
	Until() time.Time
	Extend(context.Context) (bool, error)
}

// ErrLockLost is the cause of a KeepLock context cancelled because the lock
// was lost (see context.Cause).
var ErrLockLost = errors.New("lock lost")

// KeepLock extends lk in the background for as long as ctx lives and returns
// a context that is cancelled with ErrLockLost as soon as lk is lost: Extend
// reports it is no longer held, or Until passes without a successful extend
// (Redis stopped answering). Run the guarded work with the returned context
// and call stop when it is done, before releasing lk.
//
// lk must be held: a Lock with a zero Until (not taken, or resumed and not
// extended yet) counts as lost right away.
//
// Renewal ends with ctx, never later. A holder stuck past its own deadline
// therefore stops extending and the lock lapses one ttl after ctx ends,
// which is what keeps a wedged node from holding a lock forever: give ctx a
// deadline that bounds the work.
//
// Being cancelled is all the protection KeepLock gives. The lock is not
// fenced, so work that does not watch the context - or that is already
// committed to a side effect when it fires - can still overlap the next
// holder by a little.
func KeepLock(ctx context.Context, lk Lock) (context.Context, context.CancelFunc) {
	lctx, cancel := context.WithCancelCause(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		t := time.NewTimer(time.Hour)
		defer t.Stop()
		// wait sleeps d, returning false when lctx ends first.
		wait := func(d time.Duration) bool {
			t.Reset(d)
			select {
			case <-lctx.Done():
				return false
			case <-t.C:
				return true
			}
		}
		for {
			until := lk.Until()
			left := time.Until(until)
			if left <= 0 {
				cancel(ErrLockLost)
				return
			}
			// Extend with half the validity left, which leaves the other
			// half for retries when Redis is slow.
			if !wait(left / 2) {
				return
			}
			for {
				// An extend still in flight when the validity runs out is
				// too late whatever it returns: the lock may already be
				// someone else's. Bounding the call by until is what makes
				// "cancelled as soon as Until passes" hold when Redis hangs.
				ectx, ecancel := context.WithDeadline(lctx, until)
				ok, err := lk.Extend(ectx)
				ecancel()
				if ok {
					break
				}
				if lctx.Err() != nil {
					return
				}
				if err == nil {
					cancel(ErrLockLost)
					return
				}
				// Unknown outcome: retry while the lock is still ours, but
				// never sleep past its validity.
				left := time.Until(until)
				if left <= 0 {
					cancel(ErrLockLost)
					return
				}
				if !wait(min(max(left/4, 50*time.Millisecond), left)) {
					return
				}
				if time.Until(until) <= 0 {
					cancel(ErrLockLost)
					return
				}
			}
		}
	}()
	return lctx, func() {
		cancel(context.Canceled)
		<-done
	}
}
