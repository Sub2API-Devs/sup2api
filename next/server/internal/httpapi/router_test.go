package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

// fakeAuthz grants per user a fixed key set.
type fakeAuthz struct{ keys map[int64][]string }

func (a fakeAuthz) Can(_ context.Context, uid int64, key string) (bool, error) {
	for _, k := range a.keys[uid] {
		if k == key {
			return true, nil
		}
	}
	return false, nil
}

func (a fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}

func (fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }

type scopeView struct {
	Granted []string `json:"granted"`
	Scope   *int64   `json:"scope"`
}

func TestPermAny(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{
		1: {"proxy:read", "proxy:own:read"}, // all + own
		2: {"proxy:own:read", "proxy:own:manage"},
		3: {"proxy:manage"},
		4: {"apikey:self:manage"},
	}})
	echo := func(c *gin.Context) {
		OK(c, scopeView{Granted: Granted(c), Scope: core.OwnerScope(c.Request.Context(), "proxy:read")})
	}
	r.PermAny("GET", "/proxies", echo, "proxy:read", "proxy:own:read")
	r.PermAny("POST", "/proxies", echo, "proxy:manage", "proxy:own:manage")
	r.Perm("GET", "/single", "proxy:read", echo)

	call := func(method, path string, uid int64) (int, scopeView, map[string]any) {
		req := httptest.NewRequest(method, "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		var out struct {
			Data  scopeView      `json:"data"`
			Error map[string]any `json:"error"`
		}
		_ = json.Unmarshal(w.Body.Bytes(), &out)
		return w.Code, out.Data, out.Error
	}

	// Both keys held: all-level scope, both recorded.
	code, v, _ := call("GET", "/proxies", 1)
	if code != 200 || v.Scope != nil || strings.Join(v.Granted, ",") != "proxy:read,proxy:own:read" {
		t.Fatalf("all: %d %+v", code, v)
	}
	// Only the own key: scope is the caller id.
	code, v, _ = call("GET", "/proxies", 2)
	if code != 200 || v.Scope == nil || *v.Scope != 2 || strings.Join(v.Granted, ",") != "proxy:own:read" {
		t.Fatalf("own: %d %+v", code, v)
	}
	// Neither key: permission_denied naming the first key.
	code, _, e := call("GET", "/proxies", 4)
	if code != http.StatusForbidden || e["code"] != "permission_denied" ||
		e["details"].(map[string]any)["permission"] != "proxy:read" {
		t.Fatalf("denied: %d %v", code, e)
	}
	// The permission alone is enough; there is no password confirmation.
	if code, _, e = call("POST", "/proxies", 3); code != 200 {
		t.Fatalf("manage: %d %v", code, e)
	}
	if code, _, _ = call("POST", "/proxies", 2); code != 200 {
		t.Fatalf("own manage: %d", code)
	}
	// Perm records its key too, so OwnerScope works on single-key routes.
	code, v, _ = call("GET", "/single", 1)
	if code != 200 || v.Scope != nil || strings.Join(v.Granted, ",") != "proxy:read" {
		t.Fatalf("perm: %d %+v", code, v)
	}
	if code, _, _ = call("GET", "/single", 2); code != http.StatusForbidden {
		t.Fatalf("perm denied: %d", code)
	}
}

func TestOwnerScopeWithoutGrant(t *testing.T) {
	ctx := core.WithUserID(context.Background(), 7)
	if s := core.OwnerScope(ctx, "x:read"); s == nil || *s != 7 {
		t.Fatalf("scope without grants = %v", s)
	}
	ctx = core.WithGranted(ctx, []string{"x:own:read"})
	if s := core.OwnerScope(ctx, "x:read"); s == nil || *s != 7 {
		t.Fatalf("own scope = %v", s)
	}
	if s := core.OwnerScope(core.WithGranted(ctx, []string{"x:own:read", "x:read"}), "x:read"); s != nil {
		t.Fatalf("all scope = %v", *s)
	}
}

// keyTokens also verifies access keys: "sak_<uid>" acts for uid.
type keyTokens struct{ fakeTokens }

func (keyTokens) VerifyAccessKey(_ context.Context, raw, _ string) (core.AccessKeyIdentity, error) {
	uid, err := strconv.ParseInt(strings.TrimPrefix(raw, core.AccessKeyPrefix), 10, 64)
	return core.AccessKeyIdentity{UserID: uid, KeyID: 1}, err
}

func serve(engine *gin.Engine, method, path, bearer string) int {
	req := httptest.NewRequest(method, "/api/v1"+path, nil)
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, req)
	return w.Code
}

func TestSessionOnly(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := NewRouter(engine, keyTokens{}, fakeAuthz{keys: map[int64][]string{1: {"x:read"}}})
	ok := func(c *gin.Context) { OK(c, nil) }
	strict := r.SessionOnly()
	strict.Perm("GET", "/strict/perm", "x:read", ok)
	strict.PermAny("GET", "/strict/any", ok, "x:read", "x:own:read")
	r.Perm("GET", "/perm", "x:read", ok)
	r.PermAny("GET", "/any", ok, "x:read", "x:own:read")
	r.AuthedRead("/read", ok)
	r.Authed("GET", "/authed", ok)

	cases := []struct {
		path     string
		jwt, key int
		name     string
	}{
		{"/strict/perm", 200, http.StatusForbidden, "SessionOnly Perm"},
		{"/strict/any", 200, http.StatusForbidden, "SessionOnly PermAny"},
		{"/perm", 200, 200, "Perm on the original router"},
		{"/any", 200, 200, "PermAny on the original router"},
		{"/read", 200, 200, "AuthedRead"},
		{"/authed", 200, http.StatusForbidden, "Authed"},
	}
	for _, tc := range cases {
		if got := serve(engine, "GET", tc.path, "u1"); got != tc.jwt {
			t.Errorf("%s with a JWT = %d, want %d", tc.name, got, tc.jwt)
		}
		if got := serve(engine, "GET", tc.path, core.AccessKeyPrefix+"1"); got != tc.key {
			t.Errorf("%s with an access key = %d, want %d", tc.name, got, tc.key)
		}
		if got := serve(engine, "GET", tc.path, ""); got != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d, want 401", tc.name, got)
		}
	}
	// Permission checks still run after the key refusal on a view.
	if got := serve(engine, "GET", "/strict/perm", "u2"); got != http.StatusForbidden {
		t.Errorf("SessionOnly Perm without the permission = %d", got)
	}
}

func TestAuthenticateAndRejectAccessKey(t *testing.T) {
	gin.SetMode(gin.TestMode)
	run := func(bearer string) (*gin.Context, *httptest.ResponseRecorder, bool) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)
		if bearer != "" {
			c.Request.Header.Set("Authorization", bearer)
		}
		return c, w, Authenticate(c, keyTokens{})
	}

	c, _, ok := run("Bearer u5")
	if uid, _ := core.UserID(c.Request.Context()); !ok || uid != 5 || c.IsAborted() {
		t.Fatalf("JWT: ok=%v uid=%d aborted=%v", ok, uid, c.IsAborted())
	}
	if !RejectAccessKey(c) || c.IsAborted() {
		t.Fatal("RejectAccessKey refused a JWT caller")
	}

	c, w, ok := run("Bearer " + core.AccessKeyPrefix + "6")
	if _, isKey := core.AccessKey(c.Request.Context()); !ok || !isKey {
		t.Fatalf("access key: ok=%v key=%v", ok, isKey)
	}
	if RejectAccessKey(c) || !c.IsAborted() || w.Code != http.StatusForbidden ||
		!strings.Contains(w.Body.String(), "access keys cannot use this endpoint") {
		t.Fatalf("RejectAccessKey on a key: aborted=%v code=%d body=%s", c.IsAborted(), w.Code, w.Body)
	}

	for _, bearer := range []string{"", "Basic u5", "Bearer ", "Bearer bad"} {
		c, w, ok := run(bearer)
		if ok || !c.IsAborted() || w.Code != http.StatusUnauthorized {
			t.Errorf("%q: ok=%v aborted=%v code=%d", bearer, ok, c.IsAborted(), w.Code)
		}
	}
}
