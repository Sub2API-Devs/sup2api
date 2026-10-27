package proxy

import (
	"net/http"
	"net/http/httptest"
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

func lazy(ready *atomic.Bool, calls *atomic.Int32) (*LazyReady, *fakeClock) {
	clock := &fakeClock{t: time.Unix(1000, 0)}
	l := NewLazyReady(func() bool { calls.Add(1); return ready.Load() }, 30*time.Second)
	l.now = clock.now
	return l, clock
}

// Ready by default: the core is not asked while requests reach it.
func TestLazyReadyNeverAsksWhileRequestsSucceed(t *testing.T) {
	var ready atomic.Bool
	var calls atomic.Int32
	l, _ := lazy(&ready, &calls)
	for i := 0; i < 100; i++ {
		if !l.Ready() {
			t.Fatal("not ready by default")
		}
		l.Succeeded()
	}
	if calls.Load() != 0 {
		t.Fatalf("core asked %d times", calls.Load())
	}
}

// After a failed request the core is asked at once, then at most once per
// interval until it answers ready.
func TestLazyReadyAsksEveryIntervalAfterFailure(t *testing.T) {
	var ready atomic.Bool
	var calls atomic.Int32
	l, clock := lazy(&ready, &calls)
	l.Failed()
	if l.Ready() || calls.Load() != 1 {
		t.Fatalf("first check after failure: calls %d", calls.Load())
	}
	for i := 0; i < 50; i++ {
		if l.Ready() {
			t.Fatal("not-ready answer must hold until the next check")
		}
	}
	clock.add(29 * time.Second)
	if l.Ready() || calls.Load() != 1 {
		t.Fatalf("asked before the interval: calls %d", calls.Load())
	}
	ready.Store(true)
	clock.add(2 * time.Second)
	if !l.Ready() || calls.Load() != 2 {
		t.Fatalf("second check: calls %d", calls.Load())
	}
	for i := 0; i < 10; i++ {
		l.Ready()
	}
	if calls.Load() != 2 {
		t.Fatalf("asked again after recovering: calls %d", calls.Load())
	}
}

// A response from the core ends the suspicion without waiting for the check.
func TestLazyReadySuccessRestores(t *testing.T) {
	var ready atomic.Bool
	var calls atomic.Int32
	l, _ := lazy(&ready, &calls)
	l.Failed()
	l.Ready()
	l.Succeeded()
	if !l.Ready() || calls.Load() != 1 {
		t.Fatalf("success did not restore: calls %d", calls.Load())
	}
}

// Concurrent requests during a check do not pile up more checks.
func TestLazyReadyChecksOnceConcurrently(t *testing.T) {
	var calls atomic.Int32
	release := make(chan struct{})
	clock := &fakeClock{t: time.Unix(1000, 0)}
	l := NewLazyReady(func() bool { calls.Add(1); <-release; return true }, 30*time.Second)
	l.now = clock.now
	l.Failed()
	var wg sync.WaitGroup
	wg.Add(1)
	go func() { defer wg.Done(); l.Ready() }()
	for calls.Load() == 0 {
		time.Sleep(time.Millisecond)
	}
	for i := 0; i < 20; i++ {
		if l.Ready() {
			t.Fatal("ready before the check answered")
		}
	}
	close(release)
	wg.Wait()
	if calls.Load() != 1 || !l.Ready() {
		t.Fatalf("calls %d", calls.Load())
	}
}

// The router reports to LazyReady: a response from the local core (any
// status, a 5xx included) is a success, a refused connection a failure; once
// the core is reported unready the gateway answers 503 without trying it.
func TestRouterReportsLocalCoreReachability(t *testing.T) {
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(529) }))
	var ok, failed atomic.Int32
	var ready atomic.Bool
	ready.Store(true)
	r := New(Config{LocalReady: ready.Load, LocalSucceeded: func() { ok.Add(1) }, LocalFailed: func() { failed.Add(1); ready.Store(false) }})
	if err := r.SetRoute(Route{Mode: "local-serving", LocalURL: up.URL, CoreBootID: "b", Revision: 1}); err != nil {
		t.Fatal(err)
	}
	call := func() int {
		w := httptest.NewRecorder()
		r.Public().ServeHTTP(w, httptest.NewRequest("GET", "http://public/v1/models", nil))
		return w.Code
	}
	if code := call(); code != 529 || ok.Load() != 1 || failed.Load() != 0 {
		t.Fatalf("business error: %d ok=%d failed=%d", code, ok.Load(), failed.Load())
	}
	up.Close()
	if code := call(); code != http.StatusBadGateway || failed.Load() != 1 {
		t.Fatalf("refused connection: %d failed=%d", code, failed.Load())
	}
	if code := call(); code != http.StatusServiceUnavailable || failed.Load() != 1 {
		t.Fatalf("unready core still tried: %d failed=%d", code, failed.Load())
	}
}
