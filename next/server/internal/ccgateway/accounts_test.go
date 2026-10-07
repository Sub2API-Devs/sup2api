package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestAccountProxyReconcileAndRequestIsolation(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	password, _ := cipher.Encrypt([]byte("private-proxy-password"), []byte("proxy"))
	var pid, id int64
	if e := db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port,password_enc) VALUES('test','http','proxy.example',3128,$1) RETURNING id`, password).Scan(&pid); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('ccg','ccgateway','managed',''::bytea,$1) RETURNING id`, pid).Scan(&id); e != nil {
		t.Fatal(e)
	}
	var mu sync.Mutex
	var applied string
	var writes, calls int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		if r.Header.Get("Authorization") != "Bearer controller-secret" {
			t.Error("controller authentication missing")
		}
		if strings.HasSuffix(r.URL.Path, "/status") {
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ready", "revision": applied})
			return
		}
		if strings.HasSuffix(r.URL.Path, "/config") {
			var d accountDesired
			if json.NewDecoder(r.Body).Decode(&d) != nil {
				t.Error("invalid desired state")
			}
			if d.Proxy["password"] != "private-proxy-password" {
				t.Error("missing decrypted proxy password")
			}
			applied = d.Revision
			writes++
			w.Write([]byte(`{}`))
			return
		}
		if r.URL.Path != "/accounts/1/connection" || r.Method != "GET" {
			t.Errorf("wrong control route %s", r.URL.Path)
		}
		if r.Header.Get("X-CCG-Revision") != applied {
			w.WriteHeader(409)
			return
		}
		_ = json.NewEncoder(w).Encode(accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: applied})

	}))
	defer server.Close()
	s.openAccount = func(_ context.Context, _ Config, target string) (*http.Client, func() error, error) {
		if target != "10.52.74.181:8787" {
			t.Error("wrong direct target", target)
		}
		return &http.Client{Transport: accountTransportFunc(func(r *http.Request) (*http.Response, error) {
			mu.Lock()
			defer mu.Unlock()
			if r.URL.Path != "/v1/messages" || r.Header.Get("x-api-key") != strings.Repeat("k", 32) || r.Header.Get("Authorization") != "" || r.Header.Get("X-CCG-Revision") != "" {
				t.Error("direct model authentication or endpoint incorrect")
			}
			calls++
			return &http.Response{StatusCode: 200, Header: http.Header{}, Body: io.NopCloser(strings.NewReader("{}"))}, nil
		})}, func() error { return nil }, nil
	}

	t.Setenv("CCGATEWAY_URL", server.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret"})
	encrypted, _ := cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	if e := s.Reconcile(ctx, strconv.FormatInt(id, 10)); e != nil {
		t.Fatal(e)
	}
	if e := s.Reconcile(ctx, strconv.FormatInt(id, 10)); e != nil {
		t.Fatal(e)
	}
	call := func() int {
		req, _ := http.NewRequest("POST", VirtualURL, strings.NewReader(`{}`))
		req.Header.Set("X-CCG-Revision", "attacker")
		req.Header.Set("x-api-key", "attacker")
		res, e := s.ModelClient(id).Do(req)
		if e != nil {
			t.Fatal(e)
		}
		io.Copy(io.Discard, res.Body)
		res.Body.Close()
		return res.StatusCode
	}
	for range 3 {
		if call() != 200 {
			t.Fatal("ready account rejected")
		}
	}
	if _, e := db.Pool.Exec(ctx, `UPDATE proxies SET port=3129,updated_at=clock_timestamp() WHERE id=$1`, pid); e != nil {
		t.Fatal(e)
	}
	if call() != 409 {
		t.Fatal("unsynchronized proxy accepted")
	}
	if e := s.Reconcile(ctx, strconv.FormatInt(id, 10)); e != nil {
		t.Fatal(e)
	}
	if call() != 200 {
		t.Fatal("updated proxy rejected")
	}
	mu.Lock()
	defer mu.Unlock()
	if writes != 2 || calls != 4 {
		t.Fatalf("calls mutated config: writes=%d calls=%d", writes, calls)
	}
}

func TestAPIKeyDesiredRotation(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	service := New(db, cipher)
	var pid, id int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port) VALUES('api-key-test','http','proxy.example',3128) RETURNING id`).Scan(&pid); err != nil {
		t.Fatal(err)
	}
	encrypt := func(key string) []byte {
		raw, _ := json.Marshal(map[string]string{"api_key": key, "base_url": "https://relay.example"})
		enc, err := cipher.Encrypt(raw, []byte("account:ccgateway"))
		if err != nil {
			t.Fatal(err)
		}
		return enc
	}
	if err := db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('ccg-api','ccgateway','apikey',$1,$2) RETURNING id`, encrypt("first-test-key"), pid).Scan(&id); err != nil {
		t.Fatal(err)
	}
	d, err := service.desired(ctx, id, true)
	if err != nil {
		t.Fatal(err)
	}
	if d.Auth["mode"] != "api_key" || d.Auth["api_key"] != "first-test-key" || !d.Enabled {
		t.Fatal("missing runtime authentication")
	}
	requestState, err := service.desired(ctx, id, false)
	if err != nil {
		t.Fatal(err)
	}
	if requestState.Auth != nil || requestState.Proxy != nil || requestState.Revision != d.Revision {
		t.Fatal("request path disclosed credentials")
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE accounts SET credentials_enc=$1 WHERE id=$2`, encrypt("second-test-key"), id); err != nil {
		t.Fatal(err)
	}
	rotated, err := service.desired(ctx, id, true)
	if err != nil {
		t.Fatal(err)
	}
	if rotated.Revision == d.Revision || rotated.Auth["api_key"] != "second-test-key" {
		t.Fatal("key rotation did not invalidate runtime")
	}
	if !IsManaged("ccgateway", "apikey", VirtualURL) || IsManaged("other", "apikey", VirtualURL) {
		t.Fatal("managed routing identity incorrect")
	}
}
