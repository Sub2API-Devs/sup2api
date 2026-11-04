package usage

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"golang.org/x/sync/singleflight"
)

// Operator statistics scan everyone's rows live, so they are kept in this
// process briefly, as the old sub2api dashboard does: the overview is fresh
// for 15 seconds and served while it refreshes in the background until 30,
// and each summary query is kept for 30 (CONTRACTS §66.3).
const (
	overviewFresh = 15 * time.Second
	statsCacheTTL = 30 * time.Second
	// statsLoadTimeout bounds one load; it outlives the request that started
	// it, since others may be waiting on the answer.
	statsLoadTimeout = 30 * time.Second
	// maxSnapshots caps one cache. Reaching it starts over.
	maxSnapshots = 256
)

// snapshotCache keeps answers by key. An answer younger than fresh is served
// as it is; one younger than ttl is served and refreshed in the background;
// older ones are loaded while the caller waits. Concurrent loads of a key run
// once, and an error is never kept. A ttl of 0 turns the cache off.
//
// Answers are shared between callers, who must not change them.
type snapshotCache[T any] struct {
	fresh, ttl time.Duration

	mu    sync.Mutex
	items map[string]snapshot[T]
	sf    singleflight.Group
}

type snapshot[T any] struct {
	at time.Time
	v  T
}

func newSnapshotCache[T any](fresh, ttl time.Duration) *snapshotCache[T] {
	return &snapshotCache[T]{fresh: fresh, ttl: ttl, items: map[string]snapshot[T]{}}
}

// get returns the answer for key and whether it came from the cache. load must
// not use the request it was created for, which may end first.
func (c *snapshotCache[T]) get(ctx context.Context, key string, load func(context.Context) (T, error)) (T, bool, error) {
	if c.ttl <= 0 {
		v, err := load(ctx)
		return v, false, err
	}
	base := context.WithoutCancel(ctx)
	refresh := func() (any, error) {
		loadCtx, cancel := context.WithTimeout(base, statsLoadTimeout)
		defer cancel()
		v, err := load(loadCtx)
		if err != nil {
			return nil, err
		}
		c.put(key, v)
		return v, nil
	}
	if e, ok := c.lookup(key); ok {
		if time.Since(e.at) >= c.fresh {
			c.sf.DoChan(key, func() (any, error) {
				v, err := refresh()
				if err != nil {
					slog.Warn("usage: refresh statistics", "key", key, "err", err)
				}
				return v, err
			})
		}
		return e.v, true, nil
	}
	var zero T
	select {
	case r := <-c.sf.DoChan(key, refresh):
		if r.Err != nil {
			return zero, false, r.Err
		}
		return r.Val.(T), false, nil
	case <-ctx.Done():
		return zero, false, ctx.Err()
	}
}

func (c *snapshotCache[T]) lookup(key string) (snapshot[T], bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.items[key]
	if !ok || time.Since(e.at) >= c.ttl {
		return snapshot[T]{}, false
	}
	return e, true
}

func (c *snapshotCache[T]) put(key string, v T) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if len(c.items) >= maxSnapshots {
		c.items = map[string]snapshot[T]{}
	}
	c.items[key] = snapshot[T]{at: time.Now(), v: v}
}

// snapshotHeader says whether a statistics answer came from the cache.
func snapshotHeader(hit bool) string {
	if hit {
		return "hit"
	}
	return "miss"
}
