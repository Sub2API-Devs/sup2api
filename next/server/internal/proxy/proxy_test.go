package proxy

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
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
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

type fakeAuthz struct{}

func (fakeAuthz) Can(context.Context, int64, string) (bool, error) { return true, nil }
func (fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) IsSensitive(string) bool { return false }

type fakeStepUp struct{}

func (fakeStepUp) VerifyStepUp(context.Context, int64, string) error { return nil }

type fakeBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
}

func (b *fakeBus) Publish(_ context.Context, ch string, p []byte) error {
	b.mu.Lock()
	hs := append([]func([]byte){}, b.subs[ch]...)
	b.mu.Unlock()
	for _, h := range hs {
		h(p)
	}
	return nil
}

func (b *fakeBus) Subscribe(ch string, h func([]byte)) func() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.subs == nil {
		b.subs = map[string][]func([]byte){}
	}
	b.subs[ch] = append(b.subs[ch], h)
	return func() {}
}

func testCipher(t *testing.T) *secret.Cipher {
	k := make([]byte, 32)
	_, _ = rand.Read(k)
	c, err := secret.New(k)
	if err != nil {
		t.Fatal(err)
	}
	return c
}

// forwardProxy is a minimal HTTP forward proxy that answers every request
// itself with 204 and records the Proxy-Authorization header.
func forwardProxy(t *testing.T) (*httptest.Server, *atomic.Value, *atomic.Int64) {
	var auth atomic.Value
	var hits atomic.Int64
	auth.Store("")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		auth.Store(r.Header.Get("Proxy-Authorization"))
		if !r.URL.IsAbs() {
			http.Error(w, "not a proxy request", 400)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	t.Cleanup(srv.Close)
	return srv, &auth, &hits
}

func do(t *testing.T, h http.Handler, method, path string, body any) (int, map[string]any) {
	t.Helper()
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer u1")
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestProxyCRUDTestAndDirectory(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	ctx := context.Background()
	bus := &fakeBus{}
	svc := New(db, testCipher(t), bus, Options{ProbeURL: "http://probe.example.invalid/generate_204"})
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go svc.Run(runCtx)
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{}, fakeStepUp{}))

	fp, auth, hits := forwardProxy(t)
	host, portStr, _ := strings.Cut(strings.TrimPrefix(fp.URL, "http://"), ":")
	port, _ := strconv.Atoi(portStr)

	if code, _ := do(t, engine, "POST", "/proxies", map[string]any{"name": "x", "protocol": "ftp", "host": host, "port": port}); code != 400 {
		t.Fatalf("bad protocol accepted: %d", code)
	}
	code, out := do(t, engine, "POST", "/proxies", map[string]any{
		"name": "p1", "protocol": "http", "host": host, "port": port, "username": "bob", "password": "s3cret"})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	p := out["data"].(map[string]any)
	id := int64(p["id"].(float64))
	if p["has_password"] != true || p["password"] != nil {
		t.Fatalf("password exposure: %v", p)
	}
	var enc []byte
	_ = db.Pool.QueryRow(ctx, `SELECT password_enc FROM proxies WHERE id = $1`, id).Scan(&enc)
	if bytes.Contains(enc, []byte("s3cret")) {
		t.Fatal("password stored in plaintext")
	}

	// Test endpoint goes through the proxy with credentials.
	code, out = do(t, engine, "POST", fmt.Sprintf("/proxies/%d/test", id), nil)
	res := out["data"].(map[string]any)
	if code != 200 || res["ok"] != true || res["status"].(float64) != 204 {
		t.Fatalf("test: %d %v", code, out)
	}
	wantAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte("bob:s3cret"))
	if auth.Load() != wantAuth {
		t.Fatalf("proxy auth %q", auth.Load())
	}

	// Directory: cached client per proxy.
	c1, err := svc.HTTPClient(ctx, &id)
	if err != nil {
		t.Fatal(err)
	}
	c2, _ := svc.HTTPClient(ctx, &id)
	if c1 != c2 {
		t.Fatal("client not cached")
	}
	before := hits.Load()
	resp, err := c1.Get("http://upstream.example.invalid/x")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if hits.Load() != before+1 {
		t.Fatal("request did not go through proxy")
	}
	direct, _ := svc.HTTPClient(ctx, nil)
	if direct == nil || direct == c1 {
		t.Fatal("direct client")
	}

	// Update rebuilds the client (local invalidation + bus).
	code, out = do(t, engine, "PATCH", fmt.Sprintf("/proxies/%d", id), map[string]any{"password": ""})
	if code != 200 || out["data"].(map[string]any)["has_password"] != false {
		t.Fatalf("clear password: %d %v", code, out)
	}
	c3, _ := svc.HTTPClient(ctx, &id)
	if c3 == c1 {
		t.Fatal("client not rebuilt after update")
	}

	// A change made elsewhere (direct DB write) is picked up after recheck.
	svc.opts.RecheckInterval = time.Millisecond
	if _, err := db.Pool.Exec(ctx, `UPDATE proxies SET status = 'disabled', updated_at = clock_timestamp() WHERE id = $1`, id); err != nil {
		t.Fatal(err)
	}
	time.Sleep(5 * time.Millisecond)
	if _, err := svc.HTTPClient(ctx, &id); core.AsError(err).Code != "unavailable" {
		t.Fatalf("disabled proxy: %v", err)
	}

	// socks5 transport uses the proxy URL scheme.
	sc, err := svc.buildClient(&row{Protocol: "socks5", Host: "127.0.0.1", Port: 1080, Username: "u"})
	if err != nil {
		t.Fatal(err)
	}
	pu, _ := sc.Transport.(*http.Transport).Proxy(httptest.NewRequest("GET", "https://example.com", nil))
	if pu.Scheme != "socks5" || pu.User.Username() != "u" {
		t.Fatalf("socks5 url: %v", pu)
	}

	// Delete is refused while an account uses the proxy.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts (name, plugin_key, platform, type, credentials_enc, proxy_id)
		VALUES ('a', 'p', 'p', 't', '\x00', $1)`, id); err != nil {
		t.Fatal(err)
	}
	if code, _ = do(t, engine, "DELETE", fmt.Sprintf("/proxies/%d", id), nil); code != 409 {
		t.Fatalf("delete in use: %d", code)
	}
	_, _ = db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at = now()`)
	if code, _ = do(t, engine, "DELETE", fmt.Sprintf("/proxies/%d", id), nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if _, err := svc.HTTPClient(ctx, &id); core.AsError(err).Code != "not_found" {
		t.Fatalf("deleted proxy: %v", err)
	}
	_, out = do(t, engine, "GET", "/proxies", nil)
	if out["page"].(map[string]any)["total"].(float64) != 0 {
		t.Fatalf("list: %v", out)
	}
}
