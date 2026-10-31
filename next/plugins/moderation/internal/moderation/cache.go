package moderation

import (
	"container/list"
	"context"
	"encoding/hex"
	"strconv"
	"sync"
	"time"
)

// Segment pass cache (CONTRACTS §72.4, §72.5 step 8; 0.6.0): every text
// segment and inline image of a request that passed cleanly is remembered
// under (config version, flow, flow version, segment hash), so a long
// conversation only sends what is new each turn. In-memory LRU of
// cache_entries plus the host KV shared by all nodes, TTL cache_ttl_seconds.
// Only clean passes are stored, so content that hit, errored or met a
// skipped auditor is always moderated again. KV errors are never fatal.

const kvNamespace = "pass"

// KV lookups per request: the misses of the memory cache, at most
// kvLookupMax of them, kvLookupWorkers at a time within kvLookupBudget;
// writes the same way in the background.
const (
	kvLookupMax     = 64
	kvLookupWorkers = 8
	kvLookupBudget  = 200 * time.Millisecond
)

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

// segKey is the cache key of one segment: the config version changes with
// every auditor, channel or default question set change, which a flow
// version does not see.
func segKey(s *snapshot, f *liveFlow, h [32]byte) string {
	return strconv.FormatInt(s.version, 10) + ":" + strconv.FormatInt(f.ID, 10) + ":" + strconv.Itoa(f.Version) + ":" + hex.EncodeToString(h[:])
}

// cachedSegments reports which of the segment hashes are cached: memory
// first, then (useKV) the KV for the misses within the lookup budget.
func (p *Plugin) cachedSegments(s *snapshot, f *liveFlow, hashes [][32]byte, useKV bool) map[[32]byte]bool {
	c := p.cfg.Load()
	out := map[[32]byte]bool{}
	if c.cacheTTL <= 0 || len(hashes) == 0 {
		return out
	}
	now := p.now()
	cache := p.cache.Load()
	var misses [][32]byte
	for _, h := range hashes {
		if cache.get(segKey(s, f, h), now) {
			out[h] = true
		} else {
			misses = append(misses, h)
		}
	}
	if !useKV || p.host == nil || len(misses) == 0 {
		return out
	}
	if len(misses) > kvLookupMax {
		misses = misses[len(misses)-kvLookupMax:] // the newest content
	}
	kctx, cancel := context.WithTimeout(p.bg, kvLookupBudget)
	defer cancel()
	var mu sync.Mutex
	work := make(chan [32]byte)
	var wg sync.WaitGroup
	for range min(kvLookupWorkers, len(misses)) {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for h := range work {
				key := segKey(s, f, h)
				if _, found, err := p.host.KV().Get(kctx, kvNamespace, key); err == nil && found {
					cache.put(key, now.Add(c.cacheTTL))
					mu.Lock()
					out[h] = true
					mu.Unlock()
				}
			}
		}()
	}
	for _, h := range misses {
		if kctx.Err() != nil {
			break
		}
		work <- h
	}
	close(work)
	wg.Wait()
	return out
}

// putSegments stores clean passes in memory and, in the background, in the
// KV (at most kvLookupMax per request).
func (p *Plugin) putSegments(c *config, s *snapshot, f *liveFlow, hashes [][32]byte) {
	if c.cacheTTL <= 0 || len(hashes) == 0 {
		return
	}
	cache := p.cache.Load()
	exp := p.now().Add(c.cacheTTL)
	keys := make([]string, len(hashes))
	for i, h := range hashes {
		keys[i] = segKey(s, f, h)
		cache.put(keys[i], exp)
	}
	if p.host == nil {
		return
	}
	if len(keys) > kvLookupMax {
		keys = keys[len(keys)-kvLookupMax:]
	}
	go func() {
		kctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		work := make(chan string)
		var wg sync.WaitGroup
		for range min(kvLookupWorkers, len(keys)) {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for k := range work {
					if err := p.host.KV().Set(kctx, kvNamespace, k, []byte{1}, c.cacheTTL); err != nil {
						p.stats.kvErrors.Add(1)
					}
				}
			}()
		}
		for _, k := range keys {
			work <- k
		}
		close(work)
		wg.Wait()
	}()
}
