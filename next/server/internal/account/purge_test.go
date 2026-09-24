package account

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

func TestMyPlatformViews(t *testing.T) {
	g := testGen(&fakePlatform{})
	vs := myPlatformViews(g)
	var ids []string
	for _, v := range vs {
		ids = append(ids, v.ID)
	}
	if strings.Join(ids, ",") != "anthropic,openai,aivideo" {
		t.Fatalf("order: %v", ids)
	}
	if vs[0].Label["en"] != "Anthropic" || !vs[0].Builtin || len(vs[0].Endpoints) != 2 ||
		vs[0].Endpoints[1].Path != "/v1/messages/count_tokens" || vs[0].Endpoints[1].Billing != "free" {
		t.Fatalf("anthropic: %+v", vs[0])
	}
	if vs[2].Builtin || vs[2].Endpoints[0].Protocol != "aivideo.gen" {
		t.Fatalf("aivideo: %+v", vs[2])
	}
	raw, _ := json.Marshal(vs)
	for _, k := range []string{"account_types", "plugin_key", "plugin_name"} {
		if gjson.GetBytes(raw, "0."+k).Exists() || gjson.GetBytes(raw, "2."+k).Exists() {
			t.Fatalf("%s leaked: %s", k, raw)
		}
	}
	if gjson.GetBytes(raw, "1.endpoints.0.method").String() != "POST" || gjson.GetBytes(raw, "1.label.en").String() != "OpenAI" {
		t.Fatalf("json: %s", raw)
	}
	if out := myPlatformViews(nil); out == nil || len(out) != 0 {
		t.Fatalf("nil generation: %v", out)
	}
	if raw, _ := json.Marshal(myPlatformViews(&fakeGen{})); string(raw) != "[]" {
		t.Fatalf("empty generation: %s", raw)
	}
}

type denyAll struct{}

func (denyAll) Can(context.Context, int64, string) (bool, error) { return false, nil }
func (denyAll) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (denyAll) IsSensitive(string) bool { return false }

// TestMyPlatformsRoute: /me/platforms only needs a signed-in user.
func TestMyPlatformsRoute(t *testing.T) {
	gin.SetMode(gin.TestMode)
	reg := &fakeRegistry{}
	reg.set(testGen(&fakePlatform{}))
	s := New(Deps{Registry: reg, Converters: fakeConverters{}})
	engine := gin.New()
	s.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, denyAll{}, noStepUp{}))
	call := func(path, auth string) (int, string) {
		req := httptest.NewRequest("GET", path, nil)
		if auth != "" {
			req.Header.Set("Authorization", auth)
		}
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		return w.Code, w.Body.String()
	}
	code, body := call("/api/v1/me/platforms", "Bearer u7")
	if code != 200 || len(gjson.Get(body, "data").Array()) != 3 || gjson.Get(body, "data.0.account_types").Exists() {
		t.Fatalf("me/platforms: %d %s", code, body)
	}
	if code, _ := call("/api/v1/platforms", "Bearer u7"); code != 403 {
		t.Fatalf("/platforms without account:read: %d", code)
	}
	if code, _ := call("/api/v1/me/platforms", ""); code != 401 {
		t.Fatalf("anonymous: %d", code)
	}
}

func TestPurgePluginAccounts(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	g1 := e.exec1(`INSERT INTO groups (name) VALUES ('default') RETURNING id`)
	var ids []int64
	for _, name := range []string{"a1", "a2"} {
		code, out := e.do("POST", "/accounts", map[string]any{"name": name, "plugin_key": "anthropic", "type": "apikey",
			"group_ids": []int64{g1}, "credentials": map[string]any{"api_key": "sk-good-key-123"}})
		if code != 201 {
			t.Fatalf("create %s: %d %v", name, code, out)
		}
		ids = append(ids, int64(out["data"].(map[string]any)["id"].(float64)))
	}
	relay := e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc) VALUES ('r1', 'relay', 'relay_key', '\x00') RETURNING id`)
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO account_groups (account_id, group_id) VALUES ($1, $2)`, relay, g1); err != nil {
		t.Fatal(err)
	}
	// An already deleted account of the plugin is not counted again.
	gone := e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, deleted_at) VALUES ('old', 'anthropic', 'apikey', '\x00', now()) RETURNING id`)
	// Warm the directory cache so the purge must invalidate it.
	if refs, err := e.svc.Candidates(ctx, g1, nil); err != nil || len(refs) != 3 {
		t.Fatalf("candidates before: %v %v", refs, err)
	}
	e.mr.Set(cooldownKey(ids[0]), "1")
	sent := e.bus.count()

	n, err := e.svc.PurgePluginAccounts(ctx, "anthropic")
	if err != nil || n != 2 {
		t.Fatalf("purge: %d %v", n, err)
	}
	var live, links int64
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM accounts WHERE plugin_key = 'anthropic' AND deleted_at IS NULL`).Scan(&live)
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM account_groups WHERE account_id = ANY($1)`, ids).Scan(&links)
	if live != 0 || links != 0 {
		t.Fatalf("live=%d links=%d", live, links)
	}
	var relayLinks int64
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM account_groups WHERE account_id = $1`, relay).Scan(&relayLinks)
	if relayLinks != 1 {
		t.Fatal("other plugin's account touched")
	}
	var deleted int64
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM events WHERE type = 'account.deleted' AND payload->>'plugin_key' = 'anthropic'
		AND (payload->>'account_id')::bigint = ANY($1) AND payload->>'type' = 'apikey'`, ids).Scan(&deleted)
	if deleted != 2 {
		t.Fatalf("account.deleted events = %d", deleted)
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM events WHERE (payload->>'account_id')::bigint = $1`, gone).Scan(&deleted)
	if deleted != 0 {
		t.Fatal("event for an account deleted earlier")
	}
	if e.mr.Exists(cooldownKey(ids[0])) {
		t.Fatal("cooldown not cleared")
	}
	if e.bus.count() != sent+1 {
		t.Fatalf("account:changed broadcasts = %d", e.bus.count()-sent)
	}
	if refs, err := e.svc.Candidates(ctx, g1, nil); err != nil || len(refs) != 1 || refs[0].ID != relay {
		t.Fatalf("candidates after: %v %v", refs, err)
	}
	// Idempotent; empty key rejected.
	if n, err := e.svc.PurgePluginAccounts(ctx, "anthropic"); err != nil || n != 0 {
		t.Fatalf("second purge: %d %v", n, err)
	}
	if _, err := e.svc.PurgePluginAccounts(ctx, ""); core.AsError(err).Code != "invalid_argument" {
		t.Fatalf("empty key: %v", err)
	}
}
