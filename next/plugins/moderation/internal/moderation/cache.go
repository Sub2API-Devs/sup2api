package moderation

import (
	"container/list"
	"context"
	"sync"
	"time"
)

// Pass cache (CONTRACTS §72.5 step 8): clean passes of (flow, version, input
// hash) in an in-memory LRU of cache_entries plus the host KV shared by all
// nodes. Only clean passes are stored, so a hit, an error or a skipped
// auditor is always moderated again. KV errors are never fatal.

const kvNamespace = "pass"

type cacheEntry struct {
	key     string
	expires time.Time
}

type lru struct {
	mu    sync.Mutex
	max   int
	ll    *list.List
	items map[string]*list.Element
}

func newLRU(max int) *lru {
	return &lru{max: max, ll: list.New(), items: make(map[string]*list.Element, 256)}
}

func (c *lru) get(key string, now time.Time) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return false
	}
	if !now.Before(el.Value.(*cacheEntry).expires) {
		c.ll.Remove(el)
		delete(c.items, key)
		return false
	}
	c.ll.MoveToFront(el)
	return true
}

func (c *lru) put(key string, expires time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		el.Value.(*cacheEntry).expires = expires
		c.ll.MoveToFront(el)
		return
	}
	c.items[key] = c.ll.PushFront(&cacheEntry{key: key, expires: expires})
	for c.ll.Len() > c.max {
		last := c.ll.Back()
		c.ll.Remove(last)
		delete(c.items, last.Value.(*cacheEntry).key)
	}
}

func (c *lru) len() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.ll.Len()
}

// passCached looks in memory, then in the KV (bounded wait).
func (p *Plugin) passCached(key string, useKV bool) bool {
	c := p.cfg.Load()
	if c.cacheTTL <= 0 {
		return false
	}
	now := p.now()
	cache := p.cache.Load()
	if cache.get(key, now) {
		return true
	}
	if !useKV || p.host == nil {
		return false
	}
	kctx, cancel := context.WithTimeout(p.bg, 200*time.Millisecond)
	defer cancel()
	_, found, err := p.host.KV().Get(kctx, kvNamespace, key)
	if err != nil || !found {
		return false
	}
	cache.put(key, now.Add(c.cacheTTL))
	return true
}

// passPut stores a clean pass in memory and, asynchronously, in the KV.
func (p *Plugin) passPut(c *config, key string) {
	if c.cacheTTL <= 0 {
		return
	}
	p.cache.Load().put(key, p.now().Add(c.cacheTTL))
	if p.host == nil {
		return
	}
	go func() {
		kctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := p.host.KV().Set(kctx, kvNamespace, key, []byte{1}, c.cacheTTL); err != nil {
			p.stats.kvErrors.Add(1)
		}
	}()
}
