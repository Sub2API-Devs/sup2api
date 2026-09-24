package routes_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/gin-gonic/gin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/routes"
)

type echo struct{ last *pluginv1.HTTPRequest }

func (e *echo) HandleHTTP(_ context.Context, in *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	e.last = in
	b, _ := json.Marshal(map[string]any{"path": in.GetPath(), "params": in.GetPathParams(), "user": in.GetCaller().GetUserId(), "body": string(in.GetBody())})
	return &pluginv1.HTTPResponse{Status: 201, Body: b, Headers: map[string]*pluginv1.HeaderValues{
		"X-Plugin":   {Values: []string{"yes"}},
		"Set-Cookie": {Values: []string{"session=evil"}},
	}}, nil
}

type ext struct {
	pkg *registry.Package
	h   *echo
}

func (e ext) Package() *registry.Package { return e.pkg }
func (e ext) Grants() registry.Grants {
	return registry.Grants{"routes.admin": []byte("{}"), "routes.webhook": []byte("{}"), "routes.public": []byte("{}")}
}
func (e ext) Platform() core.PlatformPlugin   { return nil }
func (e ext) Hook() core.HookPlugin           { return nil }
func (e ext) App() core.AppPlugin             { return nil }
func (e ext) HTTP() core.HTTPPlugin           { return e.h }
func (e ext) Scheduler() core.SchedulerPlugin { return nil }

type tokens struct{}

func (tokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	switch tok {
	case "admin":
		return 1, nil
	case "nobody":
		return 2, nil
	}
	return 0, errors.New("bad token")
}

type authz struct{}

func (authz) Can(_ context.Context, uid int64, perm string) (bool, error) {
	return uid == 1 && perm == "plugin.demo:rules:read", nil
}
func (authz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (authz) IsSensitive(string) bool { return false }

func setup(t *testing.T, opts ...routes.Option) (*gin.Engine, *echo, *registry.Registry, *registry.Package) {
	gin.SetMode(gin.TestMode)
	m := registrytest.Manifest("demo", "1.0.0")
	pkg, err := registry.LoadPackage(t.TempDir(), registrytest.Package(t, m, []byte("bin"), nil), "", "unsigned")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = pkg.Close() })
	reg := registry.New()
	h := &echo{}
	reg.Publish([]registry.Extension{ext{pkg: pkg, h: h}})
	engine := gin.New()
	r := httpapi.NewRouter(engine, tokens{}, authz{}, nil)
	rh := routes.New(reg, tokens{}, authz{}, nil, opts...)
	rh.RegisterRoutes(r)
	rh.RegisterAssets(engine)
	return engine, h, reg, pkg
}

type health struct{ ok atomic.Bool }

func (h *health) Healthy() bool { return h.ok.Load() }

// An unhealthy node fences itself: plugin APIs answer 503 unavailable
// without reaching the plugin; assets are still served.
func TestPluginAPISelfFencing(t *testing.T) {
	hc := &health{}
	e, h, _, pkg := setup(t, routes.WithHealth(hc))

	w := do(e, "POST", "/api/v1/p/demo/hook", "", `{}`)
	var out struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if w.Code != http.StatusServiceUnavailable || out.Error.Code != "unavailable" || h.last != nil {
		t.Fatalf("unhealthy: %d %s", w.Code, w.Body)
	}
	if w.Header().Get("Retry-After") == "" {
		t.Fatal("missing Retry-After")
	}
	if w := do(e, "GET", pkg.AssetBase()+"/ui/index.html", "", ""); w.Code != 200 {
		t.Fatalf("assets while unhealthy: %d", w.Code)
	}

	hc.ok.Store(true)
	if w := do(e, "POST", "/api/v1/p/demo/hook", "", `{}`); w.Code != 201 || h.last == nil {
		t.Fatalf("healthy again: %d %s", w.Code, w.Body)
	}
}

func do(e *gin.Engine, method, path, token, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Cookie", "console=secret")
	w := httptest.NewRecorder()
	e.ServeHTTP(w, req)
	return w
}

func TestPluginAPIRoutes(t *testing.T) {
	e, h, reg, _ := setup(t)

	w := do(e, "GET", "/api/v1/p/demo/echo/42?x=1", "admin", "")
	if w.Code != 201 {
		t.Fatalf("status %d: %s", w.Code, w.Body)
	}
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	if out["path"] != "/echo/42" || out["params"].(map[string]any)["id"] != "42" || out["user"] != float64(1) {
		t.Fatalf("forwarded %v", out)
	}
	if _, ok := h.last.GetHeaders()["authorization"]; ok {
		t.Fatal("authorization header leaked to the plugin")
	}
	if _, ok := h.last.GetHeaders()["cookie"]; ok {
		t.Fatal("cookie leaked to the plugin")
	}
	if h.last.GetQuery()["x"].GetValues()[0] != "1" {
		t.Fatal("query not forwarded")
	}
	if w.Header().Get("Set-Cookie") != "" || w.Header().Get("X-Plugin") != "yes" {
		t.Fatalf("response headers %v", w.Header())
	}
	if !strings.Contains(w.Header().Get("Content-Security-Policy"), "sandbox") {
		t.Fatal("plugin responses must be sandboxed")
	}

	if w := do(e, "GET", "/api/v1/p/demo/echo/42", "", ""); w.Code != 401 {
		t.Fatalf("no token: %d", w.Code)
	}
	if w := do(e, "GET", "/api/v1/p/demo/echo/42", "nobody", ""); w.Code != 403 {
		t.Fatalf("no permission: %d", w.Code)
	}
	if w := do(e, "POST", "/api/v1/p/demo/echo/42", "admin", ""); w.Code != 405 {
		t.Fatalf("wrong method: %d", w.Code)
	}
	if w := do(e, "GET", "/api/v1/p/demo/nope", "admin", ""); w.Code != 404 {
		t.Fatalf("unknown route: %d", w.Code)
	}
	// Webhooks need no login.
	if w := do(e, "POST", "/api/v1/p/demo/hook", "", `{"a":1}`); w.Code != 201 || h.last.GetCaller().GetUserId() != 0 {
		t.Fatalf("webhook: %d", w.Code)
	}
	// Body limit.
	if w := do(e, "POST", "/api/v1/p/demo/hook", "", strings.Repeat("x", routes.MaxBodyBytes+1)); w.Code != 413 {
		t.Fatalf("oversized body: %d", w.Code)
	}
	// Disabled plugin.
	reg.Publish(nil)
	if w := do(e, "GET", "/api/v1/p/demo/echo/1", "admin", ""); w.Code != 503 {
		t.Fatalf("disabled plugin: %d", w.Code)
	}
}

func TestPluginAssets(t *testing.T) {
	e, _, _, pkg := setup(t)
	base := pkg.AssetBase()

	w := do(e, "GET", base+"/ui/index.html", "", "")
	if w.Code != 200 || w.Header().Get("Content-Type") != "text/html; charset=utf-8" {
		t.Fatalf("html: %d %s", w.Code, w.Header().Get("Content-Type"))
	}
	if !strings.Contains(w.Header().Get("Content-Security-Policy"), "sandbox allow-scripts") ||
		!strings.Contains(w.Header().Get("Cache-Control"), "immutable") {
		t.Fatalf("headers %v", w.Header())
	}
	w = do(e, "GET", base+"/forms/apikey.schema.json", "", "")
	body, _ := io.ReadAll(w.Body)
	if w.Code != 200 || !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") || !json.Valid(body) {
		t.Fatalf("json asset: %d", w.Code)
	}
	if w := do(e, "GET", base+"/ui/icon.svg", "", ""); w.Code != 200 || w.Header().Get("Content-Type") != "image/svg+xml" {
		t.Fatalf("icon: %d", w.Code)
	}
	for _, p := range []string{"/secret.txt", "/manifest.json", "/ui/../secret.txt", "/runtimes/x/plugin"} {
		if w := do(e, "GET", base+p, "", ""); w.Code != http.StatusNotFound {
			t.Fatalf("%s: %d", p, w.Code)
		}
	}
	if w := do(e, "GET", "/plugin-ui/demo/0.9.0-deadbeef/ui/index.html", "", ""); w.Code != 404 {
		t.Fatalf("stale version hash: %d", w.Code)
	}
}
