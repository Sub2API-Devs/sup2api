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
