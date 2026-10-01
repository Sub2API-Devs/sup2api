package testutil

import (
	"context"
	"errors"
	"strconv"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// MemLocker is an in-memory core.TokenLocker with the semantics of
// cluster.Locker: one attempt, owner tokens, expiry, compare-and-extend and
// compare-and-delete. Share one instance between "nodes" to simulate a
// cluster.
type MemLocker struct {
	mu    sync.Mutex
	locks map[string]memLock
	seq   int
}

type memLock struct {
	token   string
	expires time.Time
}

var _ core.TokenLocker = (*MemLocker)(nil)

// NewMemLocker returns an empty locker.
func NewMemLocker() *MemLocker { return &MemLocker{locks: map[string]memLock{}} }

// TryLock implements core.Locker.
func (l *MemLocker) TryLock(ctx context.Context, key string, ttl time.Duration) (core.Lock, bool, error) {
	l.mu.Lock()
	l.seq++
	tok := "mem-token-" + strconv.Itoa(l.seq)
	l.mu.Unlock()
	return l.TryLockToken(ctx, key, tok, ttl)
}

// TryLockToken implements core.TokenLocker, including the cluster locker's
// behaviour for a reused token: an attempt on a lock already held with the
// same token fails and deletes it (redsync's cleanup of a failed attempt).
func (l *MemLocker) TryLockToken(_ context.Context, key, token string, ttl time.Duration) (core.Lock, bool, error) {
	if ttl <= 0 {
		return &memHandle{}, false, errors.New("testutil: lock ttl must be positive")
	}
	if token == "" {
		return &memHandle{}, false, errors.New("testutil: lock token must not be empty")
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	if cur, ok := l.locks[key]; ok && now.Before(cur.expires) {
		if cur.token == token {
			delete(l.locks, key)
		}
		return &memHandle{}, false, nil
	}
	l.locks[key] = memLock{token: token, expires: now.Add(ttl)}
	return &memHandle{l: l, key: key, token: token, ttl: ttl, until: now.Add(ttl)}, true, nil
}

// Resume implements core.TokenLocker.
func (l *MemLocker) Resume(key, token string, ttl time.Duration) core.Lock {
	if token == "" || ttl <= 0 {
		return &memHandle{}
	}
	return &memHandle{l: l, key: key, token: token, ttl: ttl}
}

// ReleaseToken implements core.TokenLocker.
func (l *MemLocker) ReleaseToken(_ context.Context, key, token string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if cur, ok := l.locks[key]; ok && token != "" && cur.token == token {
		delete(l.locks, key)
	}
	return nil
}

// Holder returns the token holding key, "" when it is free.
func (l *MemLocker) Holder(key string) string {
	l.mu.Lock()
	defer l.mu.Unlock()
	if cur, ok := l.locks[key]; ok && time.Now().Before(cur.expires) {
		return cur.token
	}
	return ""
}

// Expire drops key as if its ttl had passed; the holder is not told.
func (l *MemLocker) Expire(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.locks, key)
}

type memHandle struct {
	l     *MemLocker // nil: not held
	key   string
	token string
	ttl   time.Duration

	mu    sync.Mutex
	until time.Time
	done  bool
}

func (h *memHandle) Token() string { return h.token }

func (h *memHandle) Until() time.Time {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.until
}

func (h *memHandle) Extend(context.Context) (bool, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.l == nil || h.done {
		return false, nil
	}
	h.l.mu.Lock()
	defer h.l.mu.Unlock()
	now := time.Now()
	if cur, ok := h.l.locks[h.key]; ok && cur.token == h.token && now.Before(cur.expires) {
		h.l.locks[h.key] = memLock{token: h.token, expires: now.Add(h.ttl)}
		h.until = now.Add(h.ttl)
		return true, nil
	}
	h.until = time.Time{}
	return false, nil
}

func (h *memHandle) Release() {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.l == nil || h.done {
		return
	}
	h.done = true
	h.until = time.Time{}
	h.l.mu.Lock()
	defer h.l.mu.Unlock()
	if cur, ok := h.l.locks[h.key]; ok && cur.token == h.token {
		delete(h.l.locks, h.key)
	}
}
