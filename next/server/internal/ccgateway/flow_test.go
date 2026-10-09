package ccgateway

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// runtimeFixture is a per-account runtimes setup against a fake controller.
type runtimeFixture struct {
	t      *testing.T
	db     *store.DB
	s      *Service
	engine *gin.Engine
	auth   *keyAuth
	cipher *secret.Cipher
}

// keyAuth authenticates "Bearer u<id>" (plain "test" is user 1) and grants
// each user the listed keys; users without an entry hold every key.
type keyAuth struct{ keys map[int64][]string }

func (a *keyAuth) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	if tok == "test" {
		return 1, nil
	}
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}
func (a *keyAuth) Can(_ context.Context, uid int64, key string) (bool, error) {
	keys, ok := a.keys[uid]
	if !ok {
		return true, nil
	}
	for _, k := range keys {
		if k == key {
			return true, nil
		}
	}
	return false, nil
}
func (a *keyAuth) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (a *keyAuth) CanGrant(context.Context, int64, []string) error { return nil }
func (a *keyAuth) CanActOn(context.Context, int64, []string) error { return nil }

func newRuntimeFixture(t *testing.T, controller http.HandlerFunc) *runtimeFixture {
	t.Helper()
	db := testutil.DB(t)
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	server := httptest.NewServer(controller)
	t.Cleanup(server.Close)
	t.Setenv("CCGATEWAY_URL", server.URL)
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := &keyAuth{keys: map[int64][]string{}}
	s.Authorizer = auth
	s.RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	f := &runtimeFixture{t: t, db: db, s: s, engine: engine, auth: auth, cipher: cipher}
	f.runtimes(true)
	return f
}

// runtimes turns per-account runtimes on or off.
func (f *runtimeFixture) runtimes(on bool) {
	f.t.Helper()
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: on, AdminKey: "controller-secret"})
	encrypted, _ := f.cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := f.db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		f.t.Fatal(e)
	}
}

func (f *runtimeFixture) proxy(createdBy *int64) int64 {
	f.t.Helper()
	var id int64
	if e := f.db.Pool.QueryRow(context.Background(), `INSERT INTO proxies(name,protocol,host,port,created_by) VALUES('p'||clock_timestamp(),'http','proxy.example',3128,$1) RETURNING id`, createdBy).Scan(&id); e != nil {
		f.t.Fatal(e)
	}
	return id
}

// account inserts a managed account, with a proxy unless withProxy is false.
func (f *runtimeFixture) account(withProxy bool) int64 {
	f.t.Helper()
	var pid *int64
	if withProxy {
		id := f.proxy(nil)
		pid = &id
	}
	var id int64
	if e := f.db.Pool.QueryRow(context.Background(), `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('ccg','ccgateway','managed',''::bytea,$1) RETURNING id`, pid).Scan(&id); e != nil {
		f.t.Fatal(e)
	}
	return id
}

func (f *runtimeFixture) user(email string) int64 {
	f.t.Helper()
	var id int64
	if err := f.db.Pool.QueryRow(context.Background(), `INSERT INTO users(email,password_hash) VALUES($1,'x') RETURNING id`, email).Scan(&id); err != nil {
		f.t.Fatal(err)
	}
	return id
}

func (f *runtimeFixture) call(method string, id int64, action, body string) (int, map[string]any) {
	f.t.Helper()
	return f.callAs(1, method, id, action, body)
}

func (f *runtimeFixture) callAs(uid int64, method string, id int64, action, body string) (int, map[string]any) {
	f.t.Helper()
	return f.request(uid, method, "/system/ccgateway/accounts/"+strconv.FormatInt(id, 10)+"/"+action, body)
}

func (f *runtimeFixture) request(uid int64, method, path, body string) (int, map[string]any) {
	f.t.Helper()
	req := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
	w := httptest.NewRecorder()
	f.engine.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func data(out map[string]any) map[string]any {
	d, _ := out["data"].(map[string]any)
	return d
}

func reason(out map[string]any) any {
	e, _ := out["error"].(map[string]any)
	d, _ := e["details"].(map[string]any)
	return d["reason"]
}

// fakeController mimics tools/ccgateway/runtime/manager.py and the business
// containers behind it (one pending login per runtime, CONTRACTS §49.14).
type fakeController struct {
	t          *testing.T
	mu         sync.Mutex
	revision   map[string]string // applied revision per key ("" blocked)
	created    map[string]time.Time
	loggedIn   map[string]bool
	pending    map[string]string
	n          int
	calls      []string
	deleteCode int
	cliVersion string // cli_version probe of admin/features ("" reports none)
}

func newFakeController(t *testing.T) *fakeController {
	return &fakeController{t: t, revision: map[string]string{}, created: map[string]time.Time{},
		loggedIn: map[string]bool{}, pending: map[string]string{}, deleteCode: 200}
}

var fakePath = regexp.MustCompile(`^/accounts/([1-9][0-9]{0,17}|d[0-9a-f]{16})(?:/(.*))?$`)

func (c *fakeController) fail(w http.ResponseWriter, code string) {
	w.WriteHeader(400)
	_ = json.NewEncoder(w).Encode(map[string]any{"type": "error", "error": map[string]string{"type": code, "message": "fake " + code}})
}

func (c *fakeController) seen(prefix string) []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	var out []string
	for _, call := range c.calls {
		if strings.HasPrefix(call, prefix) {
			out = append(out, call)
		}
	}
	return out
}

func (c *fakeController) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if r.Header.Get("Authorization") != "Bearer controller-secret" {
		w.WriteHeader(401)
		return
	}
	call := r.Method + " " + r.URL.Path
	if h := r.Header.Get("X-CCG-Delete-Account"); h != "" {
		call += " delete-account=" + h
	}
	c.calls = append(c.calls, call)
	if r.URL.Path == "/accounts" && r.Method == "GET" {
		list := []map[string]string{}
		for key, at := range c.created {
			list = append(list, map[string]string{"key": key, "status": "ready", "created_at": at.UTC().Format(time.RFC3339)})
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"runtimes": list})
		return
	}
	m := fakePath.FindStringSubmatch(r.URL.Path)
	if m == nil {
		w.WriteHeader(404)
		return
	}
	key, path := m[1], m[2]
	var body struct {
		SessionID string `json:"session_id"`
		Code      string `json:"code"`
		Enabled   bool   `json:"enabled"`
		Revision  string `json:"revision"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	switch {
	case path == "" && r.Method == "DELETE":
		// An account-id runtime only with the header naming it (§49.17).
		if !strings.HasPrefix(key, "d") && r.Header.Get("X-CCG-Delete-Account") != key {
			w.WriteHeader(405)
			return
		}
		w.WriteHeader(c.deleteCode)
		if c.deleteCode == 200 {
			delete(c.created, key)
			delete(c.revision, key)
			_, _ = w.Write([]byte(`{"deleted":true}`))
		}
		return
	case path == "config":
		if _, ok := c.created[key]; !ok {
			c.created[key] = time.Now()
		}
		if body.Enabled {
			c.revision[key] = body.Revision
		} else {
			c.revision[key] = ""
		}
		_, _ = w.Write([]byte(`{}`))
		return
	case path == "status":
		status := "pending"
		if c.revision[key] != "" {
			status = "ready"
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"key": key, "container": "ccg-" + key + "-app", "status": status, "revision": c.revision[key]})
		return
	}
	if rev := c.revision[key]; rev == "" || r.Header.Get("X-CCG-Revision") != rev {
		w.WriteHeader(409)
		_, _ = w.Write([]byte(`{"error":"not_synchronized"}`))
		return
	}
	session := func() map[string]any {
		return map[string]any{"session_id": c.pending[key],
			"url":        "https://claude.ai/oauth/authorize?state=st&code_challenge=c&code_challenge_method=S256",
			"expires_at": time.Now().Add(10 * time.Minute).UTC()}
	}
	switch path {
	case "connection":
		_ = json.NewEncoder(w).Encode(accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: c.revision[key]})
	case "admin/status":
		_ = json.NewEncoder(w).Encode(map[string]any{"healthy": true, "logged_in": c.loggedIn[key], "auth_method": "oauth"})
	case "admin/features":
		probes := []features.RuntimeProbe{}
		if c.cliVersion != "" {
			probes = append(probes, features.RuntimeProbe{Name: "cli_version", Status: "observed", Value: c.cliVersion})
		}
		_ = json.NewEncoder(w).Encode(features.RuntimeCapabilities{ProtocolVersion: 1, Build: features.BuildInfo{Version: "test", Revision: "fixture"}, Catalog: features.Catalog(), PolicySchemaVersions: []int{1}, Probes: probes, ModelProviderVerification: "not_run"})
	case "admin/auth/session":
		if c.pending[key] == "" {
			_, _ = w.Write([]byte(`{"session":null}`))
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"session": session()})
	case "admin/auth/start":
		if c.pending[key] == "" {
			c.n++
			c.pending[key] = fmt.Sprintf("s%d", c.n)
		}
		_ = json.NewEncoder(w).Encode(session())
	case "admin/auth/complete":
		switch {
		case c.pending[key] == "" || (body.SessionID != "" && body.SessionID != c.pending[key]):
			c.fail(w, "session_not_found")
		case !strings.Contains(body.Code, "#"):
			c.fail(w, "invalid_code")
		default:
			c.pending[key] = ""
			c.loggedIn[key] = true
			_, _ = w.Write([]byte(`{"success":true}`))
		}
	case "admin/auth/cancel", "admin/auth/logout":
		c.pending[key] = ""
		if path == "admin/auth/logout" {
			c.loggedIn[key] = false
		}
		_, _ = w.Write([]byte(`{"success":true}`))
	default:
		w.WriteHeader(404)
		_, _ = w.Write([]byte(`{"type":"error","error":{"type":"not_found_error","message":"not found"}}`))
	}
}

func TestKickReconcilesWithoutWaitingForTheSweep(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	id := f.account(true)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	// Only the kick consumer runs: no sweep can be what configured it.
	go f.s.reconcileKicked(ctx)
	f.s.Kick(strconv.FormatInt(id, 10))
	path := "PUT /accounts/" + strconv.FormatInt(id, 10) + "/config"
	deadline := time.Now().Add(20 * time.Second)
	for len(ctl.seen(path)) == 0 {
		if time.Now().After(deadline) {
			t.Fatal("kicked account was not reconciled")
		}
		time.Sleep(20 * time.Millisecond)
	}
	// A zero Service (no kick channel) and a full queue never block.
	(&Service{}).Kick("1")
	for range 200 {
		f.s.Kick(strconv.FormatInt(id, 10))
	}
}

func TestStartRetriesUntilTheRuntimeAnswers(t *testing.T) {
	startRetryEvery = 10 * time.Millisecond
	t.Cleanup(func() { startRetryEvery = 2 * time.Second })
	var starts atomic.Int32
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/admin/auth/start"):
			// Not synchronized yet, then the app is not listening yet.
			switch starts.Add(1) {
			case 1:
				w.WriteHeader(409)
				_, _ = w.Write([]byte(`{"error":"not_synchronized"}`))
			case 2:
				w.WriteHeader(503)
				_, _ = w.Write([]byte(`{"error":"runtime_unavailable"}`))
			default:
				_, _ = w.Write([]byte(`{"session_id":"s1","url":"https://claude.ai/oauth/authorize?state=x&code_challenge=y&code_challenge_method=S256","expires_at":"2026-10-05T00:10:00Z"}`))
			}
		case strings.HasSuffix(r.URL.Path, "/admin/auth/complete"):
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"invalid_code","message":"Paste the complete code#state of this login."}}`))
		case strings.HasSuffix(r.URL.Path, "/admin/auth/cancel"):
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"some_future_code","message":"Something new.\u0007"}}`))
		default:
			t.Errorf("unexpected controller call %s %s", r.Method, r.URL.Path)
		}
	})
	id := f.account(true)
	code, out := f.call("POST", id, "start", `{}`)
	if code != 200 || starts.Load() != 3 {
		t.Fatalf("start: %d %v (attempts %d)", code, out, starts.Load())
	}
	if data(out)["session_id"] != "s1" {
		t.Fatalf("start result: %v", out)
	}
	// A final answer from the business container is shown, not retried: its
	// code is details.reason, its English message the message.
	code, out = f.call("POST", id, "complete", `{"session_id":"s1","code":"bad"}`)
	errObj, _ := out["error"].(map[string]any)
	if code != 400 || errObj["code"] != "invalid_argument" || reason(out) != "invalid_code" || errObj["message"] != "Paste the complete code#state of this login." {
		t.Fatalf("complete error: %d %v", code, out)
	}
	// Unknown codes pass through unchanged (control characters dropped).
	code, out = f.call("POST", id, "cancel", ``)
	errObj, _ = out["error"].(map[string]any)
	if code != 400 || reason(out) != "some_future_code" || errObj["message"] != "Something new." {
		t.Fatalf("cancel error: %d %v", code, out)
	}
	// Only a JSON object is forwarded.
	if code, out = f.call("POST", id, "complete", `[1]`); code != 400 {
		t.Fatalf("non-object body: %d %v", code, out)
	}
}

func TestAccountWithoutProxyIsReportedBlocked(t *testing.T) {
	var puts atomic.Int32
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/config") {
			var d accountDesired
			_ = json.NewDecoder(r.Body).Decode(&d)
			if d.Enabled {
				t.Error("account without a proxy enabled")
			}
			puts.Add(1)
			_, _ = w.Write([]byte(`{"status":"blocked"}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "/status") {
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
			return
		}
		t.Errorf("unexpected controller call %s", r.URL.Path)
	})
	id := f.account(false)
	code, out := f.call("POST", id, "sync", `{}`)
	if code != 200 || data(out)["status"] != "blocked" || data(out)["reason"] != "no_proxy" || puts.Load() != 1 {
		t.Fatalf("sync: %d %v", code, out)
	}
	code, out = f.call("GET", id, "status", "")
	if code != 200 || data(out)["status"] != "blocked" || data(out)["reason"] != "no_proxy" {
		t.Fatalf("status: %d %v", code, out)
	}
	// Runtime actions of a blocked runtime say why instead of a 409.
	code, out = f.call("POST", id, "start", `{}`)
	if code != 400 || reason(out) != "no_proxy" {
		t.Fatalf("start on a blocked runtime: %d %v", code, out)
	}
}

// TestSessionComesFromTheContainer: GET session is the container's pending
// login (no copy in the core); an older image without the endpoint has none.
func TestSessionComesFromTheContainer(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	id := f.account(true)
	if code, out := f.call("POST", id, "sync", `{}`); code != 200 {
		t.Fatalf("sync: %d %v", code, out)
	}
	if code, out := f.call("GET", id, "session", ""); code != 200 || out["data"] != nil {
		t.Fatalf("no session yet: %d %v", code, out)
	}
	code, out := f.call("POST", id, "start", `{}`)
	if code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("start: %d %v", code, out)
	}
	if code, out = f.call("GET", id, "session", ""); code != 200 || data(out)["session_id"] != "s1" || data(out)["url"] == "" {
		t.Fatalf("session after start: %d %v", code, out)
	}
	// start is idempotent in the container.
	if code, out = f.call("POST", id, "start", `{}`); code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("second start: %d %v", code, out)
	}
	if code, out = f.call("POST", id, "complete", `{"code":"abc#st"}`); code != 200 || data(out)["success"] != true {
		t.Fatalf("complete: %d %v", code, out)
	}
	if code, out = f.call("GET", id, "health", ""); code != 200 || data(out)["logged_in"] != true {
		t.Fatalf("health: %d %v", code, out)
	}
	if code, out = f.call("POST", id, "complete", `{"code":"abc#st"}`); code != 400 || reason(out) != "session_not_found" {
		t.Fatalf("complete without a login: %d %v", code, out)
	}

	old := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/admin/auth/session") {
			w.WriteHeader(404)
			_, _ = w.Write([]byte(`{"error":"not found"}`))
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
	})
	if code, out := old.call("GET", old.account(true), "session", ""); code != 200 || out["data"] != nil {
		t.Fatalf("session on an older image: %d %v", code, out)
	}
}

// TestHealthReportsObservedCLIVersion: GET .../health adds the Claude Code
// version the Worker observed (admin/features cli_version probe), read only;
// a Worker reporting none, an older one without the endpoint, or an unsafe
// value leaves the field out and the login state unchanged.
func TestHealthReportsObservedCLIVersion(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	id := f.account(true)
	if code, out := f.call("POST", id, "sync", `{}`); code != 200 {
		t.Fatalf("sync: %d %v", code, out)
	}
	code, out := f.call("GET", id, "health", "")
	if _, has := data(out)["cli_version"]; code != 200 || has || data(out)["healthy"] != true {
		t.Fatalf("health without a probe: %d %v", code, out)
	}
	ctl.cliVersion = "2.1.292"
	code, out = f.call("GET", id, "health", "")
	if code != 200 || data(out)["cli_version"] != "2.1.292" || data(out)["healthy"] != true || data(out)["logged_in"] != false {
		t.Fatalf("health with a probe: %d %v", code, out)
	}
	if calls := ctl.seen("GET /accounts/" + strconv.FormatInt(id, 10) + "/admin/features"); len(calls) != 2 {
		t.Fatalf("admin/features calls: %v", calls)
	}
	ctl.cliVersion = "<script>"
	if code, out = f.call("GET", id, "health", ""); code != 200 || data(out)["cli_version"] != nil {
		t.Fatalf("unsafe version shown: %d %v", code, out)
	}

	old := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/admin/features"):
			w.WriteHeader(404)
		case strings.HasSuffix(r.URL.Path, "/admin/status"):
			_, _ = w.Write([]byte(`{"healthy":true,"logged_in":true,"auth_method":"oauth"}`))
		default:
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
		}
	})
	code, out = old.call("GET", old.account(true), "health", "")
	if _, has := data(out)["cli_version"]; code != 200 || has || data(out)["logged_in"] != true {
		t.Fatalf("health on an older Worker: %d %v", code, out)
	}
}

func TestCLIVersionOf(t *testing.T) {
	probe := func(status, value string) features.RuntimeProbe {
		return features.RuntimeProbe{Name: "cli_version", Status: status, Value: value}
	}
	for _, tc := range []struct {
		probes []features.RuntimeProbe
		want   string
	}{
		{nil, ""},
		{[]features.RuntimeProbe{probe("unavailable", "")}, ""},
		{[]features.RuntimeProbe{probe("observed", "2.1.292")}, "2.1.292"},
		{[]features.RuntimeProbe{probe("observed", "2.1.292"), probe("observed", "2.1.292")}, "2.1.292"},
		{[]features.RuntimeProbe{probe("observed", "2.1.292"), probe("observed", "2.1.288")}, ""},
		{[]features.RuntimeProbe{probe("observed", "2.1.292 (Claude Code)")}, ""},
	} {
		if got := cliVersionOf(features.RuntimeCapabilities{Probes: tc.probes}); got != tc.want {
			t.Errorf("%v: got %q, want %q", tc.probes, got, tc.want)
		}
	}
}

// TestAccountRuntimeOwnership: besides settings administrators, account
// readers and updaters reach the runtime of the accounts they may see; own
// level only the ones they created (CONTRACTS §49.5).
func TestAccountRuntimeOwnership(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	ctx := context.Background()
	vendor, reader, nobody := f.user("vendor@x"), f.user("reader@x"), f.user("nobody@x")
	admin := f.user("admin@x") // no entry in keys: holds every key
	f.auth.keys[vendor] = []string{"account:own:read", "account:own:update"}
	f.auth.keys[reader] = []string{"account:read"}
	f.auth.keys[nobody] = []string{"account:own:create"}
	mine, other := f.account(true), f.account(true)
	if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET created_by=$1 WHERE id=$2`, vendor, mine); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int64{mine, other} {
		if err := f.s.Reconcile(ctx, strconv.FormatInt(id, 10)); err != nil {
			t.Fatal(err)
		}
	}
	for _, tc := range []struct {
		uid            int64
		method, action string
		id             int64
		want           int
	}{
		{vendor, "GET", "status", mine, 200},
		{vendor, "GET", "session", mine, 200},
		{vendor, "GET", "features", mine, 200},
		{vendor, "GET", "features", other, 404},
		{reader, "GET", "features", other, 200},
		{nobody, "GET", "features", mine, 403},
		{admin, "GET", "features", other, 200},
		{vendor, "POST", "start", mine, 200},
		{vendor, "GET", "status", other, 404},
		{vendor, "POST", "sync", other, 404},
		{vendor, "POST", "start", other, 404},
		{reader, "GET", "status", other, 200},
		{reader, "GET", "health", mine, 200},
		{reader, "POST", "sync", mine, 403},
		{nobody, "GET", "status", mine, 403},
		{nobody, "POST", "start", mine, 403},
		{admin, "POST", "cancel", mine, 200}, // settings administrator
		{admin, "GET", "status", other, 200},
	} {
		code, out := f.callAs(tc.uid, tc.method, tc.id, tc.action, `{}`)
		if code != tc.want {
			t.Errorf("user %d %s %s on %d: %d %v, want %d", tc.uid, tc.method, tc.action, tc.id, code, out, tc.want)
		}
	}
}

func TestRuntimeErrorMapping(t *testing.T) {
	for _, tc := range []struct {
		status       int
		raw          string
		code, reason string
	}{
		{400, `{"type":"error","error":{"type":"invalid_code","message":"m"}}`, "invalid_argument", "invalid_code"},
		{400, `{"error":"invalid_request"}`, "invalid_argument", "invalid_request"},
		{400, `{"type":"error","error":{"type":"Bad Code","message":"m"}}`, "invalid_argument", ""},
		{409, `{"error":"not_synchronized"}`, "unavailable", "not_synchronized"},
		{409, `{"error":"account proxy not synchronized"}`, "unavailable", "not_synchronized"},
		{409, `{"error":"api_key_account"}`, "invalid_argument", "api_key_account"},
		{503, `{"error":"image_pull_failed"}`, "unavailable", "image_pull_failed"},
		{503, `{"error":"account runtime unavailable"}`, "unavailable", "runtime_unavailable"},
		{502, `garbage`, "unavailable", "runtime_unavailable"},
	} {
		e := runtimeError(tc.status, []byte(tc.raw))
		got, _ := e.Details["reason"].(string)
		if e.Code != tc.code || got != tc.reason {
			t.Errorf("%d %s: %s %q, want %s %q", tc.status, tc.raw, e.Code, got, tc.code, tc.reason)
		}
		for _, r := range e.Message {
			if r > 127 {
				t.Errorf("%d %s: non-English message %q", tc.status, tc.raw, e.Message)
				break
			}
		}
	}
}
