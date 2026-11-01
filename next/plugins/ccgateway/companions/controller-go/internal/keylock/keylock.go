// Package keylock is the per-runtime account lock (Python Manager.guard,
// behaviour K1, K2, M4; 02 §4.1).
//
// Unlike Python's RLock it is not re-entrant: code that needs the lock to be
// held takes a *Held and asserts it (Held.Check), so the paths that run
// under the lock are visible in signatures. One key's lock lives as long as
// the process, like Python's locks dictionary.
//
// FROZEN: accounts, updates and cleanup all pass *Held across packages.
package keylock

import (
	"context"
	"sync"
	"time"

	"ccgateway/controller/internal/errs"
)

// RequestWait is how long the request path (connection, tunnel, admin
// pass-through) waits for an account lock (REQUEST_LOCK_WAIT).
const RequestWait = 20 * time.Second

// Locks is the set of account locks.
type Locks struct {
	mu    sync.Mutex
	locks map[string]chan struct{}
}

// New is an empty lock set.
func New() *Locks { return &Locks{locks: map[string]chan struct{}{}} }

func (l *Locks) get(key string) chan struct{} {
	l.mu.Lock()
	defer l.mu.Unlock()
	ch, ok := l.locks[key]
	if !ok {
		ch = make(chan struct{}, 1)
		l.locks[key] = ch
	}
	return ch
}

// Held is a taken account lock.
type Held struct {
	key  string
	once sync.Once
	ch   chan struct{}
}

// Key is the runtime key the lock belongs to.
func (h *Held) Key() string { return h.key }

// Release gives the lock back; later calls do nothing.
func (h *Held) Release() {
	h.once.Do(func() { <-h.ch })
}

// Check panics unless h holds the lock of key (a programming error: a
// function that requires the lock was handed someone else's).
func (h *Held) Check(key string) {
	if h == nil || h.key != key {
		panic("keylock: account lock of " + key + " is not held")
	}
}

// Lock waits for key's lock until ctx ends; then it is RuntimeBusy
// ("account runtime is busy", answered 503 runtime_unavailable).
func (l *Locks) Lock(ctx context.Context, key string) (*Held, error) {
	ch := l.get(key)
	select {
	case ch <- struct{}{}:
		return &Held{key: key, ch: ch}, nil
	default:
	}
	select {
	case ch <- struct{}{}:
		return &Held{key: key, ch: ch}, nil
	case <-ctx.Done():
		return nil, errs.Wrap(errs.RuntimeBusy, "account runtime is busy", ctx.Err())
	}
}

// TryLock takes key's lock only when it is free (acquire(blocking=False)).
func (l *Locks) TryLock(key string) (*Held, bool) {
	ch := l.get(key)
	select {
	case ch <- struct{}{}:
		return &Held{key: key, ch: ch}, true
	default:
		return nil, false
	}
}
