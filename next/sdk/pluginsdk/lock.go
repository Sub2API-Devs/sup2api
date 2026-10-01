package pluginsdk

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// Cluster locks (host permission "lock").
//
// Host.Locks gives a plugin short mutual exclusion across the nodes of a
// cluster, on the host's Redis. The host namespaces every name per plugin
// (lock:plugin:{plugin_key}:{name}), so plugins never see each other's
// locks.
//
// Reach for a lock only when work must not overlap across nodes and is not
// periodic: periodic work belongs in manifest jobs[], which the host runs
// once per trigger for the whole cluster.
//
// The locks are NOT fenced. A holder that stalls (GC pause, blocked I/O)
// past Lock.Until may find another node took the lock meanwhile and neither
// side can tell, so the guarded work must still be idempotent; the lock only
// makes overlap rare. The host keeps no state per lock: when the plugin
// process dies its locks lapse after their ttl.

const (
	// MinLockTTL and MaxLockTTL bound the ttl of a lock (1s..5m), the same
	// range the host enforces.
	MinLockTTL = protocol.LockMinTTL
	MaxLockTTL = protocol.LockMaxTTL
)

// ErrLockLost is the context.Cause of a context cancelled because its lock
// was lost (Lock.Keep, Locks.WithLock).
var ErrLockLost = errors.New("pluginsdk: lock lost")

// ValidLockName reports whether name matches ^[A-Za-z0-9._:/-]{1,128}$.
func ValidLockName(name string) bool { return protocol.ValidLockName(name) }

// Locks takes cluster-wide locks (grant "lock"). Names must match
// ^[A-Za-z0-9._:/-]{1,128}$ and ttl must be MinLockTTL..MaxLockTTL; anything
// else fails with codes.InvalidArgument before a request is sent. Host
// errors: codes.PermissionDenied without the grant, codes.Unavailable when
// Redis is down or the outcome is unknown (retry later).
type Locks interface {
	// TryAcquire makes one attempt to take the lock, without waiting.
	// ok=false with a nil error means another holder has it, or - rarely -
	// that the host took it but its validity had already run out by the time
	// the answer arrived (Until would be in the past); TryAcquire then gives
	// it back the same best-effort way as below. Either way, try again later.
	//
	// Every attempt uses a fresh random owner token, generated here. When the
	// outcome is unknown (an error other than InvalidArgument,
	// PermissionDenied or Unimplemented - e.g. Unavailable, or ctx ending
	// while the request was in flight) the lock may have been taken
	// regardless, so TryAcquire makes one best-effort LockRelease with that
	// token (bounded to a few seconds, its error ignored) before returning
	// the original error. That keeps an unknown outcome from blocking the
	// other nodes until the ttl runs out, except in the rare case where the
	// release reaches Redis before the acquire it undoes.
	TryAcquire(ctx context.Context, name string, ttl time.Duration) (lock *Lock, ok bool, err error)
	// WithLock takes the lock, runs fn under it while renewing it in the
	// background (Lock.Keep), then releases it. If the lock is lost while fn
	// runs, fn's ctx is cancelled with context.Cause ErrLockLost - fn should
	// stop as soon as it notices. When another holder has the lock, fn does
	// not run and WithLock returns ran=false, err=nil.
	//
	// When fn ran, err is fn's error; if fn returned nil although the lock
	// was lost while it ran, err is ErrLockLost (fn may have overlapped with
	// another holder). Renewal lives only as long as ctx: give ctx a
	// deadline that bounds the work.
	WithLock(ctx context.Context, name string, ttl time.Duration, fn func(ctx context.Context) error) (ran bool, err error)
}

// Lock is one lock taken by Locks.TryAcquire. It is safe for concurrent use:
// Keep's goroutine and the caller's Release may run at the same time.
type Lock struct {
	c    pluginv1.HostServiceClient
	name string
	ttl  time.Duration

	mu    sync.Mutex
	token string
	until time.Time
	// lost: the host said the lock is no longer ours. gone: Release was
	// called. Either way the lock is never renewed again.
	lost, gone bool
	released   bool // the host confirmed the release
}

// Name is the name the lock was taken under (without the host's prefix).
func (l *Lock) Name() string { return l.name }

// Until is when this process stops considering itself the holder, on the
// local clock: the validity the host reported, counted from just BEFORE the
// request was sent, so it errs on the early side. Zero once the lock is
// known to be lost or has been released.
func (l *Lock) Until() time.Time {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.until
}

// Renew extends the lock to its ttl from now. (false, nil) means the lock is
// definitely lost - expired, taken by someone else, or released - and it
// stays lost: later calls answer the same without asking the host. An error
// means the outcome is unknown; the lock is still ours until Until, and
// Renew may be retried.
func (l *Lock) Renew(ctx context.Context) (bool, error) {
	l.mu.Lock()
	if l.lost || l.gone {
		l.mu.Unlock()
		return false, nil
	}
	token := l.token
	l.mu.Unlock()

	start := time.Now()
	r, err := l.c.LockRenew(ctx, &pluginv1.LockRenewRequest{Name: l.name, Token: token, TtlMs: l.ttl.Milliseconds()})
	if err != nil {
		return false, err
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.gone {
		// Released while the renewal was in flight: the release wins.
		return false, nil
	}
	if !r.GetHeld() {
		l.lost, l.until = true, time.Time{}
		return false, nil
	}
	l.until = start.Add(time.Duration(r.GetValidMs()) * time.Millisecond)
	return true, nil
}

// Release gives the lock up if it is still held with this lock's token. It
// is idempotent: releasing a lost or already released lock returns nil.
// From the first call on the lock is no longer renewed (a running Keep
// cancels its context with ErrLockLost at its next renewal). An error means
// the host could not confirm the release; the lock then lapses after its
// ttl, or call Release again.
func (l *Lock) Release(ctx context.Context) error {
	l.mu.Lock()
	l.gone, l.until = true, time.Time{}
	if l.released {
		l.mu.Unlock()
		return nil
	}
	token := l.token
	l.mu.Unlock()

	if _, err := l.c.LockRelease(ctx, &pluginv1.LockReleaseRequest{Name: l.name, Token: token}); err != nil {
		return err
	}
	l.mu.Lock()
	l.released = true
	l.mu.Unlock()
	return nil
}

// Keep renews the lock in the background for as long as ctx lives and
// returns a context that is cancelled with ErrLockLost (see context.Cause)
// as soon as the lock is lost: Renew reports it gone, or Until passes
// without a successful renewal (the host stopped answering). Run the guarded
// work with the returned context and call stop when it is done, before
// Release.
//
// It renews when half of the validity is left; a renewal with an unknown
// outcome is retried while the lock is still valid. Renewal ends with ctx,
// never later: a holder stuck past its own deadline stops renewing and the
// lock lapses one ttl after ctx ends, which keeps a wedged process from
// holding a lock forever.
func (l *Lock) Keep(ctx context.Context) (lctx context.Context, stop context.CancelFunc) {
	kctx, cancel := context.WithCancelCause(ctx)
	done := make(chan struct{})
	go func() {
		defer close(done)
		t := time.NewTimer(0)
		defer t.Stop()
		wait := func(d time.Duration) bool {
			t.Reset(d)
			select {
			case <-kctx.Done():
				return false
			case <-t.C:
				return true
			}
		}
		for {
			left := time.Until(l.Until())
			if left <= 0 {
				cancel(ErrLockLost)
				return
			}
			// Renew with half the validity left, which leaves the other half
			// for retries when the host is slow.
			if !wait(left / 2) {
				return
			}
			for {
				ok, err := l.renewWithin(kctx)
				if ok {
					break
				}
				if kctx.Err() != nil {
					return
				}
				if err == nil {
					cancel(ErrLockLost)
					return
				}
				// Unknown outcome: retry while the lock is still ours.
				left := time.Until(l.Until())
				if left <= 0 {
					cancel(ErrLockLost)
					return
				}
				if !wait(min(max(left/4, 50*time.Millisecond), left)) {
					return
				}
			}
		}
	}()
	return kctx, func() {
		cancel(context.Canceled)
		<-done
	}
}

// renewWithin renews with a deadline at Until: a renewal that has not
// answered by then no longer matters, the lock is lost either way.
func (l *Lock) renewWithin(ctx context.Context) (bool, error) {
	until := l.Until()
	if until.IsZero() {
		return l.Renew(ctx) // lost or released: answers without a request
	}
	rctx, cancel := context.WithDeadline(ctx, until)
	defer cancel()
	return l.Renew(rctx)
}

// ---------------------------------------------------------------- implementation

// checkLock validates name and ttl like the host does.
func checkLock(name string, ttl time.Duration) error {
	if !protocol.ValidLockName(name) {
		return status.Errorf(codes.InvalidArgument, "pluginsdk: lock name %q must match %s", name, protocol.LockNamePattern)
	}
	if !protocol.ValidLockTTL(ttl) {
		return status.Errorf(codes.InvalidArgument, "pluginsdk: lock ttl %s must be between %s and %s", ttl, MinLockTTL, MaxLockTTL)
	}
	return nil
}

// newLockToken returns 16 random bytes as unpadded URL-safe base64 (22
// characters, protocol.LockTokenPattern). crypto/rand.Read never fails
// (it crashes the program instead, since Go 1.24).
func newLockToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// acquireSettled reports whether a LockAcquire error proves the lock was not
// taken: the host refused the request before touching Redis.
func acquireSettled(err error) bool {
	switch status.Code(err) {
	case codes.InvalidArgument, codes.PermissionDenied, codes.Unimplemented:
		return true
	}
	return false
}

// lockUndoTimeout bounds the release TryAcquire makes after an acquire with
// an unknown outcome.
const lockUndoTimeout = 2 * time.Second

type hostLocks struct{ h *host }

func (h *host) Locks() Locks { return hostLocks{h} }

func (ls hostLocks) TryAcquire(ctx context.Context, name string, ttl time.Duration) (*Lock, bool, error) {
	if err := checkLock(name, ttl); err != nil {
		return nil, false, err
	}
	c := ls.h.client
	token := newLockToken()
	// undo gives back a lock that may be held with our token although we
	// cannot use it, rather than block the other nodes for a ttl.
	undo := func() {
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), lockUndoTimeout)
		_, _ = c.LockRelease(rctx, &pluginv1.LockReleaseRequest{Name: name, Token: token})
		cancel()
	}
	start := time.Now()
	r, err := c.LockAcquire(ctx, &pluginv1.LockAcquireRequest{Name: name, TtlMs: ttl.Milliseconds(), Token: token})
	if err != nil {
		if !acquireSettled(err) {
			undo() // taken or not, we were not told
		}
		return nil, false, err
	}
	if !r.GetAcquired() {
		return nil, false, nil
	}
	until := start.Add(time.Duration(r.GetValidMs()) * time.Millisecond)
	if !until.After(time.Now()) {
		// Taken, but the validity had run out by the time we heard (valid_ms
		// 0: the host's Redis was slower than the ttl). Such a lock guards
		// nothing; give it back and report it as not acquired.
		undo()
		return nil, false, nil
	}
	return &Lock{c: c, name: name, ttl: ttl, token: token, until: until}, true, nil
}

func (ls hostLocks) WithLock(ctx context.Context, name string, ttl time.Duration, fn func(ctx context.Context) error) (bool, error) {
	l, ok, err := ls.TryAcquire(ctx, name, ttl)
	if err != nil || !ok {
		return false, err
	}
	var lost bool
	defer func() {
		// Release even when ctx is done or fn panicked, bounded so a hung
		// host cannot keep the caller; on failure the lock lapses after ttl.
		rctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer cancel()
		if err := l.Release(rctx); err != nil {
			ls.h.logger.Warn("pluginsdk: release lock", "lock", name, "error", err.Error())
		}
	}()
	kctx, stop := l.Keep(ctx)
	func() {
		defer stop()
		err = fn(kctx)
		lost = errors.Is(context.Cause(kctx), ErrLockLost)
	}()
	if err == nil && lost {
		err = ErrLockLost
	}
	return true, err
}
