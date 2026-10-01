package cluster

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-redsync/redsync/v4"
	"github.com/go-redsync/redsync/v4/redis/goredis/v9"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Locker implements core.TokenLocker with redsync. Redis is a single
// instance (see the package doc), so the Redlock quorum is one: SET NX PX
// with a random owner token, a compare-and-delete release and a
// compare-and-PEXPIRE extend.
//
// There is deliberately no fallback. The former one took a PostgreSQL
// advisory lock when Redis returned an error, but that is a second lock
// namespace: a node whose own Redis connection failed would take the PG lock
// while another node still held the Redis one, and both would run. A node
// that cannot reach Redis cannot serve the gateway either (slots fail
// closed), so it simply takes no locks.
//
// Extend does not re-create a lock whose key vanished (no WithSetNXOnExtend):
// Redis runs without persistence, and a key lost to a restart means another
// node may have held the lock in between. That is reported as lost, not
// papered over.
type Locker struct {
	rs  *redsync.Redsync
	log *slog.Logger
}

var _ core.TokenLocker = (*Locker)(nil)

// NewLocker builds a locker on rdb.
func NewLocker(rdb redis.UniversalClient, logger *slog.Logger) *Locker {
	return &Locker{rs: redsync.New(goredis.NewPool(rdb)), log: orDefault(logger)}
}

// TryLock implements core.Locker.
func (l *Locker) TryLock(ctx context.Context, key string, ttl time.Duration) (core.Lock, bool, error) {
	if ttl <= 0 {
		return noLock{}, false, errors.New("cluster: lock ttl must be positive")
	}
	return l.try(ctx, l.mutex(key, ttl), ttl)
}

// TryLockToken implements core.TokenLocker. The token becomes the value
// SET NX writes. It goes in through WithGenValueFunc: WithValue only sets the
// handle's value for Extend/Unlock, lockContext ignores it and generates a
// value of its own.
func (l *Locker) TryLockToken(ctx context.Context, key, token string, ttl time.Duration) (core.Lock, bool, error) {
	if ttl <= 0 {
		return noLock{}, false, errors.New("cluster: lock ttl must be positive")
	}
	if token == "" {
		return noLock{}, false, errors.New("cluster: lock token must not be empty")
	}
	return l.try(ctx, l.mutex(key, ttl, redsync.WithGenValueFunc(func() (string, error) { return token, nil })), ttl)
}

func (l *Locker) try(ctx context.Context, m *redsync.Mutex, ttl time.Duration) (core.Lock, bool, error) {
	err := m.TryLockContext(ctx)
	if err == nil {
		lk := &lock{m: m, ttl: ttl, log: l.log}
		lk.until.Store(m.Until().UnixNano())
		return lk, true, nil
	}
	if taken(err) {
		return noLock{}, false, nil
	}
	// redsync.ErrFailed here means the lock was taken but Redis answered so
	// slowly that it had nearly expired, so it was given back: an error.
	return noLock{}, false, err
}

// Resume implements core.TokenLocker.
func (l *Locker) Resume(key, token string, ttl time.Duration) core.Lock {
	if token == "" || ttl <= 0 {
		return noLock{}
	}
	return &lock{m: l.mutex(key, ttl, redsync.WithValue(token)), ttl: ttl, log: l.log}
}

// releaseTimeout bounds ReleaseToken and Lock.Release.
const releaseTimeout = 3 * time.Second

// ReleaseToken implements core.TokenLocker.
func (l *Locker) ReleaseToken(ctx context.Context, key, token string) error {
	if token == "" {
		return nil // nothing is ever held with an empty token
	}
	// The expiry is irrelevant to an unlock; it only has to be valid.
	m := l.mutex(key, time.Minute, redsync.WithValue(token))
	ctx, cancel := context.WithTimeout(ctx, releaseTimeout)
	defer cancel()
	if _, err := m.UnlockContext(ctx); err != nil && !taken(err) && !errors.Is(err, redsync.ErrLockAlreadyExpired) {
		return err
	}
	return nil
}

func (l *Locker) mutex(key string, ttl time.Duration, extra ...redsync.Option) *redsync.Mutex {
	return l.rs.NewMutex(keyLockPrefix+key, append([]redsync.Option{
		redsync.WithExpiry(ttl),
		redsync.WithTimeoutFactor(timeoutFactor(ttl)),
	}, extra...)...)
}

// timeoutFactor bounds each Redis call to a fraction of ttl (redsync's
// default 5%), but never below 500 ms or above half the ttl: 5% of a short
// lock is too little for a busy Redis.
func timeoutFactor(ttl time.Duration) float64 {
	return min(max(0.05, float64(500*time.Millisecond)/float64(ttl)), 0.5)
}

func callTimeout(ttl time.Duration) time.Duration {
	return time.Duration(float64(ttl) * timeoutFactor(ttl))
}

// taken reports whether err says the lock is held with another token - or,
// for Extend, by nobody: the touch script answers 0 for both, and redsync
// turns every 0 into *ErrTaken, so a vanished key is a definite loss, not an
// unknown outcome. Unlock is different: it reports a missing key as
// ErrLockAlreadyExpired (checked separately in Release).
func taken(err error) bool {
	var t *redsync.ErrTaken
	return errors.As(err, &t)
}

// lock serialises the calls on its redsync.Mutex, which is not safe for
// concurrent use (KeepLock extends from its own goroutine).
type lock struct {
	mu    sync.Mutex
	m     *redsync.Mutex
	ttl   time.Duration
	done  bool
	until atomic.Int64 // unix nanos, 0 = not held
	log   *slog.Logger
}

// Token needs no mutex: the value is set before the lock is handed out.
func (k *lock) Token() string { return k.m.Value() }

func (k *lock) Until() time.Time {
	if n := k.until.Load(); n != 0 {
		return time.Unix(0, n)
	}
	return time.Time{}
}

func (k *lock) Extend(ctx context.Context) (bool, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.done {
		return false, nil
	}
	ctx, cancel := context.WithTimeout(ctx, callTimeout(k.ttl))
	defer cancel()
	ok, err := k.m.ExtendContext(ctx)
	if ok {
		k.until.Store(k.m.Until().UnixNano())
		return true, nil
	}
	if taken(err) {
		k.until.Store(0)
		return false, nil
	}
	if err == nil {
		err = redsync.ErrExtendFailed
	}
	return false, err
}

func (k *lock) Release() {
	k.mu.Lock()
	defer k.mu.Unlock()
	if k.done {
		return
	}
	k.done = true
	k.until.Store(0)
	ctx, cancel := context.WithTimeout(context.Background(), releaseTimeout)
	defer cancel()
	if _, err := k.m.UnlockContext(ctx); err != nil && !taken(err) && !errors.Is(err, redsync.ErrLockAlreadyExpired) {
		// The key expires on its own.
		k.log.Warn("lock release failed", "key", k.m.Name(), "err", err)
	}
}

// noLock is the Lock of a failed TryLock.
type noLock struct{}

func (noLock) Token() string                        { return "" }
func (noLock) Until() time.Time                     { return time.Time{} }
func (noLock) Extend(context.Context) (bool, error) { return false, nil }
func (noLock) Release()                             {}
