package environment

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

	"github.com/gin-gonic/gin"

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
func (fakeAuthz) CanGrant(context.Context, int64, []string) error { return nil }
func (fakeAuthz) CanActOn(context.Context, int64, []string) error { return nil }

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
	svc   *Service
	bus   *fakeBus
	h     http.Handler
	admin int64
	user  int64
}

func setup(t *testing.T) *env {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	e := &env{t: t, db: db, bus: &fakeBus{}}
	e.admin = mkUser(t, db, "admin@x.com")
	e.user = mkUser(t, db, "user@x.com")
	engine := gin.New()
	e.svc = New(db, e.bus, core.EnvironmentValues{core.EnvVarRelayTimeoutSeconds: 900, core.EnvVarStreamingIdleTimeoutSeconds: 45})
	e.svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{admin: e.admin}))
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
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Authorization", fmt.Sprintf("Bearer u%d", uid))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestGlobalLayerRoutes(t *testing.T) {
	e := setup(t)
	// The declarations are for the editors, not for every signed-in user.
	if code, _ := e.do(e.user, "GET", "/environment/variables", nil); code != 403 {
		t.Fatalf("variables perm: %d", code)
	}
	code, out := e.do(e.admin, "GET", "/environment/variables", nil)
	if code != 200 || len(out["data"].(map[string]any)["variables"].([]any)) != len(core.EnvironmentVariables) {
		t.Fatalf("variables: %d %v", code, out)
	}
	if code, _ = e.do(e.user, "GET", "/settings/environment", nil); code != 403 {
		t.Fatalf("perm: %d", code)
	}
	_, out = e.do(e.admin, "GET", "/settings/environment", nil)
	if fmt.Sprint(out["data"]) != "map[values:map[]]" {
		t.Fatalf("empty: %v", out)
	}
	// The global layer holds max_request_body_mb; an unknown key is refused.
	if code, out = e.do(e.admin, "PUT", "/settings/environment", map[string]any{"values": map[string]int64{"nope": 1}}); code != 400 {
		t.Fatalf("unknown: %d %v", code, out)
	}
	if got := e.svc.GlobalEnvironment(context.Background()); len(got) != 2 || got[core.EnvVarMaxRequestBodyMB] != 0 {
		t.Fatalf("cached before put, the process layer alone: %v", got)
	}
	code, out = e.do(e.admin, "PUT", "/settings/environment", map[string]any{"values": map[string]int64{
		"max_request_body_mb": 64, "relay_timeout_seconds": 0}})
	if code != 200 || fmt.Sprint(out["data"]) != "map[values:map[max_request_body_mb:64]]" {
		t.Fatalf("put: %d %v", code, out)
	}
	if len(e.bus.msgs) != 1 || e.bus.msgs[0] != core.ChannelConfigChanged+` {"key":"environment"}` {
		t.Fatalf("broadcast: %v", e.bus.msgs)
	}
	// The put invalidated the cached (empty) layer.
	if got := e.svc.GlobalEnvironment(context.Background()); got[core.EnvVarMaxRequestBodyMB] != 64 {
		t.Fatalf("global: %v", got)
	}
	_, out = e.do(e.admin, "GET", "/settings/environment", nil)
	if fmt.Sprint(out["data"]) != "map[values:map[max_request_body_mb:64]]" {
		t.Fatalf("get: %v", out)
	}
}

func TestResolveEnvironment(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	if _, out := e.do(e.admin, "PUT", "/settings/environment", map[string]any{"values": map[string]int64{
		"relay_timeout_seconds": 300, "max_request_body_mb": 50}}); out["data"] == nil {
		t.Fatalf("put: %v", out)
	}
	var groupID, accountID int64
	if err := e.db.Pool.QueryRow(ctx, `INSERT INTO groups (name, environment)
		VALUES ('g', '{"relay_timeout_seconds": 120, "task_poll_max_failures": 3}') RETURNING id`).Scan(&groupID); err != nil {
		t.Fatal(err)
	}
	if err := e.db.Pool.QueryRow(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, environment)
		VALUES ('a', 'p', 't', ''::bytea, '{"relay_timeout_seconds": 60, "max_request_body_mb": 10}') RETURNING id`).Scan(&accountID); err != nil {
		t.Fatal(err)
	}
	got, err := e.svc.ResolveEnvironment(ctx, groupID, accountID)
	if err != nil {
		t.Fatal(err)
	}
	// The account's max_request_body_mb is not on its layer and is skipped.
	if got[core.EnvVarRelayTimeoutSeconds] != 60 || got[core.EnvVarTaskPollMaxFailures] != 3 || got[core.EnvVarMaxRequestBodyMB] != 50 {
		t.Fatalf("resolved: %v", got)
	}
	got, err = e.svc.ResolveEnvironment(ctx, groupID, 0)
	if err != nil || got[core.EnvVarRelayTimeoutSeconds] != 120 {
		t.Fatalf("group alone: %v %v", got, err)
	}
	// The global layer wins over the process layer, which fills what it leaves unset.
	got, err = e.svc.ResolveEnvironment(ctx, 0, 0)
	if err != nil || got[core.EnvVarRelayTimeoutSeconds] != 300 || got[core.EnvVarStreamingIdleTimeoutSeconds] != 45 {
		t.Fatalf("global alone: %v %v", got, err)
	}
	// The async task variables have no global layer: the reconcile settings are.
	if code, _ := e.do(e.admin, "PUT", "/settings/environment", map[string]any{"values": map[string]int64{"task_poll_max_failures": 9}}); code != 400 {
		t.Fatalf("task variable on the global layer: %d", code)
	}
}

// The refill does not run on the caller's context: a cancelled client must
// not leave the process-only fallback cached for everyone.
func TestGlobalEnvironmentIgnoresCallerCancel(t *testing.T) {
	e := setup(t)
	if code, out := e.do(e.admin, "PUT", "/settings/environment", map[string]any{"values": map[string]int64{
		"max_request_body_mb": 64}}); code != 200 {
		t.Fatalf("put: %d %v", code, out)
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if got := e.svc.GlobalEnvironment(ctx); got[core.EnvVarMaxRequestBodyMB] != 64 {
		t.Fatalf("cancelled caller: %v", got)
	}
	if got := e.svc.GlobalEnvironment(context.Background()); got[core.EnvVarMaxRequestBodyMB] != 64 {
		t.Fatalf("cached after a cancelled caller: %v", got)
	}
}
