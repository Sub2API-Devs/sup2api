package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

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
	s.Redis = redis.NewClient(&redis.Options{Addr: miniredis.RunT(t).Addr()})
	server := httptest.NewServer(controller)
	t.Cleanup(server.Close)
	t.Setenv("CCGATEWAY_URL", server.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret"})
	encrypted, _ := cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := &keyAuth{keys: map[int64][]string{}}
	s.RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	return &runtimeFixture{t: t, db: db, s: s, engine: engine, auth: auth}
}

// account inserts a managed account, with a proxy unless withProxy is false.
func (f *runtimeFixture) account(withProxy bool) int64 {
	f.t.Helper()
	ctx := context.Background()
	var pid *int64
	if withProxy {
		var id int64
		if e := f.db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port) VALUES('p'||clock_timestamp(),'http','proxy.example',3128) RETURNING id`).Scan(&id); e != nil {
			f.t.Fatal(e)
		}
		pid = &id
	}
	var id int64
	if e := f.db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('ccg','ccgateway','managed',''::bytea,$1) RETURNING id`, pid).Scan(&id); e != nil {
		f.t.Fatal(e)
	}
	return id
}

func (f *runtimeFixture) call(method string, id int64, action, body string) (int, map[string]any) {
	f.t.Helper()
	return f.callAs(1, method, id, action, body)
}

func (f *runtimeFixture) callAs(uid int64, method string, id int64, action, body string) (int, map[string]any) {
	f.t.Helper()
	req := httptest.NewRequest(method, "/api/v1/system/ccgateway/accounts/"+strconv.FormatInt(id, 10)+"/"+action, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
	w := httptest.NewRecorder()
	f.engine.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestKickReconcilesWithoutWaitingForTheSweep(t *testing.T) {
	var mu sync.Mutex
	configured := map[string]bool{}
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/status") {
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
			return
		}
		mu.Lock()
		configured[r.URL.Path] = true
		mu.Unlock()
		_, _ = w.Write([]byte(`{}`))
	})
	id := f.account(true)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	// Only the kick consumer runs: no sweep can be what configured it.
	go f.s.reconcileKicked(ctx)
	f.s.Kick(id)
	path := "/accounts/" + strconv.FormatInt(id, 10) + "/config"
	deadline := time.Now().Add(20 * time.Second)
	for {
		mu.Lock()
		done := configured[path]
		mu.Unlock()
		if done {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("kicked account was not reconciled")
		}
		time.Sleep(20 * time.Millisecond)
	}
	// A zero Service (no kick channel) and a full queue never block.
	(&Service{}).Kick(id)
	for range 200 {
		f.s.Kick(id)
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
				_, _ = w.Write([]byte(`{"error":"account proxy not synchronized"}`))
			case 2:
				w.WriteHeader(503)
				_, _ = w.Write([]byte(`{"error":"account runtime unavailable"}`))
			default:
				_, _ = w.Write([]byte(`{"session_id":"s1","url":"https://claude.ai/oauth/authorize?state=x&code_challenge=y&code_challenge_method=S256","expires_at":"2026-10-05T00:10:00Z"}`))
			}
		case strings.HasSuffix(r.URL.Path, "/admin/auth/complete"):
			w.WriteHeader(400)
			_, _ = w.Write([]byte(`{"type":"error","error":{"type":"invalid_request_error","message":"请粘贴完整的 code#state，且必须属于本次授权"}}`))
		default:
			t.Errorf("unexpected controller call %s %s", r.Method, r.URL.Path)
		}
	})
	id := f.account(true)
	code, out := f.call("POST", id, "start", `{}`)
	if code != 200 || starts.Load() != 3 {
		t.Fatalf("start: %d %v (attempts %d)", code, out, starts.Load())
	}
	if data, _ := out["data"].(map[string]any); data["session_id"] != "s1" {
		t.Fatalf("start result: %v", out)
	}
	// A final answer from the business container is shown, not retried.
	code, out = f.call("POST", id, "complete", `{"session_id":"s1","code":"bad"}`)
	errObj, _ := out["error"].(map[string]any)
	if code != 400 || errObj["code"] != "invalid_argument" || !strings.Contains(errObj["message"].(string), "code#state") {
		t.Fatalf("complete error: %d %v", code, out)
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
	data, _ := out["data"].(map[string]any)
	if code != 200 || data["status"] != "blocked" || data["reason"] != "no_proxy" || puts.Load() != 1 {
		t.Fatalf("sync: %d %v", code, out)
	}
	code, out = f.call("GET", id, "status", "")
	data, _ = out["data"].(map[string]any)
	if code != 200 || data["status"] != "blocked" || data["reason"] != "no_proxy" {
		t.Fatalf("status: %d %v", code, out)
	}
}
