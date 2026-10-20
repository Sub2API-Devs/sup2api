package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// cachePanel is a fake control panel for any runtime key: GET .../connection
// and the .../tunnel Upgrade both answer 409 unless the revision is the
// applied one, like the controller.
type cachePanel struct {
	mu          sync.Mutex
	accountAddr string
	applied     string
	connections int
	tunnels     int
}

func (p *cachePanel) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" {
		_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
		return
	}
	p.mu.Lock()
	applied := p.applied
	tunnel := strings.HasSuffix(r.URL.Path, "/tunnel")
	if tunnel {
		p.tunnels++
	} else {
		p.connections++
	}
	p.mu.Unlock()
	revision := r.Header.Get("X-CCG-Revision")
	if r.Header.Get("Authorization") != "Bearer "+panelKey || revision != applied {
		w.WriteHeader(409)
		return
	}
	if !tunnel {
		_ = json.NewEncoder(w).Encode(accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: revision})
		return
	}
	conn, buf, err := w.(http.Hijacker).Hijack()
	if err != nil {
		return
	}
	defer conn.Close()
	upstream, err := net.Dial("tcp", p.accountAddr)
	if err != nil {
		return
	}
	defer upstream.Close()
	_, _ = io.WriteString(conn, "HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n")
	go func() {
		_, _ = io.Copy(upstream, buf)
		_ = upstream.(*net.TCPConn).CloseWrite()
	}()
	_, _ = io.Copy(conn, upstream)
}

func (p *cachePanel) counts() (int, int) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.connections, p.tunnels
}

func (p *cachePanel) apply(revision string) {
	p.mu.Lock()
	p.applied = revision
	p.mu.Unlock()
}

// TestRequestCacheControllerMode: requests reuse the account's revision, its
// connection and its tunnel (2026-10-11); a revision the controller no longer
// has is retried once with the account read again, a change published on the
// bus drops the route, and a runtime that is really behind is still a 409.
func TestRequestCacheControllerMode(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	var pid, id int64
	if e := db.Pool.QueryRow(ctx, `INSERT INTO proxies(name,protocol,host,port) VALUES('cache','http','proxy.example',3128) RETURNING id`).Scan(&pid); e != nil {
		t.Fatal(e)
	}
	if e := db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,proxy_id) VALUES('ccg','ccgateway','managed',''::bytea,$1) RETURNING id`, pid).Scan(&id); e != nil {
		t.Fatal(e)
	}
	var mu sync.Mutex
	var bodies []string
	account := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		mu.Lock()
		bodies = append(bodies, string(raw))
		mu.Unlock()
		if r.Header.Get("x-api-key") != strings.Repeat("k", 32) || r.Header.Get("X-CCGateway-Request-Policy") == "" {
			w.WriteHeader(401)
			return
		}
		_, _ = w.Write([]byte(`{}`))
	}))
	defer account.Close()
	panel := &cachePanel{accountAddr: account.Listener.Addr().String()}
	srv := httptest.NewServer(panel)
	defer srv.Close()
	cfg := testPanelConfig("127.0.0.1", srv.Listener.Addr().(*net.TCPAddr).Port, "")
	cfg.Scheme = "http"
	cfg.RequestPolicy = &RequestPolicy{SchemaVersion: 1, UnknownField: "reject", CLIVersion: "2.1.302"}
	plain, _ := json.Marshal(cfg)
	encrypted, _ := cipher.Encrypt(plain, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	revision := func() string {
		d, e := s.desired(ctx, id, false)
		if e != nil {
			t.Fatal(e)
		}
		return d.Revision
	}
	panel.apply(revision())
	call := func(body string) int {
		req, _ := http.NewRequest("POST", VirtualURL, strings.NewReader(body))
		res, e := s.ModelClient(id).Do(req)
		if e != nil {
			t.Fatal(e)
		}
		_, _ = io.Copy(io.Discard, res.Body)
		res.Body.Close()
		return res.StatusCode
	}

	for i := range 3 {
		if code := call(`{"n":` + strconv.Itoa(i) + `}`); code != 200 {
			t.Fatal("ready account answered", code)
		}
	}
	if connections, tunnels := panel.counts(); connections != 1 || tunnels != 1 {
		t.Fatalf("connection asked %d times, %d tunnels: not kept between requests", connections, tunnels)
	}

	// The proxy changed and another node reconciled the runtime, but the
	// message was missed: the kept revision is refused once, then the
	// request goes through with the account read again and its body intact.
	if _, e := db.Pool.Exec(ctx, `UPDATE proxies SET port=3129,updated_at=clock_timestamp() WHERE id=$1`, pid); e != nil {
		t.Fatal(e)
	}
	panel.apply(revision())
	s.cache.mu.Lock()
	for _, r := range s.cache.routes {
		_ = r.closeIdle() // the kept tunnel went idle and was closed
	}
	s.cache.mu.Unlock()
	if code := call(`{"n":"retried"}`); code != 200 {
		t.Fatal("stale revision not retried", code)
	}
	mu.Lock()
	last := bodies[len(bodies)-1]
	mu.Unlock()
	if last != `{"n":"retried"}` {
		t.Fatalf("retried body %q", last)
	}
	// The kept route's new tunnel was refused (409), then the connection of
	// the new revision was asked and a tunnel opened for it.
	if connections, tunnels := panel.counts(); connections != 2 || tunnels != 3 {
		t.Fatalf("after the refused revision: %d connections, %d tunnels; want 2, 3", connections, tunnels)
	}

	// A change on the bus drops the route at once.
	s.onConfigChanged([]byte(`{"type":"proxy","id":1}`))
	if code := call(`{}`); code != 200 {
		t.Fatal("after invalidation", code)
	}
	if connections, _ := panel.counts(); connections != 3 {
		t.Fatalf("connection asked %d times after invalidation, want 3", connections)
	}
	// Another node's configuration message is not ours.
	s.onConfigChanged([]byte(`{"key":"pricing"}`))
	if code := call(`{}`); code != 200 {
		t.Fatal("after an unrelated message", code)
	}
	if connections, _ := panel.counts(); connections != 3 {
		t.Fatal("unrelated configuration message dropped the route")
	}

	// A runtime that is really behind is still refused.
	panel.apply(strings.Repeat("b", 64))
	s.onAccountChanged([]byte(`{"account_id":` + strconv.FormatInt(id, 10) + `}`))
	if code := call(`{}`); code != 409 {
		t.Fatal("unsynchronized runtime accepted", code)
	}
}

type recordingBus struct {
	mu        sync.Mutex
	published []string
}

func (b *recordingBus) Publish(_ context.Context, channel string, payload []byte) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.published = append(b.published, channel+" "+string(payload))
	return nil
}

func (b *recordingBus) Subscribe(string, func([]byte)) func() { return func() {} }

// TestConfigChangedReachesOtherNodes: a saved configuration drops this
// node's request cache and tells the other nodes.
func TestConfigChangedReachesOtherNodes(t *testing.T) {
	bus := &recordingBus{}
	s := &Service{Bus: bus}
	s.cache.cfg = &cachedConfig{c: Config{Mode: "controller"}}
	s.cache.desired = map[int64]cachedDesired{7: {}}
	s.configChanged(context.Background())
	if s.cache.cfg != nil || s.cache.desired != nil {
		t.Fatal("request cache kept after a configuration save")
	}
	if len(bus.published) != 1 || bus.published[0] != `config:changed {"type":"ccgateway"}` {
		t.Fatalf("published %q", bus.published)
	}
	// What another node receives.
	other := &Service{}
	other.cache.cfg = &cachedConfig{c: Config{Mode: "controller"}}
	other.onConfigChanged([]byte(`{"type":"ccgateway"}`))
	if other.cache.cfg != nil {
		t.Fatal("other node kept its configuration")
	}
	// An account change keeps the configuration and drops the account.
	other.cache.cfg = &cachedConfig{c: Config{Mode: "controller"}}
	other.cache.desired = map[int64]cachedDesired{7: {}, 8: {}}
	other.onAccountChanged([]byte(`{"account_id":7}`))
	if other.cache.cfg == nil || len(other.cache.desired) != 1 {
		t.Fatal("account change dropped the wrong entries")
	}
}

// TestBlockedRuntimeIsNotRewrittenEveryPass: the controller reports a
// blocked runtime as pending, so a blocked runtime (a deleted account without
// a purge request) was blocked again by every node at every pass. It is now
// blocked once, and again after a change (Kick).
func TestBlockedRuntimeIsNotRewrittenEveryPass(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	cipher, _ := secret.New(make([]byte, 32))
	s := New(db, cipher)
	var id int64
	if e := db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,deleted_at) VALUES('off','ccgateway','managed',''::bytea,now()) RETURNING id`).Scan(&id); e != nil {
		t.Fatal(e)
	}
	var mu sync.Mutex
	puts := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
			return
		}
		if strings.HasSuffix(r.URL.Path, "/config") {
			mu.Lock()
			puts++
			mu.Unlock()
			_, _ = w.Write([]byte(`{"status":"blocked","revision":""}`))
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "pending", "revision": ""})
	}))
	defer server.Close()
	t.Setenv("CCGATEWAY_URL", server.URL)
	cfg, _ := json.Marshal(Config{Mode: "local", AccountRuntimes: true, AdminKey: "controller-secret", RequestPolicy: &RequestPolicy{SchemaVersion: 1, UnknownField: "reject", CLIVersion: "2.1.302"}})
	encrypted, _ := cipher.Encrypt(cfg, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := db.Pool.Exec(ctx, `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		t.Fatal(e)
	}
	key := strconv.FormatInt(id, 10)
	for range 3 {
		if e := s.Reconcile(ctx, key); e != nil {
			t.Fatal(e)
		}
	}
	count := func() int { mu.Lock(); defer mu.Unlock(); return puts }
	if count() != 1 {
		t.Fatalf("deleted runtime blocked %d times in three passes", count())
	}
	s.Kick(key)
	if e := s.Reconcile(ctx, key); e != nil || count() != 2 {
		t.Fatalf("not blocked again after a change: %v %d", e, count())
	}
}
