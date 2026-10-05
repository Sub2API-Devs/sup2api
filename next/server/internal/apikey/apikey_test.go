package apikey

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

// fakeAuthz: admin can do anything; everyone else has apikey:self:manage and
// gateway:use unless listed in noGateway.
type fakeAuthz struct {
	admin     int64
	noGateway map[int64]bool
}

func (a *fakeAuthz) Can(_ context.Context, uid int64, p string) (bool, error) {
	if uid == a.admin {
		return true, nil
	}
	switch p {
	case "apikey:self:manage":
		return true, nil
	case "gateway:use":
		return !a.noGateway[uid], nil
	}
	return false, nil
}
func (a *fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (*fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (*fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }

// fakeGen implements the parts of core.Generation used for key platforms.
type fakeGen struct {
	core.Generation
	plats []string
	types []core.AccountTypeBinding
}

func (g *fakeGen) Platform(id string) (core.PlatformBinding, bool) {
	for _, p := range g.plats {
		if p == id {
			return core.PlatformBinding{Platform: manifest.Platform{ID: id}}, true
		}
	}
	return core.PlatformBinding{}, false
}

func (g *fakeGen) AccountType(pluginKey, typ string) (core.AccountTypeBinding, bool) {
	for _, b := range g.types {
		if b.Plugin.Key == pluginKey && b.Type.ID == typ {
			return b, true
		}
	}
	return core.AccountTypeBinding{}, false
}

type fakeRegistry struct{ gen core.Generation }

func (r fakeRegistry) Current() core.Generation                     { return r.gen }
func (fakeRegistry) OnChange(func(core.Generation)) (cancel func()) { return func() {} }

func accountType(plugin, id string, platforms ...string) core.AccountTypeBinding {
	b := core.AccountTypeBinding{Plugin: core.PluginInfo{Key: plugin}, Type: manifest.AccountType{ID: id}}
	for _, p := range platforms {
		b.Type.Platforms = append(b.Type.Platforms, manifest.AccountPlatform{Platform: p})
	}
	return b
}

// testGen: anthropic/apikey serves anthropic; relay/relay_key serves openai,
// anthropic and the unavailable "ghost".
func testGen() *fakeGen {
	return &fakeGen{
		plats: []string{"anthropic", "openai", "gemini"},
		types: []core.AccountTypeBinding{
			accountType("anthropic", "apikey", "anthropic"),
			accountType("relay", "relay_key", "openai", "anthropic", "ghost"),
		},
	}
}

func TestPlatformsOf(t *testing.T) {
	key := func(p, typ string) core.AccountTypeKey { return core.AccountTypeKey{PluginKey: p, Type: typ} }
	g := testGen()
	for _, c := range []struct {
		types []core.AccountTypeKey
		want  string
	}{
		{nil, "[]"},
		{[]core.AccountTypeKey{key("anthropic", "apikey")}, "[anthropic]"},
		{[]core.AccountTypeKey{key("relay", "relay_key"), key("anthropic", "apikey")}, "[anthropic openai]"},
		{[]core.AccountTypeKey{key("gone", "apikey"), key("relay", "apikey")}, "[]"},
	} {
		if got := platformsOf(g, c.types); got == nil || fmt.Sprint(got) != c.want {
			t.Errorf("platformsOf(%v) = %v, want %s", c.types, got, c.want)
		}
	}
	if got := platformsOf(nil, []core.AccountTypeKey{key("anthropic", "apikey")}); got == nil || len(got) != 0 {
		t.Fatalf("nil generation: %v", got)
	}
}

func TestFillPlatformsWithoutRegistry(t *testing.T) {
	// No registry (or no generation): no database access, platforms are [].
	for _, s := range []*Service{New(nil, nil, nil, nil), New(nil, nil, nil, fakeRegistry{})} {
		keys := []*APIKey{{GroupID: 1}, {GroupID: 2}}
		if err := s.fillPlatforms(context.Background(), keys); err != nil {
			t.Fatal(err)
		}
		b, _ := json.Marshal(keys)
		if strings.Count(string(b), `"platforms":[]`) != 2 {
			t.Fatalf("json: %s", b)
		}
	}
}

type env struct {
	t     *testing.T
	db    *store.DB
	svc   *Service
	h     http.Handler
	mr    *miniredis.Miniredis
	authz *fakeAuthz
	admin int64
	user  int64
}

func setup(t *testing.T) *env {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	e := &env{t: t, db: db, mr: mr}
	e.admin = e.exec1(`INSERT INTO users (email, password_hash) VALUES ('admin@x.com', 'x') RETURNING id`)
	e.user = e.exec1(`INSERT INTO users (email, password_hash, max_concurrency) VALUES ('u@x.com', 'x', 3) RETURNING id`)
	e.authz = &fakeAuthz{admin: e.admin, noGateway: map[int64]bool{}}
	e.svc = New(db, rdb, e.authz, fakeRegistry{gen: testGen()})
	engine := gin.New()
	r := httpapi.NewRouter(engine, fakeTokens{}, e.authz)
	e.svc.RegisterRoutes(r)
	e.h = engine
	return e
}

func (e *env) exec1(sql string, args ...any) int64 {
	e.t.Helper()
	var id int64
	if err := e.db.Pool.QueryRow(context.Background(), sql, args...).Scan(&id); err != nil {
		e.t.Fatal(err)
	}
	return id
}

func (e *env) exec(sql string, args ...any) {
	e.t.Helper()
	if _, err := e.db.Pool.Exec(context.Background(), sql, args...); err != nil {
		e.t.Fatal(err)
	}
}

func (e *env) do(uid int64, method, path string, body any) (int, map[string]any) {
	e.t.Helper()
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Authorization", fmt.Sprintf("Bearer u%d", uid))
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func codeOf(err error) string {
	var ce *core.Error
	if errors.As(err, &ce) {
		return ce.Code
	}
	return fmt.Sprint(err)
}

func TestGenerateKey(t *testing.T) {
	k, err := generateKey()
	if err != nil {
		t.Fatal(err)
	}
	if len(k) != 47 || !strings.HasPrefix(k, "sk-s2a-") {
		t.Fatalf("bad key %q", k)
	}
	for _, r := range k[7:] {
		if !strings.ContainsRune(base62, r) {
			t.Fatalf("non base62 char in %q", k)
		}
	}
}

func TestCopyAPIKey(t *testing.T) {
	e := setup(t)
	e.svc.Cipher, _ = secret.New(bytes.Repeat([]byte{42}, 32))
	g := e.exec1(`INSERT INTO groups (name) VALUES ('copy-test') RETURNING id`)
	code, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "copy", "group_id": g})
	if code != 201 {
		t.Fatalf("create: %d", code)
	}
	data := out["data"].(map[string]any)
	id := int64(data["id"].(float64))
	raw := data["key"].(string)
	if data["copyable"] != true {
		t.Fatal("new key is not copyable")
	}
	var sealed []byte
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT key_cipher FROM api_keys WHERE id=$1`, id).Scan(&sealed); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(sealed, []byte(raw)) {
		t.Fatal("plaintext stored")
	}
	path := fmt.Sprintf("/me/api-keys/%d/reveal", id)
	// Superuser permission must never bypass ownership, even with forged filters.
	for _, actor := range []int64{e.admin, e.user} {
		for _, endpoint := range []struct{ method, path string }{
			{"GET", "/api-keys"}, {"GET", "/api-keys?user_id=1"},
			{"POST", fmt.Sprintf("/api-keys/%d/reveal", id)},
			{"POST", fmt.Sprintf("/api-keys/%d/rotate", id)},
			{"PATCH", fmt.Sprintf("/api-keys/%d", id)},
			{"DELETE", fmt.Sprintf("/api-keys/%d", id)},
		} {
			if code, _ := e.do(actor, endpoint.method, endpoint.path, nil); code != 404 {
				t.Fatalf("global endpoint accessible: %s %s %d", endpoint.method, endpoint.path, code)
			}
		}
	}
	for _, methodPath := range []struct{ method, path string }{
		{"POST", path}, {"POST", fmt.Sprintf("/me/api-keys/%d/rotate", id)},
		{"DELETE", fmt.Sprintf("/me/api-keys/%d", id)},
	} {
		if code, _ := e.do(e.admin, methodPath.method, methodPath.path, nil); code != 404 {
			t.Fatalf("admin crossed owner boundary: %d", code)
		}
	}
	code, filtered := e.do(e.admin, "GET", fmt.Sprintf("/me/api-keys?user_id=%d&q=copy", e.user), nil)
	if code != 200 || len(filtered["data"].([]any)) != 0 {
		t.Fatal("admin leaked another user's list")
	}
	code, filtered = e.do(e.user, "GET", fmt.Sprintf("/me/api-keys?user_id=%d", e.admin), nil)
	if code != 200 || len(filtered["data"].([]any)) != 1 {
		t.Fatal("query filter changed owner scope")
	}
	code, out = e.do(e.user, "POST", path, nil)
	if code != 200 || out["data"].(map[string]any)["key"] != raw {
		t.Fatalf("owner reveal: %d", code)
	}
	other := e.exec1(`INSERT INTO users (email,password_hash) VALUES ('other@copy.test','x') RETURNING id`)
	if code, _ := e.do(other, "POST", path, nil); code != 404 {
		t.Fatalf("cross-owner: %d", code)
	}
	adminPath := fmt.Sprintf("/api-keys/%d/reveal", id)
	if code, _ := e.do(e.user, "POST", adminPath, nil); code != 404 {
		t.Fatalf("unauthorized admin reveal: %d", code)
	}
	if code, _ := e.do(e.admin, "POST", adminPath, nil); code != 404 {
		t.Fatalf("admin reveal: %d", code)
	}
	var count int
	_ = e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='apikey.reveal' AND target_id=$1`, strconv.FormatInt(id, 10)).Scan(&count)
	if count != 1 {
		t.Fatalf("audit count: %d", count)
	}
	e.exec(`UPDATE api_keys SET key_cipher=NULL WHERE id=$1`, id)
	if code, _ := e.do(e.user, "POST", path, nil); code != 409 {
		t.Fatalf("legacy: %d", code)
	}
	rotatePath := fmt.Sprintf("/me/api-keys/%d/rotate", id)
	if code, _ := e.do(other, "POST", rotatePath, nil); code != 404 {
		t.Fatalf("cross-owner rotate: %d", code)
	}
	if code, _ := e.do(e.user, "POST", fmt.Sprintf("/api-keys/%d/rotate", id), nil); code != 404 {
		t.Fatalf("unauthorized rotate: %d", code)
	}
	code, out = e.do(e.user, "POST", rotatePath, nil)
	if code != 200 {
		t.Fatalf("rotate: %d", code)
	}
	rotated := out["data"].(map[string]any)
	newRaw := rotated["key"].(string)
	if newRaw == raw || rotated["copyable"] != true || rotated["group_id"] != data["group_id"] || rotated["name"] != data["name"] {
		t.Fatal("rotation did not preserve metadata or renew key")
	}
	if _, err := e.svc.Authenticate(context.Background(), raw); codeOf(err) != "unauthenticated" {
		t.Fatal("old key still authenticates")
	}
	code, out = e.do(e.user, "POST", path, nil)
	if code != 200 || out["data"].(map[string]any)["key"] != newRaw {
		t.Fatal("rotated key is not recoverable")
	}
	if code, _ := e.do(e.admin, "POST", fmt.Sprintf("/api-keys/%d/rotate", id), nil); code != 404 {
		t.Fatalf("admin rotate: %d", code)
	}
	e.exec(`UPDATE api_keys SET deleted_at=now() WHERE id=$1`, id)
	if code, _ := e.do(e.admin, "POST", adminPath, nil); code != 404 {
		t.Fatalf("deleted reveal: %d", code)
	}
}

func TestAPIKeyLifecycleAndAuth(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	pub := e.exec1(`INSERT INTO groups (name, rate_multiplier, model_allowlist) VALUES ('pub', 1.5, '["claude-*"]') RETURNING id`)
	restricted := e.exec1(`INSERT INTO groups (name, visibility) VALUES ('vip', 'restricted') RETURNING id`)
	for _, typ := range [][2]string{{"relay", "relay_key"}, {"anthropic", "apikey"}, {"gone", "apikey"}} {
		acc := e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc) VALUES ('a', $1, $2, '\x00'::bytea) RETURNING id`,
			typ[0], typ[1])
		e.exec(`INSERT INTO account_groups (account_id, group_id) VALUES ($1, $2)`, acc, pub)
	}

	if code, _ := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "k", "group_id": restricted}); code != 400 {
		t.Fatalf("restricted group accepted: %d", code)
	}
	code, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "main", "group_id": pub})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	data := out["data"].(map[string]any)
	raw := data["key"].(string)
	keyID := int64(data["id"].(float64))
	if data["key_prefix"] != raw[:12] || data["group_name"] != "pub" || fmt.Sprint(data["platforms"]) != "[anthropic openai]" {
		t.Fatalf("create view: %v", data)
	}
	var stored string
	_ = e.db.Pool.QueryRow(ctx, `SELECT key_hash FROM api_keys WHERE id = $1`, keyID).Scan(&stored)
	if stored != HashKey(raw) {
		t.Fatal("hash mismatch")
	}

	_, out = e.do(e.user, "GET", "/me/api-keys", nil)
	items := out["data"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["key"] != nil ||
		fmt.Sprint(items[0].(map[string]any)["platforms"]) != "[anthropic openai]" {
		t.Fatalf("list mine: %v", out)
	}

	// Authentication always reads the current principal from PostgreSQL.
	p, err := e.svc.Authenticate(ctx, raw)
	if err != nil {
		t.Fatal(err)
	}
	if p.UserID != e.user || p.UserMaxConcurrency != 3 || p.Group.ID != pub || p.Group.RateMultiplier.String() != "1.5" ||
		len(p.Group.ModelAllowlist) != 1 {
		t.Fatalf("principal: %+v", p)
	}
	if e.mr.Exists("apikey:" + HashKey(raw)) {
		t.Fatal("security principal must not be cached")
	}
	if _, err := e.svc.Authenticate(ctx, "sk-s2a-"+strings.Repeat("x", 40)); codeOf(err) != "unauthenticated" {
		t.Fatalf("unknown key: %v", err)
	}
	if _, err := e.svc.Authenticate(ctx, "bogus"); codeOf(err) != "unauthenticated" {
		t.Fatalf("malformed key: %v", err)
	}

	// Group policy changes are visible on the next authentication, without cached principals.
	if _, err := e.db.Pool.Exec(ctx, `UPDATE groups SET model_filter_mode='blacklist' WHERE id=$1`, pub); err != nil {
		t.Fatal(err)
	}
	p, err = e.svc.Authenticate(ctx, raw)
	if err != nil || p.Group.ModelFilterMode != "blacklist" || p.Group.AllowsModel("claude-opus-5-5") || !p.Group.AllowsModel("gpt-5") {
		t.Fatalf("policy principal: %+v %v", p, err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE groups SET model_filter_mode='whitelist' WHERE id=$1`, pub); err != nil {
		t.Fatal(err)
	}

	// last_used_at batching.
	if err := e.svc.FlushLastUsed(ctx); err != nil {
		t.Fatal(err)
	}
	var last *time.Time
	_ = e.db.Pool.QueryRow(ctx, `SELECT last_used_at FROM api_keys WHERE id = $1`, keyID).Scan(&last)
	if last == nil {
		t.Fatal("last_used_at not written")
	}

	// gateway:use missing.
	e.authz.noGateway[e.user] = true
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "permission_denied" {
		t.Fatalf("no gateway:use: %v", err)
	}
	e.authz.noGateway[e.user] = false

	// Authentication responds immediately to database state changes.
	e.exec(`UPDATE api_keys SET status='disabled' WHERE id=$1`, keyID)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("disabled key: %v", err)
	}
	e.exec(`INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)`, e.user, restricted)
	e.exec(`UPDATE api_keys SET status='active', group_id=$2, expires_at=$3 WHERE id=$1`, keyID, restricted, time.Now().Add(time.Hour))

	p, err = e.svc.Authenticate(ctx, raw)
	if err != nil || p.Group.ID != restricted {
		t.Fatalf("after move: %+v %v", p, err)
	}
	// Removing membership takes effect without waiting for cache expiry.
	e.exec(`DELETE FROM user_groups WHERE user_id = $1`, e.user)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "permission_denied" {
		t.Fatalf("group not available: %v", err)
	}
	e.exec(`UPDATE api_keys SET group_id=$2, expires_at=NULL WHERE id=$1`, keyID, pub)

	e.exec(`UPDATE api_keys SET expires_at = now() - interval '1 minute' WHERE id = $1`, keyID)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("expired: %v", err)
	}
	e.exec(`UPDATE api_keys SET expires_at = NULL WHERE id = $1`, keyID)
	e.exec(`UPDATE users SET status = 'disabled' WHERE id = $1`, e.user)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("disabled user: %v", err)
	}
	e.exec(`UPDATE users SET status = 'active' WHERE id = $1`, e.user)

	// Another user cannot delete it; the owner can.
	other := e.exec1(`INSERT INTO users (email, password_hash) VALUES ('o@x.com', 'x') RETURNING id`)
	if code, _ = e.do(other, "DELETE", fmt.Sprintf("/me/api-keys/%d", keyID), nil); code != 404 {
		t.Fatalf("foreign delete: %d", code)
	}
	if _, err := e.svc.Authenticate(ctx, raw); err != nil {
		t.Fatal(err)
	}
	if code, _ = e.do(e.user, "DELETE", fmt.Sprintf("/me/api-keys/%d", keyID), nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("deleted key: %v", err)
	}
}
