package task

import (
	"context"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// memBus delivers every message to every subscriber synchronously.
type memBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
}

func (b *memBus) Publish(_ context.Context, channel string, payload []byte) error {
	b.mu.Lock()
	hs := append([]func([]byte){}, b.subs[channel]...)
	b.mu.Unlock()
	for _, h := range hs {
		h(payload)
	}
	return nil
}

func (b *memBus) Subscribe(channel string, h func([]byte)) func() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subs == nil {
		b.subs = map[string][]func([]byte){}
	}
	b.subs[channel] = append(b.subs[channel], h)
	return func() {}
}

type nodeEnv struct {
	rdb *redis.Client
	bus *memBus
}

func newNodeEnv(t *testing.T) nodeEnv {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return nodeEnv{rdb: rdb, bus: &memBus{}}
}

func (e nodeEnv) service(t *testing.T, nodeID string, canWork func() bool) *Service {
	s, err := New(Options{NodeID: nodeID, Redis: e.rdb, Bus: e.bus, CanWork: canWork})
	require.NoError(t, err)
	require.NoError(t, s.StartNode(t.Context()))
	t.Cleanup(func() { s.Stop(context.Background()) })
	return s
}

func nodeSpec(name string, h core.TaskHandler) core.TaskSpec {
	return core.TaskSpec{Name: name, Title: core.LocalizedText{"en": "Test", "zh": "测试"}, Scope: core.TaskNode,
		Every: time.Hour, Timeout: 2 * time.Second, Handler: h}
}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func state(t *testing.T, rdb *redis.Client, node, name string) NodeTaskState {
	t.Helper()
	states, err := ReadNodeStates(context.Background(), rdb, node)
	require.NoError(t, err)
	return states[name]
}

func TestNodeTaskRunsOnEveryNode(t *testing.T) {
	env := newNodeEnv(t)
	var a, b atomic.Int64
	count := func(c *atomic.Int64) core.TaskHandler {
		return func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
			c.Add(1)
			return core.TaskResult{Count: 3, Message: "ok on " + run.NodeID}, nil
		}
	}
	for node, c := range map[string]*atomic.Int64{"n1": &a, "n2": &b} {
		s := env.service(t, node, nil)
		spec := nodeSpec("core.test.every_node", count(c))
		spec.Every, spec.RunOnStart = time.Second, true
		require.NoError(t, s.Register(spec))
	}
	waitFor(t, "both nodes ran twice", func() bool { return a.Load() >= 2 && b.Load() >= 2 })
	waitFor(t, "state of n2", func() bool { return state(t, env.rdb, "n2", "core.test.every_node").Status == StatusSucceeded })
	st := state(t, env.rdb, "n2", "core.test.every_node")
	require.Equal(t, 3, st.Count)
	require.Equal(t, "ok on n2", st.Message)
	require.Equal(t, "@every 1s", st.Schedule)
	require.NotNil(t, st.LastSuccessAt)
	runs, err := ReadNodeRuns(t.Context(), env.rdb, "n1", "core.test.every_node")
	require.NoError(t, err)
	require.GreaterOrEqual(t, len(runs), 2)
	require.Equal(t, StatusSucceeded, runs[0].Status)
	require.True(t, runs[0].StartedAt.After(runs[1].StartedAt) || runs[0].StartedAt.Equal(runs[1].StartedAt), "newest first")
	ttl := env.rdb.TTL(t.Context(), nodeStateKey("n1")).Val()
	require.True(t, ttl > 0 && ttl <= nodeStateTTL, "state key expires (%s)", ttl)
}

func TestNodeTaskDoesNotOverlapItself(t *testing.T) {
	env := newNodeEnv(t)
	s := env.service(t, "n1", nil)
	release := make(chan struct{})
	var calls atomic.Int64
	require.NoError(t, s.Register(nodeSpec("core.test.slow", func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
		calls.Add(1)
		select {
		case <-release:
		case <-ctx.Done():
		}
		return core.TaskResult{}, nil
	})))
	require.NoError(t, s.Trigger(t.Context(), "core.test.slow"))
	waitFor(t, "first run", func() bool { return calls.Load() == 1 })
	require.NoError(t, s.Trigger(t.Context(), "core.test.slow"))
	waitFor(t, "skip recorded", func() bool { return state(t, env.rdb, "n1", "core.test.slow").Skipped == 1 })
	require.True(t, state(t, env.rdb, "n1", "core.test.slow").Running)
	close(release)
	waitFor(t, "first run finished", func() bool { return state(t, env.rdb, "n1", "core.test.slow").Status == StatusSucceeded })
	require.EqualValues(t, 1, calls.Load())
	runs, err := ReadNodeRuns(t.Context(), env.rdb, "n1", "core.test.slow")
	require.NoError(t, err)
	require.Len(t, runs, 2)
	require.Equal(t, StatusSucceeded, runs[0].Status)
	require.Equal(t, StatusSkipped, runs[1].Status)
	require.True(t, runs[1].Manual)
}

func TestNodeTaskRequireWork(t *testing.T) {
	env := newNodeEnv(t)
	var admitted atomic.Bool
	s := env.service(t, "n1", admitted.Load)
	var calls atomic.Int64
	spec := nodeSpec("core.test.needs_work", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		calls.Add(1)
		return core.TaskResult{}, nil
	})
	spec.RequireWork = true
	require.NoError(t, s.Register(spec))
	free := nodeSpec("core.test.free", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		calls.Add(100)
		return core.TaskResult{}, nil
	})
	require.NoError(t, s.Register(free))

	require.NoError(t, s.Trigger(t.Context(), "core.test.needs_work"))
	require.NoError(t, s.Trigger(t.Context(), "core.test.free"))
	waitFor(t, "skip", func() bool { return state(t, env.rdb, "n1", "core.test.needs_work").Status == StatusSkipped })
	waitFor(t, "free task ran", func() bool { return calls.Load() == 100 })
	runs, _ := ReadNodeRuns(t.Context(), env.rdb, "n1", "core.test.needs_work")
	require.Empty(t, runs, "waiting for admission is not history")

	admitted.Store(true)
	require.NoError(t, s.Trigger(t.Context(), "core.test.needs_work"))
	waitFor(t, "admitted run", func() bool { return calls.Load() == 101 })
}

func TestNodeTaskOutcomes(t *testing.T) {
	env := newNodeEnv(t)
	s := env.service(t, "n1", nil)
	handlers := map[string]core.TaskHandler{
		"core.test.fails": func(context.Context, core.TaskRun) (core.TaskResult, error) {
			return core.TaskResult{}, errors.New(strings.Repeat("é", 1500))
		},
		"core.test.panics": func(context.Context, core.TaskRun) (core.TaskResult, error) { panic("boom") },
		"core.test.times_out": func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
			<-ctx.Done()
			return core.TaskResult{}, ctx.Err()
		},
		"core.test.retries": func(context.Context, core.TaskRun) (core.TaskResult, error) {
			return core.TaskResult{}, core.TaskRetryAfter(time.Second)
		},
	}
	for name, h := range handlers {
		spec := nodeSpec(name, h)
		spec.Timeout = 200 * time.Millisecond
		require.NoError(t, s.Register(spec))
	}
	want := map[string]string{"core.test.fails": StatusFailed, "core.test.panics": StatusFailed,
		"core.test.times_out": StatusTimeout, "core.test.retries": StatusSkipped}
	for range 2 {
		for name := range handlers {
			before := len(mustRuns(t, env.rdb, name))
			require.NoError(t, s.Trigger(t.Context(), name))
			waitFor(t, name, func() bool { return len(mustRuns(t, env.rdb, name)) == before+1 })
		}
	}
	for name, status := range want {
		st := state(t, env.rdb, "n1", name)
		require.Equal(t, status, st.Status, name)
		if status == StatusSkipped {
			require.Zero(t, st.ConsecutiveFailures, name)
			require.EqualValues(t, 2, st.Skipped, name)
		} else {
			require.Equal(t, 2, st.ConsecutiveFailures, name)
		}
	}
	require.LessOrEqual(t, len(state(t, env.rdb, "n1", "core.test.fails").Error), maxTextLen)
	require.Contains(t, state(t, env.rdb, "n1", "core.test.panics").Error, "panic: boom")
}

func mustRuns(t *testing.T, rdb *redis.Client, name string) []NodeTaskRun {
	runs, err := ReadNodeRuns(context.Background(), rdb, "n1", name)
	require.NoError(t, err)
	return runs
}

func TestNodeRunOnNodesOverBus(t *testing.T) {
	env := newNodeEnv(t)
	var mu sync.Mutex
	ran := map[string]int{}
	h := func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
		mu.Lock()
		ran[run.NodeID]++
		mu.Unlock()
		return core.TaskResult{}, nil
	}
	s1 := env.service(t, "n1", nil)
	s2 := env.service(t, "n2", nil)
	require.NoError(t, s1.Register(nodeSpec("core.test.manual", h)))
	require.NoError(t, s2.Register(nodeSpec("core.test.manual", h)))
	snapshot := func() map[string]int {
		mu.Lock()
		defer mu.Unlock()
		return map[string]int{"n1": ran["n1"], "n2": ran["n2"]}
	}

	require.NoError(t, s1.RunOnNodes(t.Context(), "core.test.manual", "n2"))
	waitFor(t, "n2 ran", func() bool { return snapshot()["n2"] == 1 })
	require.Equal(t, 0, snapshot()["n1"])
	require.NoError(t, s1.RunOnNodes(t.Context(), "core.test.manual", ""))
	waitFor(t, "both ran", func() bool { s := snapshot(); return s["n1"] == 1 && s["n2"] == 2 })
	require.ErrorIs(t, s1.RunOnNodes(t.Context(), "core.test.unknown", ""), core.ErrTaskUnknown)
	require.ErrorIs(t, s1.Trigger(t.Context(), "core.test.unknown"), core.ErrTaskUnknown)
}

func TestNodeStopWaitsThenCancels(t *testing.T) {
	prev := nodeStopWait
	nodeStopWait = 200 * time.Millisecond
	t.Cleanup(func() { nodeStopWait = prev })
	env := newNodeEnv(t)
	s, err := New(Options{NodeID: "n1", Redis: env.rdb})
	require.NoError(t, err)
	require.NoError(t, s.StartNode(t.Context()))
	started := make(chan struct{})
	var cancelled atomic.Bool
	spec := nodeSpec("core.test.long", func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
		close(started)
		<-ctx.Done()
		cancelled.Store(true)
		return core.TaskResult{}, ctx.Err()
	})
	spec.Timeout = time.Minute
	require.NoError(t, s.Register(spec))
	require.NoError(t, s.Trigger(t.Context(), "core.test.long"))
	<-started
	begin := time.Now()
	s.Stop(context.Background())
	require.True(t, cancelled.Load(), "cancelled after the wait")
	require.GreaterOrEqual(t, time.Since(begin), 150*time.Millisecond, "waited first")
	require.Zero(t, env.rdb.Exists(context.Background(), nodeStateKey("n1")).Val(), "state removed")
	require.ErrorIs(t, s.Trigger(context.Background(), "core.test.long"), core.ErrTaskNotReady)
}
