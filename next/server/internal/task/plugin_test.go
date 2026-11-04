package task

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// pluginRow writes the scheduled_tasks row the plugin task bridge would
// write (internal/job): the framework does not record plugin tasks itself.
func pluginRow(t *testing.T, db *store.DB, name, key string) {
	t.Helper()
	_, err := db.Pool.Exec(context.Background(), `INSERT INTO scheduled_tasks (name, source, plugin_key, schedule, timeout_ms)
		VALUES ($1, 'plugin_manifest', $2, '', 10000)`, name, key)
	require.NoError(t, err)
}

func pluginSpec(name string, h core.TaskHandler) core.TaskSpec {
	return core.TaskSpec{Name: name, Title: core.LocalizedText{"en": "Plugin job"}, Scope: core.TaskCluster,
		Timeout: 10 * time.Second, Handler: h}
}

func TestRegisterPluginChecksNameAndSource(t *testing.T) {
	t.Parallel()
	s, err := New(Options{NodeID: "n"})
	require.NoError(t, err)
	noop := func(context.Context, core.TaskRun) (core.TaskResult, error) { return core.TaskResult{}, nil }
	require.ErrorIs(t, s.RegisterPlugin(pluginSpec("plugin.demo.a", noop), SourceCore, "demo"), core.ErrTaskInvalid)
	require.ErrorIs(t, s.RegisterPlugin(pluginSpec("plugin.other.a", noop), SourcePluginManifest, "demo"), core.ErrTaskInvalid)
	require.ErrorIs(t, s.RegisterPlugin(pluginSpec("core.demo.a", noop), SourcePluginManifest, "demo"), core.ErrTaskInvalid)
	// Plugin tasks need no zh title.
	require.NoError(t, s.RegisterPlugin(pluginSpec("plugin.demo.a", noop), SourcePluginManifest, "demo"))
	require.True(t, s.Unregister("plugin.demo.a"))
	require.False(t, s.Unregister("plugin.demo.a"))
}

func TestPluginTaskRunsOnThePluginQueue(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	pluginRow(t, env.db, "plugin.demo.sync", "demo")
	s := env.service(t, "node-a", nil)
	require.NoError(t, s.RegisterPlugin(pluginSpec("plugin.demo.sync", log.handler()), SourcePluginManifest, "demo"))
	require.NoError(t, s.Trigger(context.Background(), "plugin.demo.sync"))
	waitLong(t, "the plugin run", 10*time.Second, func() bool { return log.len() == 1 })
	run := log.list()[0]
	require.NotEmpty(t, run.RunID)
	require.False(t, run.QueuedAt.IsZero())

	var queue, id string
	require.NoError(t, env.db.Pool.QueryRow(context.Background(), `SELECT queue, id::text FROM river_job
		WHERE kind = 'sup2api.task' AND args->>'name' = 'plugin.demo.sync'`).Scan(&queue, &id))
	require.Equal(t, queuePlugin, queue)
	require.Equal(t, id, run.RunID)
	// The framework did not take the row over.
	var source string
	require.NoError(t, env.db.Pool.QueryRow(context.Background(), `SELECT source FROM scheduled_tasks
		WHERE name = 'plugin.demo.sync'`).Scan(&source))
	require.Equal(t, string(SourcePluginManifest), source)
}

// A plugin task whose row is gone was removed: a run left in the queue ends
// as skipped and does not bring the row back.
func TestPluginTaskWithoutRowIsSkipped(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	s := env.service(t, "node-a", nil)
	require.NoError(t, s.RegisterPlugin(pluginSpec("plugin.demo.gone", log.handler()), SourcePluginManifest, "demo"))
	require.NoError(t, s.Trigger(context.Background(), "plugin.demo.gone"))
	waitLong(t, "the skipped run", 10*time.Second, func() bool {
		rows := jobRows(t, env.db, "plugin.demo.gone")
		return len(rows) == 1 && rows[0].Output != nil && rows[0].Output.Status == StatusSkipped
	})
	require.Zero(t, log.len())
	require.Equal(t, "the task was removed", jobRows(t, env.db, "plugin.demo.gone")[0].Output.Message)
	var n int
	require.NoError(t, env.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM scheduled_tasks
		WHERE name = 'plugin.demo.gone'`).Scan(&n))
	require.Zero(t, n)
}

func TestTaskSkippedIsNeitherFailureNorRetry(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	calls := 0
	spec := clusterSpec("core.test.skips", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		calls++
		return core.TaskResult{}, core.TaskSkipped("nothing to do here")
	})
	spec.MaxAttempts = 3
	s := env.service(t, "node-a", nil, spec)
	require.NoError(t, s.Trigger(context.Background(), "core.test.skips"))
	waitLong(t, "the skipped run", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.skips")
		rows := jobRows(t, env.db, "core.test.skips")
		return r.Status != nil && *r.Status == StatusSkipped && len(rows) == 1 && rows[0].State == "completed"
	})
	rows := jobRows(t, env.db, "core.test.skips")
	require.Equal(t, "nothing to do here", rows[0].Output.Message)
	require.Zero(t, readTaskRow(t, env.db, "core.test.skips").Failures)
	require.Equal(t, 1, calls)

	node := newNodeEnv(t).service(t, "node-b", nil)
	spec = nodeSpec("core.test.nodeskip", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		return core.TaskResult{}, core.TaskSkipped("not on this node")
	})
	require.NoError(t, node.Register(spec))
	require.NoError(t, node.Trigger(context.Background(), "core.test.nodeskip"))
	waitFor(t, "the skipped node run", func() bool {
		for _, st := range node.NodeStates() {
			if st.Name == "core.test.nodeskip" && st.Status == StatusSkipped {
				return st.Message == "not on this node" && st.ConsecutiveFailures == 0
			}
		}
		return false
	})
}

// Unregistering a node task stops its runs on this node.
func TestUnregisterNodeTask(t *testing.T) {
	t.Parallel()
	s := newNodeEnv(t).service(t, "node-a", nil)
	var log runLog
	spec := nodeSpec("plugin.demo.tick", log.handler())
	spec.Every = time.Second
	spec.Title = core.LocalizedText{"en": "Tick"}
	require.NoError(t, s.RegisterPlugin(spec, SourcePluginManifest, "demo"))
	waitFor(t, "a node run", func() bool { return log.len() >= 1 })
	require.NotEmpty(t, log.list()[0].RunID)
	require.True(t, s.Unregister("plugin.demo.tick"))
	n := log.len()
	time.Sleep(2500 * time.Millisecond)
	require.LessOrEqual(t, log.len(), n+1) // at most a run already started
	for _, st := range s.NodeStates() {
		require.NotEqual(t, "plugin.demo.tick", st.Name)
	}
	require.ErrorIs(t, s.Trigger(context.Background(), "plugin.demo.tick"), core.ErrTaskUnknown)
}

// A continued run counts as a success and the next part runs with the same
// args; parts never overlap.
func TestTaskContinueRunsTheNextPart(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	spec := clusterSpec("core.test.parts", func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
		if n := log.add(run); n < 3 {
			return core.TaskResult{Count: 10, Message: "part"}, core.TaskContinue(time.Second)
		}
		return core.TaskResult{Count: 1, Message: "done"}, nil
	})
	s := env.service(t, "node-a", nil, spec)
	require.NoError(t, s.Enqueue(context.Background(), "core.test.parts", map[string]int{"from": 0}, core.EnqueueOpts{}))
	waitLong(t, "three parts", 20*time.Second, func() bool { return log.len() == 3 })
	for _, run := range log.list() {
		require.JSONEq(t, `{"from":0}`, string(run.Args))
	}
	waitLong(t, "the last part recorded", 5*time.Second, func() bool {
		rows := jobRows(t, env.db, "core.test.parts")
		return len(rows) == 3 && rows[2].Output != nil
	})
	rows := jobRows(t, env.db, "core.test.parts")
	require.Equal(t, StatusContinued, rows[0].Output.Status)
	require.Equal(t, StatusContinued, rows[1].Output.Status)
	require.Equal(t, StatusSucceeded, rows[2].Output.Status)
	require.Zero(t, readTaskRow(t, env.db, "core.test.parts").Failures)
	time.Sleep(1500 * time.Millisecond)
	require.Equal(t, 3, log.len(), "no part after the last")
}

func TestNodeTaskContinue(t *testing.T) {
	t.Parallel()
	s := newNodeEnv(t).service(t, "node-a", nil)
	var log runLog
	require.NoError(t, s.Register(nodeSpec("core.test.nodeparts", func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
		if log.add(run) == 1 {
			return core.TaskResult{}, core.TaskContinue(time.Second)
		}
		return core.TaskResult{}, nil
	})))
	require.NoError(t, s.Trigger(context.Background(), "core.test.nodeparts"))
	waitFor(t, "the second part", func() bool { return log.len() == 2 })
	waitFor(t, "a success", func() bool {
		for _, st := range s.NodeStates() {
			if st.Name == "core.test.nodeparts" {
				return st.Status == StatusSucceeded && st.ConsecutiveFailures == 0
			}
		}
		return false
	})
}
