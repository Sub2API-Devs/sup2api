package proxy

import (
	"sync"
	"time"
)

// ReadyCache answers the router's per-request local readiness question
// without asking the core every time. The core's status check reads the
// approved plugins from PostgreSQL, a dozen round trips; asked per request it
// cost 0.36 s on a node 30 ms away from the database (the core itself answers
// in 1 ms). A result younger than ttl is reused. An older "ready" is still
// returned while one background check refreshes it, so no request waits; an
// older or missing "not ready" is checked at once, so a core that became
// ready takes traffic without waiting for the next refresh.
type ReadyCache struct {
	check func() bool
	ttl   time.Duration
	now   func() time.Time

	mu         sync.Mutex
	value      bool
	at         time.Time
	refreshing bool
}

// NewReadyCache wraps check (the core status call) with a ttl cache.
func NewReadyCache(check func() bool, ttl time.Duration) *ReadyCache {
	return &ReadyCache{check: check, ttl: ttl, now: time.Now}
}

// Ready reports the cached readiness, refreshing it as described above.
func (c *ReadyCache) Ready() bool {
	c.mu.Lock()
	if !c.at.IsZero() && c.now().Sub(c.at) < c.ttl {
		v := c.value
		c.mu.Unlock()
		return v
	}
	if !c.at.IsZero() && c.value {
		if !c.refreshing {
			c.refreshing = true
			go c.refresh()
		}
		c.mu.Unlock()
		return true
	}
	c.mu.Unlock()
	return c.refresh()
}

func (c *ReadyCache) refresh() bool {
	v := c.check()
	c.mu.Lock()
	c.value, c.at, c.refreshing = v, c.now(), false
	c.mu.Unlock()
	return v
}
