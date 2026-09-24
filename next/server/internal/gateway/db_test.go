package gateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type allowAll struct{ uid int64 }

func (a allowAll) VerifyAccessToken(context.Context, string) (int64, error) { return a.uid, nil }
func (allowAll) Can(context.Context, int64, string) (bool, error)           { return true, nil }
func (allowAll) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{Superuser: true}, nil
}
func (allowAll) IsSensitive(string) bool                           { return false }
func (allowAll) VerifyStepUp(context.Context, int64, string) error { return nil }

type dbEnv struct {
	t   *testing.T
	db  *store.DB
	gw  *Gateway
	srv *httptest.Server
	mr  *miniredis.Miniredis
	rdb *redis.Client
	uid int64
}

func newDBEnv(t *testing.T) *dbEnv {
	t.Helper()
	db := testutil.DB(t)
	ctx := context.Background()
	e := &dbEnv{t: t, db: db}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ('admin@test', 'x') RETURNING id`).Scan(&e.uid); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"anthropic", "other"} {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'enabled')`, key); err != nil {
			t.Fatal(err)
		}
	}
	e.mr = miniredis.RunT(t)
	e.rdb = redis.NewClient(&redis.Options{Addr: e.mr.Addr()})
	t.Cleanup(func() { _ = e.rdb.Close() })
	e.gw = New(Deps{DB: db, Redis: e.rdb})
	t.Cleanup(e.gw.Close)
	engine := gin.New()
	auth := allowAll{uid: e.uid}
	r := httpapi.NewRouter(engine, auth, auth, auth)
	e.gw.RegisterRoutes(r)
	e.srv = httptest.NewServer(engine)
	t.Cleanup(e.srv.Close)
	return e
}

func (e *dbEnv) api(method, path string, body any) (int, gjson.Result) {
	e.t.Helper()
	var rd *strings.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = strings.NewReader(string(b))
	} else {
		rd = strings.NewReader("")
	}
	req, _ := http.NewRequest(method, e.srv.URL+"/api/v1"+path, rd)
	req.Header.Set("Authorization", "Bearer x")
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, gjson.ParseBytes(b)
}

func (e *dbEnv) sync(plugin string, rules []manifest.StickyRule) {
	e.t.Helper()
	err := e.db.Tx(context.Background(), func(tx pgx.Tx) error {
		return e.gw.SyncPluginDefaults(context.Background(), tx, plugin, rules)
	})
	if err != nil {
		e.t.Fatalf("sync: %v", err)
	}
}

func findRule(list gjson.Result, name, source string) gjson.Result {
	for _, r := range list.Array() {
		if r.Get("name").String() == name && r.Get("source").String() == source {
			return r
		}
	}
	return gjson.Result{}
}

func TestStickyRulesAPIAndPluginDefaults(t *testing.T) {
	e := newDBEnv(t)
	// Built-in defaults are covered by TestBuiltinStickyDefaults.
	if _, err := e.db.Pool.Exec(context.Background(), `DELETE FROM sticky_rules WHERE source = 'builtin'`); err != nil {
		t.Fatal(err)
	}
	def := builtinPlatform(t, "anthropic").StickyRules
	e.sync("anthropic", def)

	code, res := e.api("GET", "/sticky-rules", nil)
	r := findRule(res.Get("data"), "claude-code-session", sourcePluginDefault)
	if code != 200 || !r.Exists() || r.Get("plugin_key").String() != "anthropic" || !r.Get("enabled").Bool() ||
		r.Get("ttl_seconds").Int() != 3600 || r.Get("key_sources.0.path").String() != "metadata.user_id" ||
		r.Get("match.models.0").String() != "claude-*" || r.Get("on_failure").String() != "failover" {
		t.Fatalf("list: %d %s", code, res.Raw)
	}
	id := r.Get("id").Int()

	// Plugin defaults: only enabled/priority are editable, and not deletable.
	if code, res := e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"ttl_seconds": 5}); code != 400 {
		t.Fatalf("patch definition of default: %d %s", code, res.Raw)
	}
	if code, res := e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"enabled": false, "priority": 7}); code != 200 ||
		res.Get("data.enabled").Bool() || res.Get("data.priority").Int() != 7 || res.Get("data.updated_by").Int() != e.uid {
		t.Fatalf("disable default: %d %s", code, res.Raw)
	}
	if code, _ := e.api("DELETE", "/sticky-rules/"+itoa(id), nil); code != 400 {
		t.Fatalf("delete default: %d", code)
	}

	// Upgrade: definition replaced, admin switches kept, new rule added.
	up := []manifest.StickyRule{def[0], {Name: "second", KeySources: []manifest.StickyKeySource{{Type: "api_key"}}}}
	up[0].TTLSeconds = 600
	e.sync("anthropic", up)
	_, res = e.api("GET", "/sticky-rules", nil)
	r = findRule(res.Get("data"), "claude-code-session", sourcePluginDefault)
	if r.Get("ttl_seconds").Int() != 600 || r.Get("enabled").Bool() || r.Get("priority").Int() != 7 || r.Get("id").Int() != id {
		t.Fatalf("after upgrade: %s", r.Raw)
	}
	if s := findRule(res.Get("data"), "second", sourcePluginDefault); !s.Exists() || s.Get("key_includes.#").Int() != 3 {
		t.Fatalf("second rule: %s", res.Raw)
	}
	// Another plugin cannot take over a name.
	e.sync("other", []manifest.StickyRule{{Name: "second", KeySources: []manifest.StickyKeySource{{Type: "user"}}}})
	_, res = e.api("GET", "/sticky-rules", nil)
	if s := findRule(res.Get("data"), "second", sourcePluginDefault); s.Get("plugin_key").String() != "anthropic" {
		t.Fatalf("name hijacked: %s", s.Raw)
	}

	// Admin rules: validation, create, conflict, shadowing.
	code, res = e.api("POST", "/sticky-rules", map[string]any{"name": "bad name!", "key_sources": []any{map[string]any{"type": "cookie"}},
		"value_regex": "(", "on_failure": "maybe"})
	if code != 400 || res.Get("error.details.fields.#").Int() < 4 {
		t.Fatalf("validation: %d %s", code, res.Raw)
	}
	code, res = e.api("POST", "/sticky-rules", map[string]any{"name": "claude-code-session", "priority": 1,
		"match":       map[string]any{"protocols": []string{"anthropic.messages"}, "user_agent_contains": []string{"claude-cli"}},
		"key_sources": []any{map[string]any{"type": "header", "name": "x-session-id"}}, "on_failure": "stick"})
	if code != 201 || res.Get("data.source").String() != sourceAdmin || res.Get("data.match.user_agent_contains.0").String() != "claude-cli" ||
		res.Get("data.plugin_key").Type != gjson.Null {
		t.Fatalf("create: %d %s", code, res.Raw)
	}
	adminID := res.Get("data.id").Int()
	if code, _ := e.api("POST", "/sticky-rules", map[string]any{"name": "claude-code-session",
		"key_sources": []any{map[string]any{"type": "user"}}}); code != 409 {
		t.Fatalf("duplicate: %d", code)
	}
	// Re-enable the plugin default: the admin rule of the same name shadows it.
	e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"enabled": true})
	e.gw.rules.invalidate()
	active := e.gw.rules.get(context.Background())
	if len(active) != 2 || active[0].Source != sourceAdmin || active[0].Name != "claude-code-session" || active[1].Name != "second" {
		t.Fatalf("active rules: %+v", active)
	}
	if code, res := e.api("PATCH", "/sticky-rules/"+itoa(adminID), map[string]any{"ttl_seconds": 120, "value_regex": "^(.*)$"}); code != 200 ||
		res.Get("data.ttl_seconds").Int() != 120 || res.Get("data.on_failure").String() != "stick" {
		t.Fatalf("patch admin: %d %s", code, res.Raw)
	}

	// Stats and flush.
	ctx := context.Background()
	e.rdb.HSet(ctx, stickyStatsKey("claude-code-session"), "hits", 4, "misses", 2, "rebinds", 1)
	for _, k := range []string{"sticky:claude-code-session:3:m:aa", "sticky:claude-code-session:4:m:bb", "sticky:second:3:m:cc"} {
		e.rdb.Set(ctx, k, "1", 0)
	}
	code, res = e.api("GET", "/sticky-rules/stats", nil)
	var hits int64
	for _, s := range res.Get("data").Array() {
		if s.Get("rule").String() == "claude-code-session" {
			hits = s.Get("hits").Int()
			if s.Get("misses").Int() != 2 || s.Get("rebinds").Int() != 1 {
				t.Fatalf("stat %s", s.Raw)
			}
		}
	}
	if code != 200 || hits != 4 || res.Get("data.#").Int() != 3 {
		t.Fatalf("stats: %d %s", code, res.Raw)
	}
	code, res = e.api("POST", "/sticky-rules/"+itoa(adminID)+"/flush", nil)
	if code != 200 || res.Get("data.deleted").Int() != 2 || !e.mr.Exists("sticky:second:3:m:cc") || e.mr.Exists("sticky:claude-code-session:3:m:aa") {
		t.Fatalf("flush: %d %s keys=%v", code, res.Raw, e.mr.Keys())
	}
	// A rule whose key has no "rule" segment shares bindings: flush is refused.
	code, res = e.api("POST", "/sticky-rules", map[string]any{"name": "shared-bindings",
		"key_sources": []any{map[string]any{"type": "user"}}, "key_includes": []string{"group", "model"}})
	if code != 201 {
		t.Fatalf("create shared rule: %d %s", code, res.Raw)
	}
	sharedID := res.Get("data.id").Int()
	if code, res = e.api("POST", "/sticky-rules/"+itoa(sharedID)+"/flush", nil); code != 409 {
		t.Fatalf("flush shared: %d %s", code, res.Raw)
	}
	if code, _ := e.api("DELETE", "/sticky-rules/"+itoa(sharedID), nil); code != 204 {
		t.Fatalf("delete shared: %d", code)
	}

	// Delete the admin rule; stats survive because the default still uses the name.
	if code, _ := e.api("DELETE", "/sticky-rules/"+itoa(adminID), nil); code != 204 {
		t.Fatalf("delete admin: %d", code)
	}
	if !e.mr.Exists(stickyStatsKey("claude-code-session")) {
		t.Fatal("stats of a still-used name deleted")
	}
	if code, _ := e.api("DELETE", "/sticky-rules/999999", nil); code != 404 {
		t.Fatalf("delete missing: %d", code)
	}

	// Removing a rule from the manifest deletes it; uninstall cascades.
	e.sync("anthropic", up[1:])
	_, res = e.api("GET", "/sticky-rules", nil)
	if findRule(res.Get("data"), "claude-code-session", sourcePluginDefault).Exists() {
		t.Fatalf("removed default kept: %s", res.Raw)
	}
	if _, err := e.db.Pool.Exec(ctx, `DELETE FROM plugins WHERE key = 'anthropic'`); err != nil {
		t.Fatal(err)
	}
	if _, res = e.api("GET", "/sticky-rules", nil); res.Get("data.#").Int() != 0 {
		t.Fatalf("after uninstall: %s", res.Raw)
	}
}

func TestStickySettingsAPI(t *testing.T) {
	e := newDBEnv(t)
	code, res := e.api("GET", "/settings/sticky", nil)
	if code != 200 || !res.Get("data.enabled").Bool() || res.Get("data.default_ttl_seconds").Int() != 3600 ||
		res.Get("data.keep_on_account_disabled").Bool() {
		t.Fatalf("defaults: %d %s", code, res.Raw)
	}
	if code, _ := e.api("PUT", "/settings/sticky", map[string]any{"default_ttl_seconds": 0}); code != 400 {
		t.Fatalf("invalid ttl: %d", code)
	}
	code, res = e.api("PUT", "/settings/sticky", map[string]any{"enabled": false, "keep_on_account_disabled": true})
	if code != 200 || res.Get("data.enabled").Bool() || !res.Get("data.keep_on_account_disabled").Bool() ||
		res.Get("data.default_ttl_seconds").Int() != 3600 {
		t.Fatalf("put: %d %s", code, res.Raw)
	}
	_, st := e.gw.settings.get(context.Background())
	if st.Enabled || !st.KeepOnAccountDisabled {
		t.Fatalf("settings cache not refreshed: %+v", st)
	}

	// The gateway row is read with defaults for missing fields.
	if _, err := e.db.Pool.Exec(context.Background(),
		`INSERT INTO settings (key, value) VALUES ('gateway', '{"max_attempts": 5}')`); err != nil {
		t.Fatal(err)
	}
	e.gw.settings.invalidate()
	gw, _ := e.gw.settings.get(context.Background())
	if gw.MaxAttempts != 5 || gw.PlatformCallTimeoutMs != 2000 || gw.DefaultHookTimeoutMs != 300 {
		t.Fatalf("gateway settings %+v", gw)
	}
}

func TestGatewaySettingsAPIDB(t *testing.T) {
	e := newDBEnv(t)
	code, res := e.api("GET", "/settings/gateway", nil)
	if code != 200 || res.Get("data.max_attempts").Int() != 3 || res.Get("data.platform_call_timeout_ms").Int() != 2000 {
		t.Fatalf("defaults: %d %s", code, res.Raw)
	}
	if code, res := e.api("PUT", "/settings/gateway", map[string]any{"max_attempts": 11}); code != 400 ||
		res.Get("error.details.fields.0.field").String() != "max_attempts" {
		t.Fatalf("invalid: %d %s", code, res.Raw)
	}
	code, res = e.api("PUT", "/settings/gateway", map[string]any{"max_attempts": 4, "platform_call_timeout_ms": 5000})
	if code != 200 || res.Get("data.max_attempts").Int() != 4 || res.Get("data.default_hook_timeout_ms").Int() != 300 {
		t.Fatalf("put: %d %s", code, res.Raw)
	}
	gw, _ := e.gw.settings.get(context.Background())
	if gw.MaxAttempts != 4 || gw.PlatformCallTimeoutMs != 5000 {
		t.Fatalf("settings cache not refreshed: %+v", gw)
	}
	var by *int64
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT updated_by FROM settings WHERE key = 'gateway'`).Scan(&by); err != nil || by == nil || *by != e.uid {
		t.Fatalf("updated_by %v %v", by, err)
	}
}

// End to end with DB-backed rules: the default rule synced from the
// manifest drives scheduling.
func TestStickyRulesFromDBDriveScheduling(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('anthropic', '{"en":"x"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	e := newEnv(t)
	e.gw.rules = newRuleCache(db)
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		return e.gw.SyncPluginDefaults(ctx, tx, "anthropic", builtinPlatform(t, "anthropic").StickyRules)
	}); err != nil {
		t.Fatal(err)
	}
	e.setSettings(defaultGatewaySettings(), StickySettings{Enabled: true, DefaultTTLSeconds: 60})
	sess := withSession(body(testModel, false), "db-session")
	e.messages(sess)
	e.record()
	e.accounts.mu.Lock()
	e.accounts.accounts[3].Priority = 0
	e.accounts.mu.Unlock()
	e.messages(sess)
	if rec := e.record(); !rec.StickyHit || rec.StickyRule != "claude-code-session" || e.up.last().key != "acc-1" {
		t.Fatalf("db rule not applied: %+v via %s", rec, e.up.last().key)
	}
}

// The gateway writes the built-in platforms' default rules at start
// (source=builtin, no plugin key); administrators only switch and reorder
// them, and an admin rule of the same name overrides one.
func TestBuiltinStickyDefaults(t *testing.T) {
	e := newDBEnv(t)
	ctx := context.Background()
	_, res := e.api("GET", "/sticky-rules", nil)
	var want []string
	for _, p := range platforms.Builtin() {
		for _, r := range p.StickyRules {
			want = append(want, r.Name)
			got := findRule(res.Get("data"), r.Name, sourceBuiltin)
			if !got.Exists() || got.Get("plugin_key").Type != gjson.Null || !got.Get("enabled").Bool() {
				t.Fatalf("builtin rule %s: %s", r.Name, res.Raw)
			}
		}
	}
	if len(want) == 0 {
		t.Skip("no built-in sticky rules")
	}
	r := findRule(res.Get("data"), want[0], sourceBuiltin)
	id := r.Get("id").Int()
	if code, _ := e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"ttl_seconds": 5}); code != 400 {
		t.Fatalf("patch builtin definition: %d", code)
	}
	if code, _ := e.api("DELETE", "/sticky-rules/"+itoa(id), nil); code != 400 {
		t.Fatalf("delete builtin: %d", code)
	}
	if code, res := e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"enabled": false, "priority": 3}); code != 200 ||
		res.Get("data.enabled").Bool() {
		t.Fatalf("disable builtin: %d %s", code, res.Raw)
	}

	// A restart keeps the administrator's switches, drops stale built-in
	// rules and leaves plugin defaults of the same name alone.
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO sticky_rules (name, source, key_sources) VALUES ('stale', 'builtin', '[]')`); err != nil {
		t.Fatal(err)
	}
	e.sync("anthropic", []manifest.StickyRule{{Name: want[0], KeySources: []manifest.StickyKeySource{{Type: "user"}}}})
	if err := e.gw.SyncBuiltinDefaults(ctx); err != nil {
		t.Fatal(err)
	}
	_, res = e.api("GET", "/sticky-rules", nil)
	r = findRule(res.Get("data"), want[0], sourceBuiltin)
	if r.Get("id").Int() != id || r.Get("enabled").Bool() || r.Get("priority").Int() != 3 {
		t.Fatalf("after restart: %s", r.Raw)
	}
	if findRule(res.Get("data"), "stale", sourceBuiltin).Exists() || !findRule(res.Get("data"), want[0], sourcePluginDefault).Exists() {
		t.Fatalf("stale or plugin rule: %s", res.Raw)
	}
	// Re-enabled, the built-in rule shadows the plugin default of the same name.
	e.api("PATCH", "/sticky-rules/"+itoa(id), map[string]any{"enabled": true})
	e.gw.rules.invalidate()
	for _, a := range e.gw.rules.get(ctx) {
		if a.Name == want[0] && a.Source != sourceBuiltin {
			t.Fatalf("active %s from %s", a.Name, a.Source)
		}
	}
}
