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

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
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
func (*fakeAuthz) IsSensitive(string) bool { return false }

type fakeStepUp struct{}

func (fakeStepUp) VerifyStepUp(context.Context, int64, string) error { return nil }

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
	e.svc = New(db, rdb, e.authz)
	engine := gin.New()
	r := httpapi.NewRouter(engine, fakeTokens{}, e.authz, fakeStepUp{})
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

func TestAPIKeyLifecycleAndAuth(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	pub := e.exec1(`INSERT INTO groups (name, rate_multiplier, model_allowlist) VALUES ('pub', 1.5, '["claude-*"]') RETURNING id`)
	restricted := e.exec1(`INSERT INTO groups (name, visibility) VALUES ('vip', 'restricted') RETURNING id`)

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
	if data["key_prefix"] != raw[:12] || data["group_name"] != "pub" {
		t.Fatalf("create view: %v", data)
	}
	var stored string
	_ = e.db.Pool.QueryRow(ctx, `SELECT key_hash FROM api_keys WHERE id = $1`, keyID).Scan(&stored)
	if stored != HashKey(raw) {
		t.Fatal("hash mismatch")
	}

	_, out = e.do(e.user, "GET", "/me/api-keys", nil)
	items := out["data"].([]any)
	if len(items) != 1 || items[0].(map[string]any)["key"] != nil {
		t.Fatalf("list mine: %v", out)
	}

	// Authenticate: success, cached.
	p, err := e.svc.Authenticate(ctx, raw)
	if err != nil {
		t.Fatal(err)
	}
	if p.UserID != e.user || p.UserMaxConcurrency != 3 || p.Group.ID != pub || p.Group.RateMultiplier.String() != "1.5" ||
		len(p.Group.ModelAllowlist) != 1 {
		t.Fatalf("principal: %+v", p)
	}
	if !e.mr.Exists("apikey:" + HashKey(raw)) {
		t.Fatal("not cached")
	}
	if _, err := e.svc.Authenticate(ctx, "sk-s2a-"+strings.Repeat("x", 40)); codeOf(err) != "unauthenticated" {
		t.Fatalf("unknown key: %v", err)
	}
	if _, err := e.svc.Authenticate(ctx, "bogus"); codeOf(err) != "unauthenticated" {
		t.Fatalf("malformed key: %v", err)
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

	// Admin disables the key: cache dropped, auth fails immediately.
	code, out = e.do(e.admin, "PATCH", fmt.Sprintf("/api-keys/%d", keyID), map[string]any{"status": "disabled"})
	if code != 200 || out["data"].(map[string]any)["status"] != "disabled" {
		t.Fatalf("patch: %d %v", code, out)
	}
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("disabled key: %v", err)
	}
	// Re-enable, move to restricted group (not allowed for the owner).
	if code, _ = e.do(e.admin, "PATCH", fmt.Sprintf("/api-keys/%d", keyID), map[string]any{"status": "active", "group_id": restricted}); code != 400 {
		t.Fatalf("move to unavailable group: %d", code)
	}
	e.exec(`INSERT INTO user_groups (user_id, group_id) VALUES ($1, $2)`, e.user, restricted)
	past := time.Now().Add(time.Hour)
	code, out = e.do(e.admin, "PATCH", fmt.Sprintf("/api-keys/%d", keyID), map[string]any{"status": "active", "group_id": restricted, "expires_at": past})
	if code != 200 {
		t.Fatalf("move: %d %v", code, out)
	}
	p, err = e.svc.Authenticate(ctx, raw)
	if err != nil || p.Group.ID != restricted {
		t.Fatalf("after move: %+v %v", p, err)
	}
	// Removing the membership: stale cache until TTL; simulate expiry.
	e.exec(`DELETE FROM user_groups WHERE user_id = $1`, e.user)
	e.mr.FastForward(61 * time.Second)
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "permission_denied" {
		t.Fatalf("group not available: %v", err)
	}
	// Clear expiry explicitly with null, then expire it in the DB.
	code, out = e.do(e.admin, "PATCH", fmt.Sprintf("/api-keys/%d", keyID), map[string]any{"group_id": pub, "expires_at": nil})
	if code != 200 || out["data"].(map[string]any)["expires_at"] != nil {
		t.Fatalf("clear expiry: %d %v", code, out)
	}
	e.exec(`UPDATE api_keys SET expires_at = now() - interval '1 minute' WHERE id = $1`, keyID)
	e.mr.FlushAll()
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("expired: %v", err)
	}
	e.exec(`UPDATE api_keys SET expires_at = NULL WHERE id = $1`, keyID)
	e.exec(`UPDATE users SET status = 'disabled' WHERE id = $1`, e.user)
	e.mr.FlushAll()
	if _, err := e.svc.Authenticate(ctx, raw); codeOf(err) != "unauthenticated" {
		t.Fatalf("disabled user: %v", err)
	}
	e.exec(`UPDATE users SET status = 'active' WHERE id = $1`, e.user)
	e.mr.FlushAll() // user changes are picked up after the cache TTL
	// Admin list with filter.
	_, out = e.do(e.admin, "GET", fmt.Sprintf("/api-keys?user_id=%d&q=main", e.user), nil)
	if out["page"].(map[string]any)["total"].(float64) != 1 || out["data"].([]any)[0].(map[string]any)["user_email"] != "u@x.com" {
		t.Fatalf("admin list: %v", out)
	}
	if code, _ = e.do(e.user, "GET", "/api-keys", nil); code != 403 {
		t.Fatalf("user admin list: %d", code)
	}

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
