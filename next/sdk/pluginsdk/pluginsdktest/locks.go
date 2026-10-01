package pluginsdktest

import (
	"context"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// LockTable is the in-memory store behind FakeHost's LockAcquire,
// LockRenew and LockRelease, standing in for the host's Redis. Every
// FakeHost gets its own; point two FakeHosts at the same table (before
// Start) to simulate two nodes competing for one lock:
//
//	hostA, hostB := pluginsdktest.NewFakeHost(), pluginsdktest.NewFakeHost()
//	hostB.Locks = hostA.Locks
//
// The fake serves a single plugin, so names are not prefixed with a plugin
// key; two plugins sharing one table would see each other's locks, which
// the real host never allows.
type LockTable struct {
	mu    sync.Mutex
	locks map[string]lockEntry
	// validity caps the valid_ms reported; see SetValidity.
	validity time.Duration
}

type lockEntry struct {
	token   string
	expires time.Time
}

// NewLockTable returns an empty lock table.
func NewLockTable() *LockTable { return &LockTable{locks: map[string]lockEntry{}} }

// SetValidity caps the valid_ms the fake reports on acquire and renew (0 =
// report the full ttl). The lock itself still expires after its ttl. The
// real host reports a little less than the ttl (a drift margin); a small cap
// makes Lock.Keep renew quickly in tests despite the 1s minimum ttl. A cap
// under a millisecond (e.g. time.Microsecond) reports valid_ms 0, as the
// host does when its Redis answered only after the validity had run out.
func (t *LockTable) SetValidity(d time.Duration) {
	t.mu.Lock()
	t.validity = d
	t.mu.Unlock()
}

// Expire makes the lock lapse now, as if its ttl ran out: its holder's next
// renewal reports it lost and anyone may take it.
func (t *LockTable) Expire(name string) {
	t.mu.Lock()
	delete(t.locks, name)
	t.mu.Unlock()
}

// Held reports whether name is currently held (by anyone).
func (t *LockTable) Held(name string) bool {
	return t.Holder(name) != ""
}

// Holder returns the token name is held with, "" when it is free.
func (t *LockTable) Holder(name string) string {
	t.mu.Lock()
	defer t.mu.Unlock()
	e, _ := t.live(name, time.Now())
	return e.token
}

func (t *LockTable) live(name string, now time.Time) (lockEntry, bool) {
	e, ok := t.locks[name]
	if !ok || !now.Before(e.expires) {
		return lockEntry{}, false
	}
	return e, true
}

func (t *LockTable) validMs(ttl time.Duration) int64 {
	if t.validity > 0 && t.validity < ttl {
		ttl = t.validity
	}
	return ttl.Milliseconds()
}

// acquire stores token as the lock's value, like the host does on Redis. It
// also reproduces the host's behaviour for a reused token: a failed attempt
// is cleaned up with a compare-and-delete on the same token, so acquiring a
// lock already held with that very token releases it and reports "not
// acquired".
func (t *LockTable) acquire(name, token string, ttl time.Duration) *pluginv1.LockAcquireResponse {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()
	if e, held := t.live(name, now); held {
		if e.token == token {
			delete(t.locks, name)
		}
		return &pluginv1.LockAcquireResponse{}
	}
	t.locks[name] = lockEntry{token: token, expires: now.Add(ttl)}
	return &pluginv1.LockAcquireResponse{Acquired: true, ValidMs: t.validMs(ttl)}
}

func (t *LockTable) renew(name, token string, ttl time.Duration) *pluginv1.LockRenewResponse {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()
	e, held := t.live(name, now)
	if !held || e.token != token {
		return &pluginv1.LockRenewResponse{}
	}
	e.expires = now.Add(ttl)
	t.locks[name] = e
	return &pluginv1.LockRenewResponse{Held: true, ValidMs: t.validMs(ttl)}
}

func (t *LockTable) release(name, token string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if e, ok := t.locks[name]; ok && e.token == token {
		delete(t.locks, name)
	}
}

// ---------------------------------------------------------------- HostService

// SetLockErr sets LockErr while the plugin may be calling (nil clears it).
func (f *FakeHost) SetLockErr(err error) {
	f.mu.Lock()
	f.LockErr = err
	f.mu.Unlock()
}

// SetLockAcquireLostReply sets LockAcquireLostReply while the plugin may be
// calling (nil clears it).
func (f *FakeHost) SetLockAcquireLostReply(err error) {
	f.mu.Lock()
	f.LockAcquireLostReply = err
	f.mu.Unlock()
}

// lockCheck applies FakeHost.LockErr and the host's validation (ttlMs == nil
// for LockRelease, which has no ttl) in the host's order, and returns the
// table to use. The host checks the "lock" grant first, then name, ttl and
// token, then whether locks are available at all (Redis errors come later
// still). So a PERMISSION_DENIED LockErr wins over invalid arguments, and
// any other LockErr (UNAVAILABLE, ...) only answers valid requests.
func (f *FakeHost) lockCheck(name string, ttlMs *int64, token string) (*LockTable, error) {
	f.mu.Lock()
	lockErr := f.LockErr
	f.mu.Unlock()
	if lockErr != nil && status.Code(lockErr) == codes.PermissionDenied {
		return nil, lockErr
	}
	if !protocol.ValidLockName(name) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid lock name %q", name)
	}
	if ttlMs != nil {
		if _, ok := protocol.LockTTLFromMs(*ttlMs); !ok {
			return nil, status.Errorf(codes.InvalidArgument, "lock ttl_ms %d out of range 1000..300000", *ttlMs)
		}
	}
	if !protocol.ValidLockToken(token) {
		return nil, status.Errorf(codes.InvalidArgument, "lock token must match %s", protocol.LockTokenPattern)
	}
	if lockErr != nil {
		return nil, lockErr
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.Locks == nil {
		f.Locks = NewLockTable()
	}
	return f.Locks, nil
}

func (f *FakeHost) LockAcquire(_ context.Context, in *pluginv1.LockAcquireRequest) (*pluginv1.LockAcquireResponse, error) {
	ttlMs := in.GetTtlMs()
	t, err := f.lockCheck(in.GetName(), &ttlMs, in.GetToken())
	if err != nil {
		return nil, err
	}
	r := t.acquire(in.GetName(), in.GetToken(), time.Duration(ttlMs)*time.Millisecond)
	f.mu.Lock()
	lost := f.LockAcquireLostReply
	f.mu.Unlock()
	if lost != nil {
		return nil, lost
	}
	return r, nil
}

func (f *FakeHost) LockRenew(_ context.Context, in *pluginv1.LockRenewRequest) (*pluginv1.LockRenewResponse, error) {
	ttlMs := in.GetTtlMs()
	t, err := f.lockCheck(in.GetName(), &ttlMs, in.GetToken())
	if err != nil {
		return nil, err
	}
	return t.renew(in.GetName(), in.GetToken(), time.Duration(ttlMs)*time.Millisecond), nil
}

func (f *FakeHost) LockRelease(_ context.Context, in *pluginv1.LockReleaseRequest) (*pluginv1.LockReleaseResponse, error) {
	t, err := f.lockCheck(in.GetName(), nil, in.GetToken())
	if err != nil {
		return nil, err
	}
	t.release(in.GetName(), in.GetToken())
	return &pluginv1.LockReleaseResponse{}, nil
}
