package authcache

import (
	"container/list"
	"strconv"
	"sync"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

type entry struct {
	digest    string
	grant     *requeststate.AuthGrant
	expiresAt time.Time
}

// Cache is a bounded LRU for short-lived AuthGrants. All returned grants are
// cloned so request handlers cannot mutate cached policy slices.
type Cache struct {
	mu       sync.Mutex
	capacity int
	ttl      time.Duration
	items    map[string]*list.Element
	lru      *list.List
}

func New(capacity int, ttl time.Duration) *Cache {
	return &Cache{
		capacity: capacity,
		ttl:      ttl,
		items:    make(map[string]*list.Element, capacity),
		lru:      list.New(),
	}
}

func (c *Cache) Get(digest string, now time.Time) (*requeststate.AuthGrant, bool) {
	if c == nil || digest == "" {
		return nil, false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	element, ok := c.items[digest]
	if !ok {
		return nil, false
	}
	item := element.Value.(*entry)
	if !now.Before(item.expiresAt) {
		c.remove(element)
		return nil, false
	}
	c.lru.MoveToFront(element)
	return item.grant.Clone(), true
}

func (c *Cache) Put(digest string, grant *requeststate.AuthGrant, now time.Time) {
	if c == nil || digest == "" || grant == nil || c.capacity <= 0 || c.ttl <= 0 {
		return
	}
	expiresAt := now.Add(c.ttl)
	for _, unixMilli := range []int64{grant.ExpiresAtUnixMilli, grant.APIKeyExpiresUnixMilli} {
		if unixMilli > 0 {
			candidate := time.UnixMilli(unixMilli)
			if candidate.Before(expiresAt) {
				expiresAt = candidate
			}
		}
	}
	if !now.Before(expiresAt) {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if element, ok := c.items[digest]; ok {
		item := element.Value.(*entry)
		item.grant = grant.Clone()
		item.expiresAt = expiresAt
		c.lru.MoveToFront(element)
		return
	}
	element := c.lru.PushFront(&entry{digest: digest, grant: grant.Clone(), expiresAt: expiresAt})
	c.items[digest] = element
	for len(c.items) > c.capacity {
		c.remove(c.lru.Back())
	}
}

func (c *Cache) Invalidate(event *controlv1.InvalidationEvent) {
	if c == nil || event == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	switch event.GetKind() {
	case controlv1.InvalidationKind_INVALIDATION_KIND_API_KEY:
		if element := c.items[event.GetSubject()]; element != nil {
			c.remove(element)
		}
	case controlv1.InvalidationKind_INVALIDATION_KIND_USER:
		c.removeMatching(func(grant *requeststate.AuthGrant) bool {
			return strconv.FormatInt(grant.UserID, 10) == event.GetSubject()
		})
	case controlv1.InvalidationKind_INVALIDATION_KIND_GROUP:
		c.removeMatching(func(grant *requeststate.AuthGrant) bool {
			return strconv.FormatInt(grant.GroupID, 10) == event.GetSubject()
		})
	case controlv1.InvalidationKind_INVALIDATION_KIND_POLICY,
		controlv1.InvalidationKind_INVALIDATION_KIND_FULL_RESYNC:
		c.clearLocked()
	}
}

func (c *Cache) Clear() {
	if c == nil {
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	c.clearLocked()
}

func (c *Cache) Len() int {
	if c == nil {
		return 0
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.items)
}

func (c *Cache) removeMatching(match func(*requeststate.AuthGrant) bool) {
	for element := c.lru.Back(); element != nil; {
		previous := element.Prev()
		if match(element.Value.(*entry).grant) {
			c.remove(element)
		}
		element = previous
	}
}

func (c *Cache) remove(element *list.Element) {
	if element == nil {
		return
	}
	delete(c.items, element.Value.(*entry).digest)
	c.lru.Remove(element)
}

func (c *Cache) clearLocked() {
	clear(c.items)
	c.lru.Init()
}
