package proxy

import (
	"sync"
	"time"
)

// LazyReady answers the router's local readiness question without asking
// the core on every request: the core's status check reads the approved
// plugins from PostgreSQL, a dozen round trips (0.36 s per request on a node
// 30 ms from the database). The local core is taken as ready by default and
// as long as requests reach it. Once a request fails to reach it (Failed),
// readiness is asked at most once per interval until the core answers ready
// or a request gets through again (Succeeded). Core exits and upgrades do not
// depend on this: the supervisor and the route mode handle them.
type LazyReady struct {
	check    func() bool
	interval time.Duration
	now      func() time.Time

	mu        sync.Mutex
	suspect   bool
	checkedAt time.Time
	last      bool
	checking  bool
}

// NewLazyReady wraps check (the core status call).
func NewLazyReady(check func() bool, interval time.Duration) *LazyReady {
	return &LazyReady{check: check, interval: interval, now: time.Now}
}

// Ready reports whether to send requests to the local core.
func (l *LazyReady) Ready() bool {
	l.mu.Lock()
	if !l.suspect {
		l.mu.Unlock()
		return true
	}
	if l.checking || (!l.checkedAt.IsZero() && l.now().Sub(l.checkedAt) < l.interval) {
		v := l.last
		l.mu.Unlock()
		return v
	}
	l.checking = true
	l.mu.Unlock()
	v := l.check()
	l.mu.Lock()
	l.checking, l.checkedAt, l.last = false, l.now(), v
	if v {
		l.suspect = false
	}
	l.mu.Unlock()
	return v
}

// Failed records a request that could not reach the local core: the next
// Ready asks the core at once, later ones at most once per interval.
func (l *LazyReady) Failed() {
	l.mu.Lock()
	if !l.suspect {
		l.suspect, l.checkedAt, l.last = true, time.Time{}, false
	}
	l.mu.Unlock()
}

// Succeeded records a response from the local core: it is ready again.
func (l *LazyReady) Succeeded() {
	l.mu.Lock()
	l.suspect = false
	l.mu.Unlock()
}
