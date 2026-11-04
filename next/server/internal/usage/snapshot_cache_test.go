package usage

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// age makes a kept answer look older.
func age[T any](c *snapshotCache[T], key string, d time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	e := c.items[key]
	e.at = e.at.Add(-d)
	c.items[key] = e
}

func TestSnapshotCacheFreshStaleExpired(t *testing.T) {
	c := newSnapshotCache[int](15*time.Second, 30*time.Second)
	var loads atomic.Int64
	load := func(context.Context) (int, error) { return int(loads.Add(1)), nil }
	get := func() (int, bool) {
		v, hit, err := c.get(t.Context(), "k", load)
		require.NoError(t, err)
		return v, hit
	}

	v, hit := get()
	require.Equal(t, 1, v)
	require.False(t, hit)

	// Fresh: served without a load.
	v, hit = get()
	require.Equal(t, 1, v)
	require.True(t, hit)
	require.EqualValues(t, 1, loads.Load())

	// Stale: the old answer now, the new one once the background load is done.
	age(c, "k", 20*time.Second)
	v, hit = get()
	require.Equal(t, 1, v)
	require.True(t, hit)
	require.Eventually(t, func() bool {
		e, ok := c.lookup("k")
		return ok && e.v == 2
	}, 5*time.Second, 5*time.Millisecond)

	// Expired: the caller waits for a new one.
	age(c, "k", time.Minute)
	v, hit = get()
	require.Equal(t, 3, v)
	require.False(t, hit)
}

func TestSnapshotCacheKeepsNoError(t *testing.T) {
	c := newSnapshotCache[int](time.Minute, time.Minute)
	boom := errors.New("boom")
	_, _, err := c.get(t.Context(), "k", func(context.Context) (int, error) { return 0, boom })
	require.ErrorIs(t, err, boom)
	v, hit, err := c.get(t.Context(), "k", func(context.Context) (int, error) { return 7, nil })
	require.NoError(t, err)
	require.Equal(t, 7, v)
	require.False(t, hit)
}

// A failed background refresh leaves the old answer until it expires.
func TestSnapshotCacheFailedRefreshKeepsStale(t *testing.T) {
	c := newSnapshotCache[int](15*time.Second, 30*time.Second)
	_, _, err := c.get(t.Context(), "k", func(context.Context) (int, error) { return 1, nil })
	require.NoError(t, err)
	age(c, "k", 20*time.Second)
	var tried atomic.Bool
	v, hit, err := c.get(t.Context(), "k", func(context.Context) (int, error) {
		tried.Store(true)
		return 0, errors.New("boom")
	})
	require.NoError(t, err)
	require.Equal(t, 1, v)
	require.True(t, hit)
	require.Eventually(t, tried.Load, 5*time.Second, 5*time.Millisecond)
}

func TestSnapshotCacheLoadsOnceAtATime(t *testing.T) {
	c := newSnapshotCache[int](time.Minute, time.Minute)
	release := make(chan struct{})
	var loads atomic.Int64
	var wg sync.WaitGroup
	for range 8 {
		wg.Go(func() {
			v, _, err := c.get(t.Context(), "k", func(context.Context) (int, error) {
				loads.Add(1)
				<-release
				return 9, nil
			})
			require.NoError(t, err)
			require.Equal(t, 9, v)
		})
	}
	time.Sleep(50 * time.Millisecond)
	close(release)
	wg.Wait()
	require.EqualValues(t, 1, loads.Load())
}

// A load outlives the request that started it; that request just stops waiting.
func TestSnapshotCacheSurvivesCanceledCaller(t *testing.T) {
	c := newSnapshotCache[int](time.Minute, time.Minute)
	ctx, cancel := context.WithCancel(t.Context())
	release := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		_, _, err := c.get(ctx, "k", func(loadCtx context.Context) (int, error) {
			<-release
			return 5, loadCtx.Err()
		})
		done <- err
	}()
	time.Sleep(20 * time.Millisecond)
	cancel()
	require.ErrorIs(t, <-done, context.Canceled)
	close(release)
	require.Eventually(t, func() bool {
		e, ok := c.lookup("k")
		return ok && e.v == 5
	}, 5*time.Second, 5*time.Millisecond)
}

func TestSnapshotCacheBounded(t *testing.T) {
	c := newSnapshotCache[int](time.Minute, time.Minute)
	for i := range maxSnapshots + 1 {
		c.put(string(rune(i+1000)), i)
	}
	require.LessOrEqual(t, len(c.items), maxSnapshots)
}

func TestSnapshotCacheOff(t *testing.T) {
	c := newSnapshotCache[int](0, 0)
	n := 0
	load := func(context.Context) (int, error) { n++; return n, nil }
	for want := 1; want <= 2; want++ {
		v, hit, err := c.get(t.Context(), "k", load)
		require.NoError(t, err)
		require.Equal(t, want, v)
		require.False(t, hit)
	}
}

// The operator's summary and overview are kept; the caller's own, and the last
// minute of the usage records page, are always live.
func TestOperatorStatsCached(t *testing.T) {
	f := newFixture(t)
	f.svc.summaries = newSnapshotCache[[]SummaryRow](statsCacheTTL, statsCacheTTL)
	f.svc.overviews = newSnapshotCache[Overview](overviewFresh, statsCacheTTL)
	ctx := t.Context()
	now := time.Now()
	add := func(id string) {
		r := f.record(id, false)
		r.CreatedAt = now.Add(-5 * time.Second)
		f.svc.process(ctx, []*core.UsageRecord{r})
	}
	requests := func(path string) float64 {
		rows := f.get(f.user, path, 200)["data"].([]any)
		require.Len(t, rows, 1, path)
		return rows[0].(map[string]any)["requests"].(float64)
	}
	const q = "/usage/summary?group_by=none&from=2026-09-01T00:00:00Z"
	add("cached-1")
	require.EqualValues(t, 1, requests(q))
	overview := func(tz string) float64 {
		return f.get(f.user, "/usage/overview?tz="+tz, 200)["data"].(map[string]any)["last_5m"].(map[string]any)["requests"].(float64)
	}
	require.EqualValues(t, 1, overview("UTC"))

	add("cached-2")
	require.EqualValues(t, 1, requests(q), "the same query is kept")
	require.EqualValues(t, 2, requests(q+"&tz=UTC"), "another query is not")
	require.EqualValues(t, 1, overview("UTC"), "the same time zone is kept")
	require.EqualValues(t, 2, overview("Asia/Shanghai"), "another is not")
	require.EqualValues(t, 2, requests("/me/usage/summary?group_by=none&from=2026-09-01T00:00:00Z"), "a caller's own is live")
	self := f.get(f.user, "/me/usage/overview?tz=UTC", 200)["data"].(map[string]any)
	require.EqualValues(t, 2, self["last_5m"].(map[string]any)["requests"])
	live := f.get(f.user, "/usage/realtime", 200)["data"].(map[string]any)
	require.EqualValues(t, 2, live["rpm"])

	f.get(f.user, q+"&order=nonsense", 400)
	f.get(f.user, q+"&order=nonsense", 400)
}
