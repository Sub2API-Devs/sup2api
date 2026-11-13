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
	strict.Handle("GET", "/authed", ok)
	r.Handle("GET", "/handle", ok)

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
		{"/authed", 200, http.StatusForbidden, "SessionOnly Handle"},
		{"/handle", 200, 200, "Handle"},
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

// versionedAuthz is fakeAuthz telling its version (core.AuthzVersioner).
type versionedAuthz struct {
	fakeAuthz
	version int64
}

func (a versionedAuthz) Version() int64 { return a.version }

// Every authenticated response carries the authorizer's version, also the
// one refused for a missing permission; a request that did not authenticate
// learns nothing, and an authorizer without a version sets no header.
func TestAuthzVersionHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	header := func(authz core.Authorizer, path, bearer string) (int, string) {
		engine := gin.New()
		r := NewRouter(engine, keyTokens{}, authz)
		ok := func(c *gin.Context) { OK(c, nil) }
		r.Perm("GET", "/perm", "x:read", ok)
		r.AuthedRead("/read", ok)
		r.SessionOnly().Perm("GET", "/strict", "x:read", ok)
		req := httptest.NewRequest("GET", "/api/v1"+path, nil)
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		return w.Code, w.Header().Get(HeaderAuthzVersion)
	}
	plain := fakeAuthz{keys: map[int64][]string{1: {"x:read"}}}
	versioned := versionedAuthz{fakeAuthz: plain, version: 42}
	for _, tc := range []struct {
		name         string
		authz        core.Authorizer
		path, bearer string
		code         int
		want         string
	}{
		{"permitted", versioned, "/perm", "u1", 200, "42"},
		{"authenticated only", versioned, "/read", "u2", 200, "42"},
		{"permission denied", versioned, "/perm", "u2", 403, "42"},
		{"access key", versioned, "/perm", core.AccessKeyPrefix + "1", 200, "42"},
		{"access key refused by a session-only view", versioned, "/strict", core.AccessKeyPrefix + "1", 403, "42"},
		{"no token", versioned, "/perm", "", 401, ""},
		{"bad token", versioned, "/perm", "bad", 401, ""},
		{"authorizer without a version", plain, "/perm", "u1", 200, ""},
	} {
		if code, got := header(tc.authz, tc.path, tc.bearer); code != tc.code || got != tc.want {
			t.Errorf("%s: %d %s=%q, want %d %q", tc.name, code, HeaderAuthzVersion, got, tc.code, tc.want)
		}
	}
}

// stepUpTokens accepts the proof "ok:<scope>" for the operation it was sent
// on and records the spent scopes.
type stepUpTokens struct {
	keyTokens
	spent *[]string
}

func (s stepUpTokens) ConsumeStepUp(ctx context.Context, scope string) error {
	proof, operation, ok := core.StepUpRequest(ctx)
	if !ok || proof != "ok:"+scope || !strings.HasPrefix(operation, "POST /api/v1/") {
		return core.ErrVerificationRequired.WithDetails(map[string]any{"scope": scope, "context": operation})
	}
	*s.spent = append(*s.spent, scope)
	return nil
}

// A StepUp view spends a proof after the permission check, on every kind of
// route; a route outside the view needs none, and without a verifier the
// view fails closed.
func TestStepUp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	var spent []string
	engine := gin.New()
	r := NewRouter(engine, stepUpTokens{spent: &spent}, fakeAuthz{keys: map[int64][]string{1: {"x:manage"}}})
	ok := func(c *gin.Context) { OK(c, nil) }
	r.StepUp("x.reveal").Perm("POST", "/perm", "x:manage", ok)
	r.StepUp("x.reveal").PermAny("POST", "/any", ok, "x:manage", "x:own:manage")
	r.SessionOnly().StepUp("x.self").Handle("POST", "/self", ok)
	r.Perm("POST", "/plain", "x:manage", ok)
	call := func(path, bearer, proof string) int {
		req := httptest.NewRequest("POST", "/api/v1"+path, nil)
		req.Header.Set("Authorization", "Bearer "+bearer)
		if proof != "" {
			req.Header.Set(core.HeaderVerifyProof, proof)
		}
		w := httptest.NewRecorder()
		engine.ServeHTTP(w, req)
		return w.Code
	}
	for _, tc := range []struct {
		name, path, bearer, proof string
		want                      int
	}{
		{"no permission, no proof spent", "/perm", "u2", "ok:x.reveal", 403},
		{"no proof", "/perm", "u1", "", 403},
		{"proof of another scope", "/perm", "u1", "ok:x.self", 403},
		{"proof", "/perm", "u1", "ok:x.reveal", 200},
		{"PermAny with a proof", "/any", "u1", "ok:x.reveal", 200},
		{"access key with a proof", "/perm", core.AccessKeyPrefix + "1", "ok:x.reveal", 200},
		{"session-only Handle with a proof", "/self", "u2", "ok:x.self", 200},
		{"session-only Handle refuses a key first", "/self", core.AccessKeyPrefix + "1", "ok:x.self", 403},
		{"outside the view", "/plain", "u1", "", 200},
	} {
		if got := call(tc.path, tc.bearer, tc.proof); got != tc.want {
			t.Errorf("%s = %d, want %d", tc.name, got, tc.want)
		}
	}
	if want := []string{"x.reveal", "x.reveal", "x.reveal", "x.self"}; strings.Join(spent, ",") != strings.Join(want, ",") {
		t.Errorf("spent %v, want %v", spent, want)
	}

	plain := gin.New()
	NewRouter(plain, keyTokens{}, fakeAuthz{keys: map[int64][]string{1: {"x:manage"}}}).StepUp("x.reveal").Perm("POST", "/perm", "x:manage", ok)
	req := httptest.NewRequest("POST", "/api/v1/perm", nil)
	req.Header.Set("Authorization", "Bearer u1")
	req.Header.Set(core.HeaderVerifyProof, "ok:x.reveal")
	w := httptest.NewRecorder()
	plain.ServeHTTP(w, req)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("no verifier = %d, want 500", w.Code)
	}
}

// Self is Perm under a self permission; any other key is a programming error.
func TestSelf(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	r := NewRouter(engine, keyTokens{}, fakeAuthz{keys: map[int64][]string{1: {"self:profile"}}})
	r.Self("GET", "/me", "self:profile", func(c *gin.Context) { OK(c, Granted(c)) })
	if got := serve(engine, "GET", "/me", "u1"); got != 200 {
		t.Errorf("holder = %d", got)
	}
	if got := serve(engine, "GET", "/me", "u2"); got != http.StatusForbidden {
		t.Errorf("without the permission = %d", got)
	}
	defer func() {
		if recover() == nil {
			t.Error("Self accepted a key outside the self module")
		}
	}()
	r.Self("GET", "/x", "user:read", func(*gin.Context) {})
}
