package proxy

import (
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type fakeClock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *fakeClock) now() time.Time { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *fakeClock) add(d time.Duration) {
	c.mu.Lock()
	c.t = c.t.Add(d)
	c.mu.Unlock()
}

func TestReadyCacheReusesFreshResult(t *testing.T) {
	var calls atomic.Int32
	clock := &fakeClock{t: time.Unix(1000, 0)}
	c := NewReadyCache(func() bool { calls.Add(1); return true }, time.Second)
	c.now = clock.now
	for i := 0; i < 100; i++ {
		if !c.Ready() {
			t.Fatal("not ready")
		}
	}
	if calls.Load() != 1 {
		t.Fatalf("check called %d times within the ttl", calls.Load())
	}
}

// A stale "ready" is answered at once and refreshed in the background; a
// core that stopped being ready is seen by the next request after that.
func TestReadyCacheRefreshesStaleReadyInBackground(t *testing.T) {
	var ready atomic.Bool
	ready.Store(true)
	release := make(chan struct{})
	var blocking atomic.Bool
	clock := &fakeClock{t: time.Unix(1000, 0)}
	c := NewReadyCache(func() bool {
		if blocking.Load() {
			<-release
		}
		return ready.Load()
	}, time.Second)
	c.now = clock.now
	if !c.Ready() {
		t.Fatal("first check")
	}
	ready.Store(false)
	blocking.Store(true)
	clock.add(2 * time.Second)
	start := time.Now()
	if !c.Ready() {
		t.Fatal("stale ready must be served while refreshing")
	}
	if time.Since(start) > 100*time.Millisecond {
		t.Fatal("request waited for the refresh")
	}
	close(release)
	deadline := time.Now().Add(2 * time.Second)
	for c.Ready() {
		if time.Now().After(deadline) {
			t.Fatal("background refresh never published not-ready")
		}
		time.Sleep(time.Millisecond)
	}
}

// "Not ready" is never trusted from the cache past its ttl: the next request
// checks again, so a core that became ready serves at once.
func TestReadyCacheChecksStaleNotReadySynchronously(t *testing.T) {
	var ready atomic.Bool
	var calls atomic.Int32
	clock := &fakeClock{t: time.Unix(1000, 0)}
	c := NewReadyCache(func() bool { calls.Add(1); return ready.Load() }, time.Second)
	c.now = clock.now
	if c.Ready() {
		t.Fatal("first check")
	}
	ready.Store(true)
	if c.Ready() {
		t.Fatal("fresh not-ready is reused within the ttl")
	}
	clock.add(2 * time.Second)
	if !c.Ready() {
		t.Fatal("stale not-ready must be checked again before answering")
	}
	if calls.Load() != 2 {
		t.Fatalf("calls = %d", calls.Load())
	}
}
