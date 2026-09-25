package moderation

import (
	"container/list"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sync"
	"time"
)

// Verdict cache (CONTRACTS §20.3 cache_ttl_seconds): an in-memory LRU of
// cacheEntries plus the host KV shared by all nodes. Keys include the policy
// version, so changing model, prompt, categories or tool_choice invalidates
// old verdicts. KV errors are never fatal.

const (
	cacheEntries = 10000
	kvNamespace  = "verdicts"
)

type cacheEntry struct {
	key     string
	v       Verdict
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

func (c *lru) get(key string, now time.Time) (Verdict, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	el, ok := c.items[key]
	if !ok {
		return Verdict{}, false
	}
	e := el.Value.(*cacheEntry)
	if !now.Before(e.expires) {
		c.ll.Remove(el)
		delete(c.items, key)
		return Verdict{}, false
	}
	c.ll.MoveToFront(el)
	return e.v, true
}

func (c *lru) put(key string, v Verdict, expires time.Time) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if el, ok := c.items[key]; ok {
		e := el.Value.(*cacheEntry)
		e.v, e.expires = v, expires
		c.ll.MoveToFront(el)
		return
	}
	c.items[key] = c.ll.PushFront(&cacheEntry{key: key, v: v, expires: expires})
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

// cacheKey combines the policy version and the moderated text.
func cacheKey(policy, text string) string {
	h := sha256.New()
	h.Write([]byte(policy))
	h.Write([]byte{0})
	h.Write([]byte(text))
	return hex.EncodeToString(h.Sum(nil))
}

// cacheGet looks in memory, then (useKV) in the host KV.
func (p *Plugin) cacheGet(ctx context.Context, c *config, key string, useKV bool) (Verdict, bool) {
	if c.cacheTTL <= 0 {
		return Verdict{}, false
	}
	now := p.now()
	if v, ok := p.cache.get(key, now); ok {
		return v, true
	}
	if !useKV || p.host == nil {
		return Verdict{}, false
	}
	kctx, cancel := context.WithTimeout(ctx, 300*time.Millisecond)
	defer cancel()
	b, found, err := p.host.KV().Get(kctx, kvNamespace, key)
	if err != nil || !found {
		return Verdict{}, false
	}
	var v Verdict
	if json.Unmarshal(b, &v) != nil || v.Verdict == "" {
		return Verdict{}, false
	}
	// The KV TTL bounds the entry; keep it locally for at most the TTL.
	p.cache.put(key, v, now.Add(c.cacheTTL))
	return v, true
}

// cachePut stores v in memory and, asynchronously, in the KV.
func (p *Plugin) cachePut(c *config, key string, v Verdict) {
	if c.cacheTTL <= 0 {
		return
	}
	p.cache.put(key, v, p.now().Add(c.cacheTTL))
	if p.host == nil {
		return
	}
	b, _ := json.Marshal(v)
	// Fire and forget, bounded by its own timeout.
	go func() {
		kctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := p.host.KV().Set(kctx, kvNamespace, key, b, c.cacheTTL); err != nil {
			p.stats.kvErrors.Add(1)
		}
	}()
}
