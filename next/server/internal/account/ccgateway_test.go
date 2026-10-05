package account

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// withCCGateway registers the ccgateway/managed type and a ccgateway service
// whose controller is ctl. runtimes selects per-account runtimes.
func (e *env) withCCGateway(runtimes bool, ctl http.HandlerFunc) *ccgateway.Service {
	e.t.Helper()
	info := core.PluginInfo{Key: "ccgateway", Version: "0.1.6", Trust: "official",
		Manifest: &manifest.Manifest{Name: manifest.LocalizedText{"en": "CCGateway"}}}
	e.gen.plugins = append(e.gen.plugins, info)
	e.gen.types = append(e.gen.types, core.AccountTypeBinding{Plugin: info,
		Type: manifest.AccountType{ID: "managed", Label: manifest.LocalizedText{"en": "Claude Code"},
			Form: manifest.Form{Mode: "schema"}, Platforms: []manifest.AccountPlatform{{Platform: "anthropic"}}},
		FormSchema: json.RawMessage(`{"type":"object"}`), Client: e.plat})
	srv := httptest.NewServer(ctl)
	e.t.Cleanup(srv.Close)
	e.t.Setenv("CCGATEWAY_URL", srv.URL)
	ccg := ccgateway.New(e.db, e.svc.d.Cipher)
	plain, _ := json.Marshal(ccgateway.Config{Mode: "local", AccountRuntimes: runtimes, AdminKey: "controller-secret"})
	enc, err := e.svc.d.Cipher.Encrypt(plain, []byte("system:ccgateway:v1"))
	if err != nil {
		e.t.Fatal(err)
	}
	envelope, _ := json.Marshal(map[string]any{"cipher": enc})
	if _, err := e.db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES('ccgateway_remote',$1)
		ON CONFLICT(key) DO UPDATE SET value=excluded.value`, envelope); err != nil {
		e.t.Fatal(err)
	}
	e.svc.d.CCGateway = ccg
	return ccg
}

// TestConnectCCGatewayWithAccountRuntimes: with per-account runtimes the
// shared /admin/status check is skipped, the account is created with its
// proxy and its runtime is prepared at once (CONTRACTS §49.6).
func TestConnectCCGatewayWithAccountRuntimes(t *testing.T) {
	e := setup(t)
	var mu sync.Mutex
	var paths []string
	ccg := e.withCCGateway(true, func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		paths = append(paths, r.Method+" "+r.URL.Path)
		mu.Unlock()
		if r.URL.Path == "/admin/status" {
			w.WriteHeader(404) // per-account controllers have no shared status
			return
		}
		if strings.HasSuffix(r.URL.Path, "/status") {
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
			return
		}
		_, _ = w.Write([]byte(`{}`))
	})
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go ccg.Run(ctx)
	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('ccg','http','proxy.example',3128) RETURNING id`)

	code, out := e.do("POST", "/system/ccgateway/connect", map[string]any{"name": "cc-1", "proxy_id": pid})
	if code != 201 {
		t.Fatalf("connect: %d %v", code, out)
	}
	d := out["data"].(map[string]any)
	id := int64(d["id"].(float64))
	if d["plugin_key"] != "ccgateway" || d["type"] != "managed" || d["proxy_id"] != float64(pid) {
		t.Fatalf("created account: %v", d)
	}
	want := "PUT /accounts/" + itoa(id) + "/config"
	deadline := time.Now().Add(20 * time.Second)
	for {
		mu.Lock()
		seen := strings.Join(paths, "\n")
		mu.Unlock()
		if strings.Contains(seen, "/admin/status") && !strings.Contains(seen, "/accounts/") {
			t.Fatalf("shared status was checked: %s", seen)
		}
		if strings.Contains(seen, want) {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("runtime not prepared; controller saw:\n%s", seen)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

// TestCreateAdoptsAnAuthorizedDraft: POST /accounts with ccgateway_runtime
// saves only an authorized draft of the caller and adopts it in the same
// transaction (CONTRACTS §49.10).
func TestCreateAdoptsAnAuthorizedDraft(t *testing.T) {
	var mu sync.Mutex
	loggedIn := map[string]bool{}
	e := setupWith(t, fakeAuthz{keys: map[int64][]string{}})
	ctl := func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/accounts/"), "/")
		if strings.HasSuffix(r.URL.Path, "/admin/status") {
			_ = json.NewEncoder(w).Encode(map[string]any{"healthy": true, "logged_in": loggedIn[parts[0]]})
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending"})
	}
	e.withCCGateway(true, ctl)
	authz := e.svc.d.Authorizer.(fakeAuthz)
	authz.keys[e.uid] = []string{"account:create", "account:update", "proxy:read"}
	other := e.addUser("other@x.com")
	authz.keys[other] = []string{"account:create", "proxy:read"}
	ctx := context.Background()
	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('ccg','http','proxy.example',3128) RETURNING id`)
	draft := func(key string, owner int64) string {
		if _, err := e.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, created_by) VALUES($1,$2,$3)`, key, pid, owner); err != nil {
			t.Fatal(err)
		}
		return key
	}
	mine, notSigned, theirs := draft("d0000000000000001", e.uid), draft("d0000000000000002", e.uid), draft("d0000000000000003", other)
	mu.Lock()
	loggedIn[mine], loggedIn[theirs] = true, true
	mu.Unlock()
	body := func(key string) map[string]any {
		return map[string]any{"name": "cc", "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{},
			"proxy_id": pid, "ccgateway_runtime": key}
	}
	reasonOf := func(out map[string]any) any {
		errObj, _ := out["error"].(map[string]any)
		d, _ := errObj["details"].(map[string]any)
		return d["reason"]
	}
	for _, tc := range []struct {
		key    string
		reason string
	}{
		{"d00000000000000ff", "draft_not_found"},
		{"12", "draft_not_found"},
		{theirs, "draft_not_found"},
		{notSigned, "draft_not_authorized"},
	} {
		code, out := e.do("POST", "/accounts", body(tc.key))
		if code != 400 || reasonOf(out) != tc.reason {
			t.Errorf("%s: %d %v, want 400 %s", tc.key, code, out, tc.reason)
		}
	}
	code, out := e.do("POST", "/accounts", map[string]any{"name": "x", "plugin_key": "openai", "type": "apikey",
		"credentials": map[string]any{"api_key": "sk-good-key-123"}, "ccgateway_runtime": mine})
	if code != 400 {
		t.Fatalf("draft on another type: %d %v", code, out)
	}
	var n int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM accounts`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("accounts created by failed requests: %d %v", n, err)
	}

	code, out = e.do("POST", "/accounts", body(mine))
	if code != 201 {
		t.Fatalf("create with an authorized draft: %d %v", code, out)
	}
	id := int64(out["data"].(map[string]any)["id"].(float64))
	var adopted *int64
	if err := e.db.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1 AND adopted_at IS NOT NULL`, mine).Scan(&adopted); err != nil || adopted == nil || *adopted != id {
		t.Fatalf("draft not adopted: %v %v", adopted, err)
	}
	// The draft cannot be used twice, and PATCH does not take it.
	if code, out = e.do("POST", "/accounts", body(mine)); code != 400 || reasonOf(out) != "draft_not_found" {
		t.Fatalf("second adoption: %d %v", code, out)
	}
	if code, out = e.do("PATCH", "/accounts/"+itoa(id), map[string]any{"ccgateway_runtime": notSigned}); code != 400 {
		t.Fatalf("PATCH with a draft: %d %v", code, out)
	}
	// A settings administrator may save someone else's draft.
	authz.keys[e.uid] = append(authz.keys[e.uid], "settings:manage")
	if code, out = e.do("POST", "/accounts", body(theirs)); code != 201 {
		t.Fatalf("settings administrator with another user's draft: %d %v", code, out)
	}
}

// TestConnectCCGatewaySharedNeedsAuthorization keeps the shared-container
// behaviour: an unauthorized shared CCGateway refuses to connect.
func TestConnectCCGatewaySharedNeedsAuthorization(t *testing.T) {
	e := setup(t)
	e.withCCGateway(false, func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(`{"healthy":true,"logged_in":false}`))
	})
	code, out := e.do("POST", "/system/ccgateway/connect", map[string]any{"name": "cc-shared"})
	if code != 503 {
		t.Fatalf("connect to an unauthorized shared CCGateway: %d %v", code, out)
	}
	var n int
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM accounts WHERE plugin_key='ccgateway'`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("account created: %d %v", n, err)
	}
}
