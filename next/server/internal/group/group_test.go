package group

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"

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

type fakeAuthz struct{ admin int64 }

func (a fakeAuthz) Can(_ context.Context, uid int64, _ string) (bool, error) {
	return uid == a.admin, nil
}
func (a fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) IsSensitive(string) bool { return false }

type fakeStepUp struct{}

func (fakeStepUp) VerifyStepUp(context.Context, int64, string) error { return nil }

type fakeBus struct {
	mu   sync.Mutex
	msgs []string
}

func (b *fakeBus) Publish(_ context.Context, ch string, p []byte) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.msgs = append(b.msgs, ch+" "+string(p))
	return nil
}
func (b *fakeBus) Subscribe(string, func([]byte)) func() { return func() {} }

type env struct {
	t     *testing.T
	db    *store.DB
	h     http.Handler
	mr    *miniredis.Miniredis
	bus   *fakeBus
	admin int64
	user  int64
}

func setup(t *testing.T) *env {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	e := &env{t: t, db: db, mr: mr, bus: &fakeBus{}}
	e.admin = mkUser(t, db, "admin@x.com")
	e.user = mkUser(t, db, "user@x.com")
	engine := gin.New()
	r := httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{admin: e.admin}, fakeStepUp{})
	New(db, rdb, e.bus).RegisterRoutes(r)
	e.h = engine
	return e
}

func mkUser(t *testing.T, db *store.DB, email string) int64 {
	var id int64
	if err := db.Pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func (e *env) do(uid int64, method, path string, body any) (int, map[string]any) {
	e.t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, rd)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer u%d", uid))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestGroupCRUDAndVisibility(t *testing.T) {
	e := setup(t)
	code, out := e.do(e.admin, "POST", "/groups", map[string]any{"name": "Default"})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	def := out["data"].(map[string]any)
	if def["rate_multiplier"] != "1" || def["visibility"] != "public" {
		t.Fatalf("defaults: %v", def)
	}
	code, out = e.do(e.admin, "POST", "/groups", map[string]any{"name": "VIP", "visibility": "restricted",
		"rate_multiplier": "0.80", "model_allowlist": []string{"claude-*"}})
	if code != 201 {
		t.Fatalf("create vip: %d %v", code, out)
	}
	vip := out["data"].(map[string]any)
	vipID := int64(vip["id"].(float64))
	if vip["rate_multiplier"] != "0.8" {
		t.Fatalf("rate: %v", vip["rate_multiplier"])
	}
	if code, out = e.do(e.admin, "POST", "/groups", map[string]any{"name": "VIP"}); code != 400 {
		t.Fatalf("dup: %d %v", code, out)
	}
	if code, _ = e.do(e.admin, "POST", "/groups", map[string]any{"name": "Bad", "rate_multiplier": "-1"}); code != 400 {
		t.Fatalf("bad rate: %d", code)
	}
	if code, _ = e.do(e.user, "GET", "/groups", nil); code != 403 {
		t.Fatalf("perm: %d", code)
	}

	_, out = e.do(e.user, "GET", "/me/groups", nil)
	if n := len(out["data"].([]any)); n != 1 {
		t.Fatalf("user sees %d groups", n)
	}
	// Seed a key so the cache drop path is exercised.
	e.mr.Set("apikey:h1", "{}")
	if _, err := e.db.Pool.Exec(context.Background(), `INSERT INTO api_keys (user_id, group_id, name, key_prefix, key_hash)
		VALUES ($1, $2, 'k', 'sk-s2a-xxxxx', 'h1')`, e.user, int64(def["id"].(float64))); err != nil {
		t.Fatal(err)
	}
	code, out = e.do(e.admin, "PUT", fmt.Sprintf("/users/%d/groups", e.user), map[string]any{"group_ids": []int64{vipID, vipID}})
	if code != 200 {
		t.Fatalf("set user groups: %d %v", code, out)
	}
	if e.mr.Exists("apikey:h1") {
		t.Fatal("api key cache not dropped")
	}
	_, out = e.do(e.user, "GET", "/me/groups", nil)
	if n := len(out["data"].([]any)); n != 2 {
		t.Fatalf("user sees %d groups after assignment", n)
	}
	code, _ = e.do(e.admin, "PUT", fmt.Sprintf("/users/%d/groups", e.user), map[string]any{"group_ids": []int64{999}})
	if code != 400 {
		t.Fatalf("unknown group: %d", code)
	}

	code, out = e.do(e.admin, "PATCH", fmt.Sprintf("/groups/%d", vipID), map[string]any{"status": "disabled", "model_allowlist": []string{}})
	if code != 200 || out["data"].(map[string]any)["status"] != "disabled" {
		t.Fatalf("patch: %d %v", code, out)
	}
	_, out = e.do(e.user, "GET", "/me/groups", nil)
	if n := len(out["data"].([]any)); n != 1 {
		t.Fatalf("disabled group visible: %d", n)
	}

	_, out = e.do(e.admin, "GET", "/groups?page_size=1", nil)
	if out["page"].(map[string]any)["total"].(float64) != 2 || len(out["data"].([]any)) != 1 {
		t.Fatalf("list: %v", out)
	}
	defID := int64(def["id"].(float64))
	_, out = e.do(e.admin, "GET", fmt.Sprintf("/groups/%d", defID), nil)
	if out["data"].(map[string]any)["api_key_count"].(float64) != 1 {
		t.Fatalf("key count: %v", out)
	}
	if code, _ = e.do(e.admin, "DELETE", fmt.Sprintf("/groups/%d", defID), nil); code != 409 {
		t.Fatalf("delete with keys: %d", code)
	}
	if _, err := e.db.Pool.Exec(context.Background(), `UPDATE api_keys SET deleted_at = now()`); err != nil {
		t.Fatal(err)
	}
	if code, _ = e.do(e.admin, "DELETE", fmt.Sprintf("/groups/%d", defID), nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if code, _ = e.do(e.admin, "GET", fmt.Sprintf("/groups/%d", defID), nil); code != 404 {
		t.Fatalf("get deleted: %d", code)
	}
	if len(e.bus.msgs) != 1 || !strings.HasPrefix(e.bus.msgs[0], core.ChannelAccountChanged) {
		t.Fatalf("bus: %v", e.bus.msgs)
	}
}
