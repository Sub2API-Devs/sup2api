package httpapi

import (
	"context"
	"encoding/json"
	"errors"
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

// fakeAuthz grants per user a fixed key set; "proxy:manage" is sensitive.
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

func (fakeAuthz) IsSensitive(key string) bool { return key == "proxy:manage" }

type fakeStepUp struct{}

func (fakeStepUp) VerifyStepUp(_ context.Context, _ int64, tok string) error {
	if tok != "ok" {
		return errors.New("bad step-up")
	}
	return nil
}

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
	}}, fakeStepUp{})
	echo := func(c *gin.Context) {
		OK(c, scopeView{Granted: Granted(c), Scope: core.OwnerScope(c.Request.Context(), "proxy:read")})
	}
	r.PermAny("GET", "/proxies", echo, "proxy:read", "proxy:own:read")
	r.PermAny("POST", "/proxies", echo, "proxy:manage", "proxy:own:manage")
	r.Perm("GET", "/single", "proxy:read", echo)

	call := func(method, path string, uid int64, stepUp string) (int, scopeView, map[string]any) {
		req := httptest.NewRequest(method, "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
		if stepUp != "" {
			req.Header.Set("X-Step-Up-Token", stepUp)
		}
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
	code, v, _ := call("GET", "/proxies", 1, "")
	if code != 200 || v.Scope != nil || strings.Join(v.Granted, ",") != "proxy:read,proxy:own:read" {
		t.Fatalf("all: %d %+v", code, v)
	}
	// Only the own key: scope is the caller id.
	code, v, _ = call("GET", "/proxies", 2, "")
	if code != 200 || v.Scope == nil || *v.Scope != 2 || strings.Join(v.Granted, ",") != "proxy:own:read" {
		t.Fatalf("own: %d %+v", code, v)
	}
	// Neither key: permission_denied naming the first key.
	code, _, e := call("GET", "/proxies", 4, "")
	if code != http.StatusForbidden || e["code"] != "permission_denied" ||
		e["details"].(map[string]any)["permission"] != "proxy:read" {
		t.Fatalf("denied: %d %v", code, e)
	}
	// A sensitive matched key requires step-up; the own key alone does not.
	code, _, e = call("POST", "/proxies", 3, "")
	if code != http.StatusForbidden || e["code"] != "step_up_required" {
		t.Fatalf("sensitive without step-up: %d %v", code, e)
	}
	if code, _, _ = call("POST", "/proxies", 3, "ok"); code != 200 {
		t.Fatalf("sensitive with step-up: %d", code)
	}
	if code, _, _ = call("POST", "/proxies", 2, ""); code != 200 {
		t.Fatalf("own manage without step-up: %d", code)
	}
	// Perm records its key too, so OwnerScope works on single-key routes.
	code, v, _ = call("GET", "/single", 1, "")
	if code != 200 || v.Scope != nil || strings.Join(v.Granted, ",") != "proxy:read" {
		t.Fatalf("perm: %d %+v", code, v)
	}
	if code, _, _ = call("GET", "/single", 2, ""); code != http.StatusForbidden {
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
