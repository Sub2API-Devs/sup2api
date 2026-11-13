package task

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// permAuth grants the permissions in perms to user uid.
type permAuth struct {
	uid   int64
	perms map[string]bool
}

func (a permAuth) VerifyAccessToken(context.Context, string) (int64, error) { return a.uid, nil }
func (a permAuth) Can(_ context.Context, _ int64, p string) (bool, error)   { return a.perms[p], nil }
func (a permAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	keys := map[string]struct{}{}
	for k, ok := range a.perms {
		if ok {
			keys[k] = struct{}{}
		}
	}
	return core.PermissionSet{Keys: keys}, nil
}
func (a permAuth) CanGrant(context.Context, int64, []string) error { return nil }

type fakeNodes []core.NodeStatus

func (n fakeNodes) LiveNodes(context.Context) ([]core.NodeStatus, error) { return n, nil }

type apiEnv struct {
	clusterEnv
	s   *Service
	uid int64
}

func (e apiEnv) call(t *testing.T, method, path, body string, perms ...string) (int, map[string]any) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := permAuth{uid: e.uid, perms: map[string]bool{}}
	for _, p := range perms {
		auth.perms[p] = true
	}
	e.s.RegisterRoutes(httpapi.NewRouter(engine, auth, auth), fakeNodes{{NodeID: "node-a", BootID: "boot"}, {NodeID: "node-b", BootID: "boot"}})
	req := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer test")
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)
	var out map[string]any
	if rec.Body.Len() > 0 {
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &out), rec.Body.String())
	}
	return rec.Code, out
}

func newAPIEnv(t *testing.T) (apiEnv, *atomic.Int32) {
	env := newClusterEnv(t)
	var flaky atomic.Int32
	ok := clusterSpec("core.test.ok", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		return core.TaskResult{Count: 3, Message: "done"}, nil
	})
	bad := clusterSpec("core.test.bad", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		flaky.Add(1)
		return core.TaskResult{}, errors.New("upstream down")
	})
	bad.MaxAttempts = 2
	node := nodeSpec("core.test.node", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		return core.TaskResult{Count: 1}, nil
	})
	s := env.service(t, "node-a", nil, ok, bad, node)
	require.NoError(t, s.StartNode(t.Context()))
	var uid int64
	require.NoError(t, env.db.Pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ('tasks@test', 'x') RETURNING id`).Scan(&uid))
	return apiEnv{clusterEnv: env, s: s, uid: uid}, &flaky
}

func data(t *testing.T, body map[string]any) map[string]any {
	t.Helper()
	d, ok := body["data"].(map[string]any)
	require.True(t, ok, "%v", body)
	return d
}

func TestTaskAPIPermissions(t *testing.T) {
	t.Parallel()
	e, _ := newAPIEnv(t)
	code, _ := e.call(t, "GET", "/system/tasks", "")
	require.Equal(t, http.StatusForbidden, code)
	code, _ = e.call(t, "POST", "/system/tasks/core.test.ok/run", "", PermRead)
	require.Equal(t, http.StatusForbidden, code)
	code, _ = e.call(t, "GET", "/system/tasks", "", PermRead)
	require.Equal(t, http.StatusOK, code)
}

func TestTaskAPIErrors(t *testing.T) {
	t.Parallel()
	e, _ := newAPIEnv(t)
	for _, tc := range []struct {
		method, path, body string
		status             int
		code               string
	}{
		{"GET", "/system/tasks/core.test.missing", "", 404, "task_not_found"},
		{"GET", "/system/tasks/core.test.missing/runs", "", 404, "task_not_found"},
		{"POST", "/system/tasks/core.test.missing/run", "", 404, "task_not_found"},
		{"GET", "/system/tasks/core.test.node/runs", "", 400, "node_required"},
		{"POST", "/system/tasks/core.test.node/run", `{"node_id":"node-z"}`, 409, "node_offline"},
		{"GET", "/system/tasks/core.test.ok/runs?status=bogus", "", 400, "invalid_argument"},
		{"GET", "/system/tasks/core.test.ok/runs?limit=0", "", 400, "invalid_argument"},
	} {
		code, body := e.call(t, tc.method, tc.path, tc.body, PermRead, PermRun)
		require.Equal(t, tc.status, code, "%s %s: %v", tc.method, tc.path, body)
		require.Equal(t, tc.code, body["error"].(map[string]any)["code"], "%s %s", tc.method, tc.path)
	}
}

func TestTaskAPIOverviewAndRuns(t *testing.T) {
	t.Parallel()
	e, flaky := newAPIEnv(t)
	ctx := context.Background()

	// Three successful runs, one run failing both attempts.
	for i := range 3 {
		require.NoError(t, e.s.Enqueue(ctx, "core.test.ok", map[string]int{"i": i}, core.EnqueueOpts{}))
	}
	require.NoError(t, e.s.Enqueue(ctx, "core.test.bad", nil, core.EnqueueOpts{}))
	waitLong(t, "runs to finish", 15*time.Second, func() bool {
		var n int
		require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM river_job WHERE kind = 'sup2api.task'
			AND args->>'name' LIKE 'core.test.%' AND state IN ('completed', 'discarded')`).Scan(&n))
		return n == 4
	})
	require.EqualValues(t, 2, flaky.Load())

	// A manual node run on this node, recorded in Redis.
	code, body := e.call(t, "POST", "/system/tasks/core.test.node/run", `{"node_id":"node-a"}`, PermRun)
	require.Equal(t, http.StatusAccepted, code, "%v", body)
	waitLong(t, "the node run", 5*time.Second, func() bool {
		runs, err := ReadNodeRuns(ctx, e.rdb, "node-a", "core.test.node")
		require.NoError(t, err)
		return len(runs) == 1
	})

	code, body = e.call(t, "GET", "/system/tasks", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	d := data(t, body)
	summary := d["summary"].(map[string]any)
	require.EqualValues(t, 4, summary["total"]) // ok, bad, housekeeping, node
	require.EqualValues(t, 1, summary["failing"])
	require.EqualValues(t, 1, summary["failed_24h"])
	require.Equal(t, "node-a", summary["leader"])

	cluster := map[string]map[string]any{}
	for _, v := range d["cluster"].([]any) {
		m := v.(map[string]any)
		cluster[m["name"].(string)] = m
	}
	ok := cluster["core.test.ok"]
	require.Equal(t, "测试", ok["title"].(map[string]any)["zh"])
	require.Equal(t, []any{"succeeded", "succeeded", "succeeded"}, ok["recent"])
	require.EqualValues(t, 3, ok["stats_24h"].(map[string]any)["runs"])
	require.Equal(t, "succeeded", ok["last"].(map[string]any)["status"])
	require.EqualValues(t, 3, ok["last"].(map[string]any)["count"])
	bad := cluster["core.test.bad"]
	require.EqualValues(t, 2, bad["consecutive_failures"])
	require.Equal(t, []any{"failed"}, bad["recent"])
	require.NotNil(t, cluster[HousekeepingTask]["next_run_at"])

	nodes := d["nodes"].([]any)
	require.Len(t, nodes, 2)
	nodeA := nodes[0].(map[string]any)
	require.Equal(t, "node-a", nodeA["node_id"])
	tasks := nodeA["tasks"].([]any)
	require.Len(t, tasks, 1)
	require.Equal(t, []any{"succeeded"}, tasks[0].(map[string]any)["recent"])
	require.Empty(t, nodes[1].(map[string]any)["tasks"])

	// Cluster history: newest first, paged, filtered.
	code, body = e.call(t, "GET", "/system/tasks/core.test.ok/runs?limit=2", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	page := data(t, body)
	runs := page["runs"].([]any)
	require.Len(t, runs, 2)
	first := runs[0].(map[string]any)
	require.Equal(t, "node-a", first["node"])
	require.EqualValues(t, 3, first["count"])
	require.Equal(t, "done", first["message"])
	next := page["next_before_id"]
	require.NotNil(t, next)
	code, body = e.call(t, "GET", "/system/tasks/core.test.ok/runs?limit=2&before_id="+jsonNumber(next), "", PermRead)
	require.Equal(t, http.StatusOK, code)
	page = data(t, body)
	require.Len(t, page["runs"].([]any), 1)
	require.Nil(t, page["next_before_id"])

	code, body = e.call(t, "GET", "/system/tasks/core.test.bad/runs?status=failed", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	runs = data(t, body)["runs"].([]any)
	require.Len(t, runs, 1)
	failed := runs[0].(map[string]any)
	require.EqualValues(t, 2, failed["attempt"])
	require.Len(t, failed["errors"].([]any), 2)
	require.Contains(t, failed["error"], "upstream down")
	code, body = e.call(t, "GET", "/system/tasks/core.test.bad/runs?status=succeeded", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	require.Empty(t, data(t, body)["runs"])

	// Node history.
	code, body = e.call(t, "GET", "/system/tasks/core.test.node/runs?node_id=node-a", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	runs = data(t, body)["runs"].([]any)
	require.Len(t, runs, 1)
	require.Equal(t, true, runs[0].(map[string]any)["manual"])

	// Details.
	code, body = e.call(t, "GET", "/system/tasks/core.test.bad", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	detail := data(t, body)
	require.Equal(t, "cluster", detail["scope"])
	require.EqualValues(t, 2, detail["max_attempts"])
	require.NotNil(t, detail["cluster"])
	code, body = e.call(t, "GET", "/system/tasks/core.test.node", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	detail = data(t, body)
	require.Equal(t, "node", detail["scope"])
	require.Len(t, detail["nodes"].([]any), 2)
}

func TestTaskAPIManualClusterRunIsAudited(t *testing.T) {
	t.Parallel()
	e, _ := newAPIEnv(t)
	ctx := context.Background()
	code, body := e.call(t, "POST", "/system/tasks/core.test.ok/run", "", PermRun)
	require.Equal(t, http.StatusAccepted, code, "%v", body)
	waitLong(t, "the manual run", 10*time.Second, func() bool {
		r := readTaskRow(t, e.db, "core.test.ok")
		return r.Status != nil && *r.Status == StatusSucceeded
	})
	var n int
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = $1 AND target_type = 'task'
		AND target_id = 'core.test.ok' AND user_id = $2`, ActionRunManual, e.uid).Scan(&n))
	require.Equal(t, 1, n)
	code, body = e.call(t, "GET", "/system/tasks/core.test.ok/runs", "", PermRead)
	require.Equal(t, http.StatusOK, code)
	runs := data(t, body)["runs"].([]any)
	require.Len(t, runs, 1)
	require.Equal(t, true, runs[0].(map[string]any)["manual"])
}

func jsonNumber(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func TestPatchSwitchesPluginTasksOnly(t *testing.T) {
	t.Parallel()
	e, _ := newAPIEnv(t)
	pluginRow(t, e.db, "plugin.demo.sync", "demo")
	var changed atomic.Int32
	e.bus.Subscribe(core.ChannelTaskChanged, func([]byte) { changed.Add(1) })

	code, _ := e.call(t, http.MethodPatch, "/system/tasks/plugin.demo.sync", `{"enabled":false}`, PermRead, PermRun)
	require.Equal(t, http.StatusForbidden, code)
	code, body := e.call(t, http.MethodPatch, "/system/tasks/plugin.demo.sync", `{"enabled":false}`, PermManage)
	require.Equal(t, http.StatusOK, code, body)
	var enabled bool
	require.NoError(t, e.db.Pool.QueryRow(context.Background(), `SELECT enabled FROM scheduled_tasks WHERE name = 'plugin.demo.sync'`).Scan(&enabled))
	require.False(t, enabled)
	require.EqualValues(t, 1, changed.Load())
	var audits int
	require.NoError(t, e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action = $1 AND target_id = 'plugin.demo.sync'`,
		ActionSetEnable).Scan(&audits))
	require.Equal(t, 1, audits)

	code, body = e.call(t, http.MethodPatch, "/system/tasks/core.test.ok", `{"enabled":false}`, PermManage)
	require.Equal(t, http.StatusBadRequest, code)
	require.Equal(t, "task_not_editable", body["error"].(map[string]any)["code"])
	code, body = e.call(t, http.MethodPatch, "/system/tasks/plugin.demo.none", `{"enabled":false}`, PermManage)
	require.Equal(t, http.StatusNotFound, code, body)
	code, _ = e.call(t, http.MethodPatch, "/system/tasks/plugin.demo.sync", `{}`, PermManage)
	require.Equal(t, http.StatusBadRequest, code)
}
