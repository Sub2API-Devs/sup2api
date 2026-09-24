package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ---------------------------------------------------------------- fakes

type tokens struct{}

func (tokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	switch tok {
	case "admin":
		return 1, nil
	case "viewer":
		return 2, nil
	}
	return 0, errors.New("bad token")
}

type stepUp struct{}

func (stepUp) VerifyStepUp(context.Context, int64, string) error { return nil }

// authz: user 1 is superuser; user 2 only has plugin.guard:stats:read.
type authz struct{}

func (authz) Can(_ context.Context, uid int64, p string) (bool, error) {
	return uid == 1, nil
}
func (authz) PermissionSet(_ context.Context, uid int64) (core.PermissionSet, error) {
	if uid == 1 {
		return core.PermissionSet{Superuser: true}, nil
	}
	return core.PermissionSet{Keys: map[string]struct{}{"plugin.guard:stats:read": {}}}, nil
}
func (authz) IsSensitive(string) bool { return false }

type noopPerms struct{}

func (noopPerms) SyncPlugin(context.Context, pgx.Tx, string, []core.PermissionDef, []string) error {
	return nil
}
func (noopPerms) SetPluginActive(context.Context, pgx.Tx, string, bool) error { return nil }
func (noopPerms) DeletePlugin(context.Context, pgx.Tx, string) error          { return nil }

type rollout struct {
	db *store.DB
}

func (r rollout) Enable(ctx context.Context, key string, _ int64) (*core.Rollout, error) {
	_, err := r.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'enabled', active_version = '0.1.0' WHERE key = $1`, key)
	return &core.Rollout{ID: 7, PluginKey: key, Action: "enable", Phase: "active", TargetVersion: "0.1.0"}, err
}
func (r rollout) Upgrade(_ context.Context, key, v string, _ int64) (*core.Rollout, error) {
	return &core.Rollout{ID: 8, PluginKey: key, Action: "upgrade", Phase: "preparing", TargetVersion: v}, nil
}
func (r rollout) Disable(ctx context.Context, key string, _ int64, _ string) (*core.Rollout, error) {
	_, err := r.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'disabled' WHERE key = $1`, key)
	return &core.Rollout{ID: 9, PluginKey: key, Action: "disable", Phase: "active"}, err
}
func (r rollout) Current(context.Context, string) (*core.Rollout, error) { return nil, nil }
func (r rollout) Cancel(context.Context, string, int64, int64) error     { return nil }

type nodes struct{}

func (nodes) NodeID() string { return "node-1" }
func (nodes) BootID() string { return "boot-1" }
func (nodes) LiveNodes(context.Context) ([]core.NodeStatus, error) {
	return []core.NodeStatus{
		{NodeID: "node-1", BootID: "boot-1", Plugins: map[string]string{"guard": `{"state":"running","version":"0.1.0","memory_mb":42}`}},
		{NodeID: "node-2", BootID: "boot-2", Plugins: map[string]string{}},
	}, nil
}
func (nodes) IsAlive(context.Context, string) (bool, error)      { return true, nil }
func (nodes) ReportPlugin(context.Context, string, string) error { return nil }
func (nodes) Healthy() bool                                      { return true }

type gen struct{ plugins []core.PluginInfo }

func (g gen) Number() uint64             { return 1 }
func (g gen) Plugins() []core.PluginInfo { return g.plugins }
func (g gen) Plugin(k string) (core.PluginInfo, bool) {
	for _, p := range g.plugins {
		if p.Key == k {
			return p, true
		}
	}
	return core.PluginInfo{}, false
}
func (gen) Endpoints() []core.EndpointBinding            { return nil }
func (gen) Platforms() []core.PlatformBinding            { return nil }
func (gen) Platform(string) (core.PlatformBinding, bool) { return core.PlatformBinding{}, false }
func (gen) PlatformForProtocol(string) (core.PlatformBinding, bool) {
	return core.PlatformBinding{}, false
}
func (gen) AccountTypes() []core.AccountTypeBinding { return nil }
func (gen) AccountType(string, string) (core.AccountTypeBinding, bool) {
	return core.AccountTypeBinding{}, false
}
func (gen) AccountTypesForPlatform(string) []core.AccountTypeBinding { return nil }
func (gen) Hooks(string) []core.HookBinding                          { return nil }
func (gen) Scheduler(string) (core.SchedulerPlugin, bool)            { return nil, false }
func (gen) Routes(string) []core.RouteBinding                        { return nil }
func (gen) Jobs() []core.JobBinding                                  { return nil }
func (gen) Subscriptions() []core.SubscriptionBinding                { return nil }
func (gen) ReadAsset(string, string) ([]byte, string, error)         { return nil, "", errors.New("n/a") }

type registry struct{ g gen }

func (r registry) Current() core.Generation                     { return r.g }
func (registry) OnChange(func(core.Generation)) (cancel func()) { return func() {} }

// ---------------------------------------------------------------- harness

type harness struct {
	t      *testing.T
	engine *gin.Engine
	db     *store.DB
}

func (h *harness) do(method, path, token string, body any) (int, map[string]any) {
	h.t.Helper()
	var rdr *bytes.Reader
	ct := "application/json"
	switch b := body.(type) {
	case nil:
		rdr = bytes.NewReader(nil)
	case *bytes.Buffer:
		rdr = bytes.NewReader(b.Bytes())
	case multipartBody:
		rdr = bytes.NewReader(b.buf.Bytes())
		ct = b.ct
	default:
		raw, _ := json.Marshal(b)
		rdr = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, rdr)
	req.Header.Set("Content-Type", ct)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	h.engine.ServeHTTP(w, req)
	out := map[string]any{}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

type multipartBody struct {
	buf *bytes.Buffer
	ct  string
}

func fileBody(t *testing.T, data []byte) multipartBody {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", "guard.s2plugin")
	if err != nil {
		t.Fatal(err)
	}
	_, _ = fw.Write(data)
	_ = mw.Close()
	return multipartBody{buf: &buf, ct: mw.FormDataContentType()}
}

func newHarness(t *testing.T) (*harness, pkgtest.Key) {
	db := testutil.DB(t)
	ctx := context.Background()
	for _, email := range []string{"admin@x", "viewer@x"} {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, 'x')`, email); err != nil {
			t.Fatal(err)
		}
	}
	root := pkgtest.NewKey("root-1")
	ts, err := pkg.NewTrustStore([]string{root.ID + "=" + root.PubB64()}, false)
	if err != nil {
		t.Fatal(err)
	}
	cfg := config.PluginConfig{MaxPackageBytes: 10 << 20, MaxMemoryMB: 1024}
	svc := install.New(install.Deps{DB: db, Trust: ts, Authz: authz{}, Permissions: noopPerms{},
		Defaults: install.NewDefaultsApplier(noopPerms{}, nil, nil), Rollout: rollout{db}},
		install.Options{HostVersion: "0.1.0", Plugins: cfg})
	cipher, _ := secret.New(bytes.Repeat([]byte{7}, 32))
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	reg := registry{gen{plugins: []core.PluginInfo{{Key: "guard", Version: "0.1.0", Manifest: m, Trust: "official", AssetBase: "/plugin-ui/guard/0.1.0-abc"}}}}
	a := New(Deps{DB: db, Install: svc, Rollout: rollout{db}, Nodes: nodes{}, Registry: reg, Authz: authz{}, Cipher: cipher, Plugins: cfg})
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := httpapi.NewRouter(engine, tokens{}, authz{}, stepUp{})
	a.RegisterRoutes(r)
	return &harness{t: t, engine: engine, db: db}, root
}

func data(out map[string]any) map[string]any {
	d, _ := out["data"].(map[string]any)
	return d
}

func TestAPIFlow(t *testing.T) {
	h, root := newHarness(t)
	ctx := context.Background()
	pkgBytes := pkgtest.Build(pkgtest.Guard("guard", "0.1.0", "sub2api"), root)

	if code, _ := h.do("POST", "/plugins/upload", "viewer", fileBody(t, pkgBytes)); code != http.StatusForbidden {
		t.Fatalf("viewer upload = %d", code)
	}
	code, out := h.do("POST", "/plugins/upload", "admin", fileBody(t, pkgBytes))
	if code != 200 || data(out)["plugin_key"] != "guard" || data(out)["trust"] != "official" {
		t.Fatalf("upload = %d %v", code, out)
	}
	if code, out = h.do("GET", "/plugins/guard/versions/0.1.0/review", "admin", nil); code != 200 {
		t.Fatalf("review = %d %v", code, out)
	}
	if code, _ = h.do("POST", "/plugins/guard/enable", "admin", nil); code != http.StatusConflict {
		t.Fatalf("enable before consent = %d", code)
	}
	consent := install.ConsentRequest{Grants: []install.GrantInput{{Permission: "db.schema"}, {Permission: "gateway.hook"},
		{Permission: "events"}, {Permission: "jobs"}, {Permission: "routes.admin"}, {Permission: "ui.menu"}, {Permission: "ui.native"}}}
	if code, out = h.do("POST", "/plugins/guard/versions/0.1.0/consent", "admin", consent); code != 200 || data(out)["status"] != "installed" {
		t.Fatalf("consent = %d %v", code, out)
	}

	code, out = h.do("GET", "/plugins", "admin", nil)
	list, _ := out["data"].([]any)
	if code != 200 || len(list) != 1 {
		t.Fatalf("list = %d %v", code, out)
	}
	item := list[0].(map[string]any)
	if item["current_version"] != "0.1.0" || item["signature_status"] != "valid" {
		t.Fatalf("item = %v", item)
	}
	// The list and the detail both carry the summary as node_summary.
	if _, ok := item["node_summary"].(map[string]any); !ok || item["nodes"] != nil {
		t.Fatalf("list node summary = %v, nodes = %v", item["node_summary"], item["nodes"])
	}

	if code, out = h.do("POST", "/plugins/guard/enable", "admin", nil); code != 200 || data(out)["id"] != float64(7) {
		t.Fatalf("enable = %d %v", code, out)
	}

	// Settings: schema validation, secret masking, keep-on-mask.
	if code, out = h.do("PUT", "/plugins/guard/settings", "admin", map[string]any{"values": map[string]any{"threshold": -1}}); code != 400 {
		t.Fatalf("invalid settings = %d %v", code, out)
	}
	if code, out = h.do("PUT", "/plugins/guard/settings", "admin", map[string]any{"values": map[string]any{"threshold": 3, "webhook_secret": "s3cret"}}); code != 200 {
		t.Fatalf("put settings = %d %v", code, out)
	}
	vals := data(out)["values"].(map[string]any)
	if vals["webhook_secret"] != Mask || vals["threshold"] != float64(3) || data(out)["mode"] != "schema" {
		t.Fatalf("settings = %v", data(out))
	}
	if code, _ = h.do("PUT", "/plugins/guard/settings", "admin", map[string]any{"values": map[string]any{"threshold": 4, "webhook_secret": Mask}}); code != 200 {
		t.Fatalf("put masked = %d", code)
	}
	var enc []byte
	_ = h.db.Pool.QueryRow(ctx, `SELECT config_enc FROM plugins WHERE key = 'guard'`).Scan(&enc)
	cipher, _ := secret.New(bytes.Repeat([]byte{7}, 32))
	plain, err := cipher.Decrypt(enc, ConfigAAD("guard"))
	if err != nil || !bytes.Contains(plain, []byte(`"webhook_secret":"s3cret"`)) || !bytes.Contains(plain, []byte(`"threshold":4`)) {
		t.Fatalf("stored settings = %s %v", plain, err)
	}

	// Resources and egress policy.
	if code, _ = h.do("PUT", "/plugins/guard/resources", "admin", map[string]any{"memory_mb": 99999}); code != 400 {
		t.Fatalf("resources over cap = %d", code)
	}
	if code, out = h.do("PUT", "/plugins/guard/resources", "admin", map[string]any{"memory_mb": 256}); code != 200 ||
		data(out)["effective"].(map[string]any)["memory_mb"] != float64(256) || data(out)["restart_notified"] != false ||
		data(out)["message"].(map[string]any)["zh"] == "" {
		t.Fatalf("resources = %d %v", code, out)
	}
	if code, _ = h.do("PUT", "/plugins/guard/egress-policy", "admin", map[string]any{"policy": "allowlist"}); code != 200 {
		t.Fatalf("egress policy = %d", code)
	}

	// Seed runtime data.
	now := time.Now().UTC()
	mustExec(t, h.db, `INSERT INTO events (type, payload) VALUES ('usage.recorded', '{}'), ('usage.recorded', '{}'), ('user.created', '{}')`)
	mustExec(t, h.db, `INSERT INTO plugin_event_cursors (plugin_key, last_event_id) VALUES ('guard', 1)`)
	mustExec(t, h.db, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status) VALUES ('guard', 'rollup', 'node-1', $1, $1, 'succeeded')`, now)
	mustExec(t, h.db, `INSERT INTO plugin_egress_logs (plugin_key, node_id, network, host, port, started_at, duration_ms, bytes_in, bytes_out, result)
		VALUES ('guard', 'node-1', 'tcp', 'hooks.example.com', 443, $1, 5, 10, 20, 'ok'), ('guard', 'node-1', 'tcp', 'hooks.example.com', 443, $1, 5, 1, 2, 'denied'),
		       ('guard', 'node-1', 'tcp', 'hooks.example.com', 443, $1, 0, 0, 0, 'open')`, now)
	mustExec(t, h.db, `INSERT INTO plugin_egress_domains (plugin_key, host, first_seen_at, last_seen_at, connections)
		VALUES ('guard', 'hooks.example.com', $1, $1, 3), ('guard', 'old.example.com', $2, $2, 1)`, now, now.Add(-48*time.Hour))

	code, out = h.do("GET", "/plugins/guard", "admin", nil)
	d := data(out)
	if code != 200 || d["status"] != "enabled" || d["egress_policy"] != "allowlist" {
		t.Fatalf("detail = %d %v", code, out)
	}
	if ns, _ := d["nodes"].([]any); len(ns) != 1 {
		t.Fatalf("nodes = %v", d["nodes"])
	}
	if sum, _ := d["node_summary"].(map[string]any); sum["total"] != float64(2) {
		t.Fatalf("node summary = %v", d["node_summary"])
	}
	ev := d["events"].(map[string]any)
	if ev["backlog"] != float64(1) {
		t.Fatalf("events = %v", ev)
	}
	jobs := d["jobs"].([]any)
	if len(jobs) != 2 || jobs[0].(map[string]any)["next_run_at"] == nil {
		t.Fatalf("jobs = %v", jobs)
	}
	if code, out = h.do("GET", "/plugins/guard/egress", "admin", nil); code != 200 {
		t.Fatalf("egress = %d %v", code, out)
	}
	sum := data(out)["summary"].([]any)[0].(map[string]any)
	if sum["count"] != float64(3) || sum["denied"] != float64(1) || sum["open"] != float64(1) || sum["errors"] != float64(0) || sum["bytes_out"] != float64(22) {
		t.Fatalf("egress summary = %v", sum)
	}
	doms := data(out)["domains"].([]any)
	if len(doms) != 2 || doms[0].(map[string]any)["host"] != "hooks.example.com" || doms[0].(map[string]any)["new"] != true ||
		doms[0].(map[string]any)["connections"] != float64(3) || doms[1].(map[string]any)["new"] != false {
		t.Fatalf("egress domains = %v", doms)
	}
	openRows := 0
	for _, it := range data(out)["items"].([]any) {
		if row := it.(map[string]any); row["result"] == "open" {
			openRows++
			if row["closed_at"] != nil {
				t.Fatalf("open row closed_at = %v", row["closed_at"])
			}
		}
	}
	if openRows != 1 {
		t.Fatalf("open egress rows = %d", openRows)
	}
	if code, _ = h.do("POST", "/plugins/guard/jobs/rollup/run", "admin", nil); code != http.StatusServiceUnavailable {
		t.Fatalf("run job without runner = %d", code)
	}

	// UI extensions filtered by permission.
	code, out = h.do("GET", "/ui/plugins", "viewer", nil)
	ui, _ := out["data"].([]any)
	if code != 200 || len(ui) != 1 {
		t.Fatalf("ui = %d %v", code, out)
	}
	u := ui[0].(map[string]any)
	if len(u["menus"].([]any)) != 1 || u["native_entry"] != "ui/native/entry.js" || u["host_ui_compat"] != "^1.0" {
		t.Fatalf("ui item = %v", u)
	}

	// Publishers.
	k := pkgtest.NewKey("acme-1")
	if code, out = h.do("POST", "/publishers", "admin", map[string]any{"name": "acme", "trust_level": "verified",
		"keys": []any{map[string]any{"key_id": k.ID, "public_key": k.PubB64()}}}); code != 201 {
		t.Fatalf("create publisher = %d %v", code, out)
	}
	if code, out = h.do("GET", "/publishers", "admin", nil); code != 200 || len(out["data"].([]any)) != 2 {
		t.Fatalf("publishers = %d %v", code, out)
	}
	if code, out = h.do("POST", "/publisher-keys/acme-1/revoke", "admin", map[string]any{"reason": "test"}); code != 200 {
		t.Fatalf("revoke key = %d %v", code, out)
	}

	// Uninstall (disables first).
	if code, out = h.do("DELETE", "/plugins/guard?purge=true", "admin", nil); code != 200 || out["data"].(map[string]any)["accounts_deleted"] != float64(0) {
		t.Fatalf("uninstall = %d %v", code, out)
	}
	if code, _ = h.do("GET", "/plugins/guard", "admin", nil); code != 404 {
		t.Fatalf("after uninstall = %d", code)
	}
	var n int
	_ = h.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action LIKE 'plugin.%'`).Scan(&n)
	if n < 7 {
		t.Fatalf("audit rows = %d", n)
	}
}

func mustExec(t *testing.T, db *store.DB, sql string, args ...any) {
	t.Helper()
	if _, err := db.Pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(err)
	}
}
