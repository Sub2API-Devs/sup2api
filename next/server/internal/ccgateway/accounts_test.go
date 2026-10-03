package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
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
		if r.URL.Path != "/accounts/1/v1/messages" {
			t.Errorf("wrong account route %s", r.URL.Path)
		}
		if r.Header.Get("X-CCG-Revision") != applied {
			w.WriteHeader(409)
			return
		}
		if r.Header.Get("x-api-key") != "" {
			t.Error("forwarded caller credential")
		}
		calls++
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()
	t.Setenv("CCGATEWAY_URL", server.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret"})
	encrypted, _ := cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	if e := s.Reconcile(ctx, id); e != nil {
		t.Fatal(e)
	}
	if e := s.Reconcile(ctx, id); e != nil {
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
	if e := s.Reconcile(ctx, id); e != nil {
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
