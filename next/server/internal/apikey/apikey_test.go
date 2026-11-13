package apikey

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeTokens struct{ testutil.StepUpPassed }

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

// VerifyAccessKey reads "sak_<uid>" as an access key acting for uid.
func (fakeTokens) VerifyAccessKey(_ context.Context, raw, _ string) (core.AccessKeyIdentity, error) {
	uid, err := strconv.ParseInt(strings.TrimPrefix(raw, core.AccessKeyPrefix), 10, 64)
	return core.AccessKeyIdentity{UserID: uid, KeyID: 1}, err
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
		g1, g2 := int64(1), int64(2)
		keys := []*APIKey{{GroupID: &g1}, {GroupID: &g2}, {}}
		if err := s.fillPlatforms(context.Background(), keys); err != nil {
			t.Fatal(err)
		}
		b, _ := json.Marshal(keys)
		if strings.Count(string(b), `"platforms":[]`) != 3 {
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
	e.user = e.exec1(`INSERT INTO users (email, password_hash) VALUES ('u@x.com', 'x') RETURNING id`)
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
	return e.call(fmt.Sprintf("u%d", uid), method, path, body)
}

// call sends the request with bearer as the token.
func (e *env) call(bearer, method, path string, body any) (int, map[string]any) {
	e.t.Helper()
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+bearer)
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

func TestAPIKeyIPAllowlistValidation(t *testing.T) {
	e := setup(t)
	group := e.exec1(`INSERT INTO groups (name) VALUES ('ip-policy') RETURNING id`)
	for _, entries := range [][]string{{"hostname.example"}, {"192.0.2.1/33"}, {"fe80::1%eth0"}, {""}, {"::ffff:192.0.2.1/64"}} {
		status, _ := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "restricted", "group_id": group, "allowed_ips": entries})
		require.Equal(t, 400, status, "invalid allowlist must not create an unrestricted key")
	}
}

func TestIPAllowlistMatching(t *testing.T) {
	for _, test := range []struct {
		ip      string
		entries []string
		allowed bool
	}{
		{"", nil, true},
		{"", []string{"0.0.0.0/0"}, false},
		{"192.0.2.9", []string{"192.0.2.0/24"}, true},
		{"192.0.3.1", []string{"192.0.2.0/24"}, false},
		{"2001:db8::7", []string{"2001:db8::/32"}, true},
		{"2001:db9::7", []string{"2001:db8::/32"}, false},
		{"::ffff:192.0.2.9", []string{"192.0.2.9"}, true},
		{"192.0.2.9", []string{"::ffff:192.0.2.0/120"}, true},
		{"192.0.2.9", []string{"bad"}, false},
		{"fe80::1%eth0", []string{"fe80::/10"}, false},
	} {
		require.Equal(t, test.allowed, ipAllowed(test.ip, test.entries), "%s %v", test.ip, test.entries)
	}
	entries, err := normalizeAllowedIPs(t.Context(), []string{" 192.0.2.7/24 ", "192.0.2.0/24", "::ffff:192.0.2.1", "2001:0db8::1"})
	require.NoError(t, err)
	require.Equal(t, []string{"192.0.2.0/24", "192.0.2.1", "2001:db8::1"}, entries)
	_, err = normalizeAllowedIPs(t.Context(), make([]string, 257))
	require.Error(t, err)
}

func TestAPIKeyIPAllowlistOwnershipAndAuthentication(t *testing.T) {
	e := setup(t)
	group := e.exec1(`INSERT INTO groups (name) VALUES ('ip-policy') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "restricted", "group_id": group, "allowed_ips": []string{"192.0.2.7/24"}})
	require.Equal(t, 201, status)
	key := out["data"].(map[string]any)
	require.Equal(t, []any{"192.0.2.0/24"}, key["allowed_ips"])
	raw := key["key"].(string)
	id := int64(key["id"].(float64))
	path := fmt.Sprintf("/me/api-keys/%d/ip-allowlist", id)
	for _, ip := range []string{"", "198.51.100.1", "invalid"} {
		_, err := e.svc.Authenticate(core.WithClientIP(t.Context(), ip), raw)
		require.Equal(t, "ip_not_allowed", codeOf(err))
	}
	_, err := e.svc.Authenticate(core.WithClientIP(t.Context(), "192.0.2.1"), raw)
	require.NoError(t, err)
	status, _ = e.do(e.admin, "PUT", path, map[string]any{"allowed_ips": []string{}})
	require.Equal(t, 404, status)
	for _, body := range []any{map[string]any{}, map[string]any{"allowed_ips": nil}, map[string]any{"allowed_ips": []string{"bad"}}} {
		status, _ = e.do(e.user, "PUT", path, body)
		require.Equal(t, 400, status)
	}
	status, _ = e.do(e.user, "PUT", path, map[string]any{"allowed_ips": []string{"2001:db8::/32"}})
	require.Equal(t, 200, status)
	_, err = e.svc.Authenticate(core.WithClientIP(t.Context(), "192.0.2.1"), raw)
	require.Equal(t, "ip_not_allowed", codeOf(err))
	_, err = e.svc.Authenticate(core.WithClientIP(t.Context(), "2001:db8::1"), raw)
	require.NoError(t, err)
	status, out = e.do(e.user, "GET", "/me/api-keys", nil)
	require.Equal(t, 200, status)
	listed := out["data"].([]any)[0].(map[string]any)
	require.Equal(t, []any{"2001:db8::/32"}, listed["allowed_ips"])
	require.NotContains(t, listed, "key")
	status, _ = e.do(e.user, "PUT", path, map[string]any{"allowed_ips": []string{}})
	require.Equal(t, 200, status)
	_, err = e.svc.Authenticate(t.Context(), raw)
	require.NoError(t, err)
	var audits int
	require.NoError(t, e.db.Pool.QueryRow(t.Context(), `SELECT count(*) FROM audit_logs WHERE action='apikey.ip_allowlist' AND user_id=$1`, e.user).Scan(&audits))
	require.Equal(t, 2, audits)
}

func TestAPIKeyAllowlistUsesTrustedClientIP(t *testing.T) {
	e := setup(t)
	group := e.exec1(`INSERT INTO groups (name) VALUES ('trusted-proxy') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "restricted", "group_id": group, "allowed_ips": []string{"192.0.2.7"}})
	require.Equal(t, 201, status)
	raw := out["data"].(map[string]any)["key"].(string)
	for _, test := range []struct {
		peer      string
		forwarded string
		status    int
	}{
		{"198.51.100.1:1234", "192.0.2.7", 403},
		{"192.0.2.7:1234", "198.51.100.1", 200},
		{"10.0.0.1:1234", "192.0.2.7", 200},
		{"10.0.0.1:1234", "192.0.2.7, 198.51.100.1", 403},
		{"10.0.0.1:1234", "malformed", 403},
	} {
		engine := gin.New()
		require.NoError(t, engine.SetTrustedProxies([]string{"10.0.0.1"}))
		engine.GET("/", func(c *gin.Context) {
			_, err := e.svc.Authenticate(core.WithClientIP(c.Request.Context(), c.ClientIP()), raw)
			if err != nil {
				c.Status(core.AsError(err).Status)
				return
			}
			c.Status(200)
		})
		request := httptest.NewRequest("GET", "/", nil)
		request.RemoteAddr = test.peer
		request.Header.Set("X-Forwarded-For", test.forwarded)
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, request)
		require.Equal(t, test.status, response.Code)
	}
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
	// The owner's access key reveals too, after the step-up (passed here;
	// iam tests the proofs).
	code, out = e.call(core.AccessKeyPrefix+strconv.FormatInt(e.user, 10), "POST", path, nil)
	if code != 200 || out["data"].(map[string]any)["key"] != raw {
		t.Fatalf("access key reveal: %d %v", code, out)
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
	if count != 2 {
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
	if p.UserID != e.user || p.Group.ID != pub || p.Group.RateMultiplier.String() != "1.5" ||
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
	e.exec(`INSERT INTO segment_groups (segment_id, group_id, granted) SELECT segment_id, $2, true FROM users WHERE id = $1`, e.user, restricted)
	e.exec(`UPDATE api_keys SET status='active', group_id=$2, expires_at=$3 WHERE id=$1`, keyID, restricted, time.Now().Add(time.Hour))

	p, err = e.svc.Authenticate(ctx, raw)
	if err != nil || p.Group.ID != restricted {
		t.Fatalf("after move: %+v %v", p, err)
	}
	// Revoking the grant takes effect without waiting for cache expiry.
	e.exec(`UPDATE segment_groups SET granted = false WHERE group_id = $1`, restricted)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != CodeGroupNotAllowed {
		t.Fatalf("group not available: %v", err)
	}
	_, out = e.do(e.user, "GET", "/me/api-keys", nil)
	if v := out["data"].([]any)[0].(map[string]any); v["group_status"] != "unavailable" {
		t.Fatalf("unavailable group view: %v", v)
	}
	e.exec(`UPDATE api_keys SET group_id=$2, expires_at=NULL WHERE id=$1`, keyID, pub)
	e.exec(`UPDATE groups SET status='disabled' WHERE id=$1`, pub)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != CodeGroupDisabled {
		t.Fatalf("disabled group: %v", err)
	}
	e.exec(`UPDATE groups SET status='active' WHERE id=$1`, pub)

	// A deleted group leaves the key unbound: it is kept and listed, answers
	// group_deleted instead of reaching the scheduler, and works again once
	// its owner picks another group.
	gone := e.exec1(`INSERT INTO groups (name) VALUES ('gone') RETURNING id`)
	e.exec(`UPDATE api_keys SET group_id=$2 WHERE id=$1`, keyID, gone)
	e.exec(`DELETE FROM groups WHERE id=$1`, gone)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != CodeGroupDeleted {
		t.Fatalf("deleted group: %v", err)
	}
	_, out = e.do(e.user, "GET", "/me/api-keys", nil)
	if v := out["data"].([]any)[0].(map[string]any); v["group_id"] != nil || v["group_status"] != "deleted" || fmt.Sprint(v["platforms"]) != "[]" {
		t.Fatalf("unbound key view: %v", v)
	}
	if code, out = e.do(e.user, "PATCH", fmt.Sprintf("/me/api-keys/%d", keyID), map[string]any{"group_id": pub}); code != 200 ||
		out["data"].(map[string]any)["group_status"] != "active" {
		t.Fatalf("rebind: %d %v", code, out)
	}
	if p, err := e.svc.Authenticate(ctx, raw); err != nil || p.Group.ID != pub {
		t.Fatalf("after rebind: %+v %v", p, err)
	}

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

// GET /me/api-keys narrows the caller's keys by q, status and group_id
// (CONTRACTS §92.1): the filters combine with AND, q's wildcards are literal,
// a pasted key is matched by its stored prefix alone, and no filter reaches a
// deleted key or another user's.
func TestListMineFilters(t *testing.T) {
	e := setup(t)
	one := e.exec1(`INSERT INTO groups (name) VALUES ('one') RETURNING id`)
	two := e.exec1(`INSERT INTO groups (name) VALUES ('two') RETURNING id`)
	other := e.exec1(`INSERT INTO users (email, password_hash) VALUES ('other@x.com', 'x') RETURNING id`)
	past, future := time.Now().Add(-time.Hour), time.Now().Add(time.Hour)
	// add stores a key whose random part starts with tag and returns the key.
	add := func(owner int64, name, tag string, group int64, status string, expires *time.Time) string {
		raw := KeyPrefix + tag + strings.Repeat("0", keyRandomLen-len(tag))
		e.exec(`INSERT INTO api_keys (user_id, group_id, name, key_prefix, key_hash, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			owner, group, name, raw[:displayPrefix], HashKey(raw), status, expires)
		return raw
	}
	add(e.user, "Prod-Main", "Alpha", one, "active", nil)
	backup := add(e.user, "prod_backup", "Bravo", one, "disabled", nil)
	add(e.user, "100%done", "Charl", two, "active", &past)
	add(e.user, "1000 done", "Delta", two, "disabled", &past)
	add(e.user, "prodXbackup", "Echo1", two, "active", &future)
	deleted := add(e.user, "prod-deleted", "Foxtr", one, "active", nil)
	e.exec(`UPDATE api_keys SET deleted_at = now() WHERE key_hash = $1`, HashKey(deleted))
	foreign := add(other, "prod-other", "Golf1", one, "active", nil)
	add(other, "sk-s2a-Hotel-note", "India", one, "active", nil)
	gone := e.exec1(`INSERT INTO groups (name) VALUES ('gone') RETURNING id`)
	add(other, "unbound", "Julie", gone, "active", nil)
	e.exec(`DELETE FROM groups WHERE id = $1`, gone)

	list := func(uid int64, query url.Values) (int, map[string]any, []string) {
		status, out := e.do(uid, "GET", "/me/api-keys?"+query.Encode(), nil)
		names := []string{}
		for _, k := range out["data"].([]any) {
			names = append(names, k.(map[string]any)["name"].(string))
		}
		return status, out, names
	}
	groupTwo := strconv.FormatInt(two, 10)
	for _, c := range []struct {
		query url.Values
		want  []string
	}{
		{url.Values{}, []string{"prodXbackup", "1000 done", "100%done", "prod_backup", "Prod-Main"}},
		{url.Values{"q": {"  "}, "status": {""}, "group_id": {""}}, []string{"prodXbackup", "1000 done", "100%done", "prod_backup", "Prod-Main"}},
		// q: part of the name in any case, or the start of a key that goes
		// past what every key starts with.
		{url.Values{"q": {" PROD "}}, []string{"prodXbackup", "prod_backup", "Prod-Main"}},
		{url.Values{"q": {"SK-S2A-bravo"}}, []string{"prod_backup"}},
		{url.Values{"q": {"Bravo"}}, []string{}},
		{url.Values{"q": {"s"}}, []string{}},
		{url.Values{"q": {KeyPrefix}}, []string{}},
		// A pasted key is cut to the stored prefix: the whole key finds its row,
		// and so does one with a wrong tail; another prefix finds nothing.
		{url.Values{"q": {backup}}, []string{"prod_backup"}},
		{url.Values{"q": {backup[:keyLen-1] + "1"}}, []string{"prod_backup"}},
		{url.Values{"q": {KeyPrefix + "Zulu9" + backup[displayPrefix:]}}, []string{}},
		{url.Values{"q": {KeyPrefix + "Brav中"}}, []string{}},
		{url.Values{"q": {deleted}}, []string{}},
		{url.Values{"q": {foreign}}, []string{}},
		// LIKE wildcards and the escape character in q are literal.
		{url.Values{"q": {"prod_b"}}, []string{"prod_backup"}},
		{url.Values{"q": {"100%d"}}, []string{"100%done"}},
		{url.Values{"q": {`\`}}, []string{}},
		// status: a disabled key is "disabled" even past its expiry.
		{url.Values{"status": {"active"}}, []string{"prodXbackup", "Prod-Main"}},
		{url.Values{"status": {"disabled"}}, []string{"1000 done", "prod_backup"}},
		{url.Values{"status": {"expired"}}, []string{"100%done"}},
		{url.Values{"group_id": {groupTwo}}, []string{"prodXbackup", "1000 done", "100%done"}},
		{url.Values{"q": {"prod"}, "status": {"active"}, "group_id": {groupTwo}}, []string{"prodXbackup"}},
		{url.Values{"q": {"done"}, "status": {"disabled"}}, []string{"1000 done"}},
		{url.Values{"q": {"prod"}, "page": {"2"}, "page_size": {"2"}}, []string{"Prod-Main"}},
	} {
		status, _, names := list(e.user, c.query)
		require.Equal(t, 200, status, c.query)
		require.Equal(t, c.want, names, c.query)
	}
	_, out, _ := list(e.user, url.Values{"q": {"prod"}, "page_size": {"2"}})
	require.Equal(t, float64(3), out["page"].(map[string]any)["total"], "total counts the filtered keys")
	_, _, names := list(other, url.Values{"q": {"prod"}})
	require.Equal(t, []string{"prod-other"}, names)
	_, _, names = list(other, url.Values{"q": {"sk-s2a-Hotel-note"}})
	require.Equal(t, []string{"sk-s2a-Hotel-note"}, names, "the name is matched against the whole q")
	// A key whose group was deleted stays listed, under no group_id.
	_, _, names = list(other, url.Values{})
	require.Equal(t, []string{"unbound", "sk-s2a-Hotel-note", "prod-other"}, names)
	for _, group := range []int64{one, gone} {
		_, _, names = list(other, url.Values{"group_id": {strconv.FormatInt(group, 10)}})
		require.NotContains(t, names, "unbound", group)
	}

	for field, values := range map[string][]string{
		"q":        {"\xff", "a\x00b"},
		"status":   {"exhausted", "Active"},
		"group_id": {"abc", "0", "-1", "1.5"},
	} {
		for _, v := range values {
			status, out := e.do(e.user, "GET", "/me/api-keys?"+url.Values{field: {v}}.Encode(), nil)
			require.Equal(t, 400, status, "%s=%q", field, v)
			problem := out["error"].(map[string]any)
			require.Equal(t, "invalid_argument", problem["code"], "%s=%q", field, v)
			require.Equal(t, field, problem["details"].(map[string]any)["fields"].([]any)[0].(map[string]any)["field"], "%s=%q", field, v)
		}
	}
}
