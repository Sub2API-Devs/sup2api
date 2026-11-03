package job

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestRuntimeTasksSyncAndRun(t *testing.T) {
	t.Parallel()
	e := newEnv(t)
	ctx := context.Background()
	p := e.plugin(t, "demo", "1.0.0", manifest.Job{ID: "cleanup", Schedule: "0 3 * * *"})
	app := &fakeApp{}
	n := e.node(t, "node-a", p, app)
	other := e.node(t, "node-b", nil, nil)

	ignored, err := n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{
		{ID: "evaluate", Schedule: "@every 10s", Args: json.RawMessage(`{"window": 10}`)},
		{ID: "review", TimeoutSec: 120},
	})
	require.NoError(t, err)
	require.False(t, ignored)
	row, ok := readTask(t, e.db, "plugin.demo.evaluate")
	require.True(t, ok)
	require.Equal(t, scheduledRow{Source: "plugin_runtime", Schedule: "@every 10s", TimeoutMS: 60000, MaxAttempts: 1}, row)
	review, _ := readTask(t, e.db, "plugin.demo.review")
	require.Equal(t, "", review.Schedule)
	require.EqualValues(t, 120000, review.TimeoutMS)
	require.True(t, registered(n, "plugin.demo.evaluate"), "registered on the calling node at once")
	waitFor(t, "the other node to follow task:changed", 5*time.Second, func() bool { return registered(other, "plugin.demo.review") })

	// The same tasks again change nothing (jsonb reformats the args).
	var before time.Time
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT updated_at FROM scheduled_tasks WHERE name = 'plugin.demo.evaluate'`).Scan(&before))
	_, err = n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{
		{ID: "evaluate", Schedule: "@every 10s", Args: json.RawMessage(`{"window":10}`)},
		{ID: "review", TimeoutSec: 120},
	})
	require.NoError(t, err)
	var after time.Time
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT updated_at FROM scheduled_tasks WHERE name = 'plugin.demo.evaluate'`).Scan(&after))
	require.Equal(t, before, after)

	// A periodic run gets the task's args.
	waitFor(t, "a periodic run of evaluate", 25*time.Second, func() bool {
		for _, c := range app.snapshot() {
			if c.GetJobId() == "evaluate" {
				return true
			}
		}
		return false
	})
	for _, c := range app.snapshot() {
		if c.GetJobId() == "evaluate" {
			require.JSONEq(t, `{"window":10}`, string(c.GetArgs()))
			require.Equal(t, "cluster", c.GetScope())
		}
	}

	// An enqueued run brings its own args; a unique key keeps one waiting.
	at := core.EnqueueOpts{RunAt: time.Now().Add(time.Hour), UniqueKey: "r1"}
	require.NoError(t, n.bridge.EnqueuePluginTask(ctx, "demo", "review", json.RawMessage(`{"id":1}`), at))
	require.NoError(t, n.bridge.EnqueuePluginTask(ctx, "demo", "review", json.RawMessage(`{"id":1}`), at))
	var waiting int
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM river_job WHERE args->>'name' = 'plugin.demo.review'`).Scan(&waiting))
	require.Equal(t, 1, waiting)
	require.NoError(t, n.bridge.EnqueuePluginTask(ctx, "demo", "review", json.RawMessage(`{"id":2}`), core.EnqueueOpts{}))
	waitFor(t, "the enqueued run", 10*time.Second, func() bool {
		for _, c := range app.snapshot() {
			if c.GetJobId() == "review" && jsonEqual(string(c.GetArgs()), `{"id":2}`) {
				return true
			}
		}
		return false
	})
	// A cluster manifest job can be enqueued too.
	require.NoError(t, n.bridge.EnqueuePluginTask(ctx, "demo", "cleanup", nil, core.EnqueueOpts{}))
	requireCode(t, n.bridge.EnqueuePluginTask(ctx, "demo", "nope", nil, core.EnqueueOpts{}), core.ErrNotFound)
	requireCode(t, n.bridge.EnqueuePluginTask(ctx, "demo", "review", json.RawMessage(`{`), core.EnqueueOpts{}), core.ErrInvalidArgument)

	list, err := n.bridge.ListPluginTasks(ctx, "demo")
	require.NoError(t, err)
	require.Len(t, list, 2)
	require.Equal(t, "evaluate", list[0].ID)
	require.True(t, list[0].Enabled)
	require.JSONEq(t, `{"window":10}`, string(list[0].Args))

	// Sync with fewer tasks removes the others.
	_, err = n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{{ID: "review"}})
	require.NoError(t, err)
	_, ok = readTask(t, e.db, "plugin.demo.evaluate")
	require.False(t, ok)
	require.False(t, registered(n, "plugin.demo.evaluate"))
	ignored, deleted, err := n.bridge.DeletePluginTask(ctx, "demo", "1.0.0", "review")
	require.NoError(t, err)
	require.False(t, ignored)
	require.True(t, deleted)
}

func TestRuntimeTasksRules(t *testing.T) {
	t.Parallel()
	e := newEnv(t)
	ctx := context.Background()
	p := e.plugin(t, "demo", "2.0.0", manifest.Job{ID: "cleanup", Schedule: "0 3 * * *"})
	n := e.node(t, "node-a", p, &fakeApp{})

	// Another version's instance (a rollout) changes nothing.
	ignored, err := n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{{ID: "a"}})
	require.NoError(t, err)
	require.True(t, ignored)
	_, ok := readTask(t, e.db, "plugin.demo.a")
	require.False(t, ok)

	bad := []core.PluginTask{
		{ID: "cleanup"},                          // a manifest job
		{ID: "Bad"},                              // id format
		{ID: "a", Schedule: "@every 5s"},         // too frequent
		{ID: "a", Schedule: "not a schedule"},    // invalid
		{ID: "a", TimeoutSec: 3601},              // too long
		{ID: "a", Args: json.RawMessage(`{"x"`)}, // not JSON
	}
	for _, task := range bad {
		_, err := n.bridge.UpsertPluginTask(ctx, "demo", "2.0.0", task)
		requireCode(t, err, core.ErrInvalidArgument)
	}
	_, err = n.bridge.SyncPluginTasks(ctx, "demo", "2.0.0", []core.PluginTask{{ID: "a"}, {ID: "a"}})
	requireCode(t, err, core.ErrInvalidArgument)
	many := make([]core.PluginTask, MaxRuntimeTasks+1)
	for i := range many {
		many[i] = core.PluginTask{ID: fmt.Sprintf("t%d", i)}
	}
	_, err = n.bridge.SyncPluginTasks(ctx, "demo", "2.0.0", many)
	requireCode(t, err, core.ErrRateLimited)
	_, err = n.bridge.SyncPluginTasks(ctx, "nope", "1.0.0", nil)
	requireCode(t, err, core.ErrNotFound)
}

// A task the console stopped is not registered; uninstalling the plugin
// removes its runtime tasks, disabling it keeps them.
func TestRuntimeTasksSwitchAndUninstall(t *testing.T) {
	t.Parallel()
	e := newEnv(t)
	ctx := context.Background()
	p := e.plugin(t, "demo", "1.0.0")
	n := e.node(t, "node-a", p, &fakeApp{})
	_, err := n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{{ID: "a", Schedule: "@every 1h"}})
	require.NoError(t, err)
	require.True(t, registered(n, "plugin.demo.a"))

	_, err = e.db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET enabled = false WHERE name = 'plugin.demo.a'`)
	require.NoError(t, err)
	require.NoError(t, n.bridge.reconcile(ctx))
	require.False(t, registered(n, "plugin.demo.a"))
	requireCode(t, n.bridge.EnqueuePluginTask(ctx, "demo", "a", nil, core.EnqueueOpts{}), core.ErrNotFound)
	// Sync keeps the switch.
	_, err = n.bridge.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{{ID: "a", Schedule: "@every 2h"}})
	require.NoError(t, err)
	list, err := n.bridge.ListPluginTasks(ctx, "demo")
	require.NoError(t, err)
	require.False(t, list[0].Enabled)
	require.Equal(t, "@every 2h0m0s", list[0].Schedule)

	_, err = e.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'disabled' WHERE key = 'demo'`)
	require.NoError(t, err)
	require.NoError(t, n.bridge.reconcile(ctx))
	_, ok := readTask(t, e.db, "plugin.demo.a")
	require.True(t, ok, "a disabled plugin keeps its runtime tasks")

	_, err = e.db.Pool.Exec(ctx, `DELETE FROM plugins WHERE key = 'demo'`)
	require.NoError(t, err)
	require.NoError(t, n.bridge.reconcile(ctx))
	_, ok = readTask(t, e.db, "plugin.demo.a")
	require.False(t, ok)
}

// The plugin runtime serves task calls before the background starts: the
// rows are written and registered once the bridge starts.
func TestRuntimeTasksBeforeStart(t *testing.T) {
	t.Parallel()
	e := newEnv(t)
	ctx := context.Background()
	p := e.plugin(t, "demo", "1.0.0")
	reg := &fakeRegistry{}
	reg.set(p, &fakeApp{})
	b := New(e.db, reg, e.bus, nil, "node-a", Options{Version: "test", Resync: time.Hour})
	ignored, err := b.SyncPluginTasks(ctx, "demo", "1.0.0", []core.PluginTask{{ID: "a", Schedule: "@every 1h"}})
	require.NoError(t, err)
	require.False(t, ignored)
	_, ok := readTask(t, e.db, "plugin.demo.a")
	require.True(t, ok)
	requireCode(t, b.EnqueuePluginTask(ctx, "demo", "a", nil, core.EnqueueOpts{}), core.ErrUnavailable)
}
