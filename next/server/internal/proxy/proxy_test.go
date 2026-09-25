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
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeTokens struct{}

func (fakeTokens) VerifyAccessToken(_ context.Context, tok string) (int64, error) {
	return strconv.ParseInt(strings.TrimPrefix(tok, "u"), 10, 64)
}

// fakeAuthz grants each user a fixed key set; a nil map allows everything.
type fakeAuthz struct{ keys map[int64][]string }

func (a fakeAuthz) Can(_ context.Context, uid int64, key string) (bool, error) {
	if a.keys == nil {
		return true, nil
	}
	for _, k := range a.keys[uid] {
		if k == key {
			return true, nil
		}
	}
	return false, nil
}

func (fakeAuthz) PermissionSet(context.Context, int64) (core.PermissionSet, error) {
	return core.PermissionSet{}, nil
}
func (fakeAuthz) IsSensitive(string) bool { return false }

type fakeStepUp struct{}

func (fakeStepUp) VerifyStepUp(context.Context, int64, string) error { return nil }

type fakeBus struct {
	mu   sync.Mutex
	subs map[string][]func([]byte)
	sent [][]byte
}

func (b *fakeBus) Publish(_ context.Context, ch string, p []byte) error {
	b.mu.Lock()
	hs := append([]func([]byte){}, b.subs[ch]...)
	b.sent = append(b.sent, p)
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

func (b *fakeBus) published() []string {
	b.mu.Lock()
	defer b.mu.Unlock()
	out := make([]string, len(b.sent))
	for i, p := range b.sent {
		out[i] = string(p)
	}
	return out
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

func addUser(t *testing.T, db *store.DB, email string) int64 {
	t.Helper()
	var id int64
	if err := db.Pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
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

func do(t *testing.T, h http.Handler, uid int64, method, path string, body any) (int, map[string]any) {
	t.Helper()
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
	w := httptest.NewRecorder()
	h.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func data(out map[string]any) map[string]any {
	d, _ := out["data"].(map[string]any)
	return d
}

func total(out map[string]any) float64 {
	p, _ := out["page"].(map[string]any)
	n, _ := p["total"].(float64)
	return n
}

// fakeRegistry / fakeGen give the service the set of enabled plugins
// (account_count only counts accounts of enabled plugins).
type fakeRegistry struct{ gen core.Generation }

func (r *fakeRegistry) Current() core.Generation                     { return r.gen }
func (*fakeRegistry) OnChange(func(core.Generation)) (cancel func()) { return func() {} }

type fakeGen struct {
	core.Generation
	keys []string
}

func (g *fakeGen) Plugins() []core.PluginInfo {
	out := make([]core.PluginInfo, 0, len(g.keys))
	for _, k := range g.keys {
		out = append(out, core.PluginInfo{Key: k})
	}
	return out
}

func TestProxyCRUDTestAndDirectory(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	ctx := context.Background()
	bus := &fakeBus{}
	reg := &fakeRegistry{gen: &fakeGen{keys: []string{"p"}}}
	svc := New(db, testCipher(t), bus, Options{ProbeURL: "http://probe.example.invalid/generate_204", Registry: reg})
	runCtx, cancel := context.WithCancel(ctx)
	defer cancel()
	go svc.Run(runCtx)
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{}, fakeStepUp{}))
	admin := addUser(t, db, "admin@x.com")

	fp, auth, hits := forwardProxy(t)
	host, portStr, _ := strings.Cut(strings.TrimPrefix(fp.URL, "http://"), ":")
	port, _ := strconv.Atoi(portStr)

	if code, _ := do(t, engine, admin, "POST", "/proxies", map[string]any{"name": "x", "protocol": "ftp", "host": host, "port": port}); code != 400 {
		t.Fatalf("bad protocol accepted: %d", code)
	}
	code, out := do(t, engine, admin, "POST", "/proxies", map[string]any{
		"name": "p1", "protocol": "http", "host": host, "port": port, "username": "bob", "password": "s3cret"})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	p := data(out)
	id := int64(p["id"].(float64))
	if p["has_password"] != true || p["password"] != nil {
		t.Fatalf("password exposure: %v", p)
	}
	if p["created_by"].(float64) != float64(admin) || p["created_by_email"] != "admin@x.com" {
		t.Fatalf("created_by: %v", p)
	}
	var enc []byte
	_ = db.Pool.QueryRow(ctx, `SELECT password_enc FROM proxies WHERE id = $1`, id).Scan(&enc)
	if bytes.Contains(enc, []byte("s3cret")) {
		t.Fatal("password stored in plaintext")
	}

	// Test endpoint goes through the proxy with credentials.
	code, out = do(t, engine, admin, "POST", fmt.Sprintf("/proxies/%d/test", id), nil)
	res := data(out)
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

	// A transient client for a spec also goes through the proxy.
	tc, err := svc.HTTPClientFor(ctx, Spec{Protocol: "http", Host: host, Port: port, Username: "bob", Password: "s3cret"})
	if err != nil {
		t.Fatal(err)
	}
	before = hits.Load()
	if resp, err = tc.Get("http://upstream.example.invalid/y"); err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	tc.CloseIdleConnections()
	if hits.Load() != before+1 || auth.Load() != wantAuth {
		t.Fatal("HTTPClientFor did not go through proxy")
	}

	// Update rebuilds the client (local invalidation + bus).
	code, out = do(t, engine, admin, "PATCH", fmt.Sprintf("/proxies/%d", id), map[string]any{"password": ""})
	if code != 200 || data(out)["has_password"] != false {
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
	if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, proxy_id)
		VALUES ('a', 'p', 't', '\x00', $1)`, id); err != nil {
		t.Fatal(err)
	}
	if code, _ = do(t, engine, admin, "DELETE", fmt.Sprintf("/proxies/%d", id), nil); code != 409 {
		t.Fatalf("delete in use: %d", code)
	}
	// account_count only counts accounts of enabled plugins; the delete
	// conflict still considers every referencing account.
	if _, out = do(t, engine, admin, "GET", fmt.Sprintf("/proxies/%d", id), nil); out["data"].(map[string]any)["account_count"] != float64(1) {
		t.Fatalf("account_count: %v", out["data"])
	}
	reg.gen = &fakeGen{keys: []string{"other"}}
	if _, out = do(t, engine, admin, "GET", fmt.Sprintf("/proxies/%d", id), nil); out["data"].(map[string]any)["account_count"] != float64(0) {
		t.Fatalf("account_count with plugin p disabled: %v", out["data"])
	}
	if code, _ = do(t, engine, admin, "DELETE", fmt.Sprintf("/proxies/%d", id), nil); code != 409 {
		t.Fatalf("delete in use by an orphaned account: %d", code)
	}
	reg.gen = &fakeGen{keys: []string{"p"}}
	_, _ = db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at = now()`)
	if code, _ = do(t, engine, admin, "DELETE", fmt.Sprintf("/proxies/%d", id), nil); code != 204 {
		t.Fatalf("delete: %d", code)
	}
	if _, err := svc.HTTPClient(ctx, &id); core.AsError(err).Code != "not_found" {
		t.Fatalf("deleted proxy: %v", err)
	}
	_, out = do(t, engine, admin, "GET", "/proxies", nil)
	if total(out) != 0 {
		t.Fatalf("list: %v", out)
	}

	// Audit trail of the three writes.
	rows, err := db.Pool.Query(ctx, `SELECT action, user_id, target_type, target_id, detail FROM audit_logs ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var actions []string
	for rows.Next() {
		var action, ttype, tid string
		var uid *int64
		var detail map[string]any
		if err := rows.Scan(&action, &uid, &ttype, &tid, &detail); err != nil {
			t.Fatal(err)
		}
		if uid == nil || *uid != admin || ttype != "proxy" || tid != strconv.FormatInt(id, 10) {
			t.Fatalf("audit row %s: user %v target %s/%s", action, uid, ttype, tid)
		}
		switch action {
		case "proxy.create":
			if detail["auto"] != false || detail["name"] != "p1" || detail["password"] != nil {
				t.Fatalf("create detail %v", detail)
			}
		case "proxy.update":
			if f, _ := detail["fields"].([]any); len(f) != 1 || f[0] != "password" {
				t.Fatalf("update detail %v", detail)
			}
		}
		actions = append(actions, action)
	}
	if strings.Join(actions, ",") != "proxy.create,proxy.update,proxy.delete" {
		t.Fatalf("audit actions %v", actions)
	}
}

func TestOwnership(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	ctx := context.Background()
	svc := New(db, testCipher(t), nil, Options{ProbeURL: "http://probe.example.invalid/generate_204"})
	admin := addUser(t, db, "admin@x.com")
	alice := addUser(t, db, "alice@x.com")
	bob := addUser(t, db, "bob@x.com")
	reader := addUser(t, db, "ro@x.com")
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{
		admin:  {"proxy:read", "proxy:manage"},
		alice:  {"proxy:own:read", "proxy:own:manage"},
		bob:    {"proxy:own:read", "proxy:own:manage"},
		reader: {"proxy:read"},
	}}, fakeStepUp{}))

	create := func(uid int64, name string) int64 {
		t.Helper()
		code, out := do(t, engine, uid, "POST", "/proxies", map[string]any{"name": name, "protocol": "http", "host": "h.example", "port": 8080})
		if code != 201 {
			t.Fatalf("create %s: %d %v", name, code, out)
		}
		p := data(out)
		if p["created_by"].(float64) != float64(uid) {
			t.Fatalf("created_by of %s: %v", name, p)
		}
		return int64(p["id"].(float64))
	}
	pAdmin := create(admin, "admin's")
	pAlice := create(alice, "alice's")
	pBob := create(bob, "bob's")
	var pLegacy int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port) VALUES ('legacy', 'http', 'h', 1) RETURNING id`).Scan(&pLegacy); err != nil {
		t.Fatal(err)
	}

	// Readers without a manage key cannot create.
	if code, out := do(t, engine, reader, "POST", "/proxies", map[string]any{"name": "x", "protocol": "http", "host": "h", "port": 1}); code != 403 ||
		out["error"].(map[string]any)["details"].(map[string]any)["permission"] != "proxy:manage" {
		t.Fatalf("reader create: %d %v", code, out)
	}

	// Lists: own range sees own rows only; all range sees everything and can
	// filter by created_by or mine.
	ids := func(out map[string]any) string {
		var s []string
		for _, it := range out["data"].([]any) {
			s = append(s, strconv.Itoa(int(it.(map[string]any)["id"].(float64))))
		}
		return strings.Join(s, ",")
	}
	_, out := do(t, engine, alice, "GET", "/proxies", nil)
	if total(out) != 1 || ids(out) != strconv.FormatInt(pAlice, 10) {
		t.Fatalf("alice list: %v", out)
	}
	_, out = do(t, engine, reader, "GET", "/proxies", nil)
	if total(out) != 4 {
		t.Fatalf("reader list: %v", out)
	}
	_, out = do(t, engine, admin, "GET", "/proxies?mine=true", nil)
	if total(out) != 1 || ids(out) != strconv.FormatInt(pAdmin, 10) {
		t.Fatalf("admin mine: %v", out)
	}
	_, out = do(t, engine, admin, "GET", fmt.Sprintf("/proxies?created_by=%d", bob), nil)
	if total(out) != 1 || ids(out) != strconv.FormatInt(pBob, 10) {
		t.Fatalf("admin created_by: %v", out)
	}
	if code, _ := do(t, engine, admin, "GET", "/proxies?created_by=abc", nil); code != 400 {
		t.Fatalf("bad created_by: %d", code)
	}
	// created_by is ignored under the own range.
	_, out = do(t, engine, alice, "GET", fmt.Sprintf("/proxies?created_by=%d", bob), nil)
	if total(out) != 1 || ids(out) != strconv.FormatInt(pAlice, 10) {
		t.Fatalf("alice created_by ignored: %v", out)
	}

	// Detail, update, delete and test of somebody else's proxy (or a legacy
	// row without creator) are 404 under the own range.
	for _, other := range []int64{pBob, pLegacy, pAdmin} {
		if code, _ := do(t, engine, alice, "GET", fmt.Sprintf("/proxies/%d", other), nil); code != 404 {
			t.Fatalf("alice get %d: %d", other, code)
		}
		if code, _ := do(t, engine, alice, "PATCH", fmt.Sprintf("/proxies/%d", other), map[string]any{"name": "hijack"}); code != 404 {
			t.Fatalf("alice patch %d: %d", other, code)
		}
		if code, _ := do(t, engine, alice, "DELETE", fmt.Sprintf("/proxies/%d", other), nil); code != 404 {
			t.Fatalf("alice delete %d: %d", other, code)
		}
		if code, _ := do(t, engine, alice, "POST", fmt.Sprintf("/proxies/%d/test", other), nil); code != 404 {
			t.Fatalf("alice test %d: %d", other, code)
		}
	}
	var name string
	_ = db.Pool.QueryRow(ctx, `SELECT name FROM proxies WHERE id = $1`, pBob).Scan(&name)
	if name != "bob's" {
		t.Fatalf("bob's proxy renamed: %s", name)
	}
	code, out := do(t, engine, alice, "GET", fmt.Sprintf("/proxies/%d", pAlice), nil)
	if code != 200 || data(out)["created_by_email"] != "alice@x.com" {
		t.Fatalf("alice get own: %d %v", code, out)
	}
	if code, out = do(t, engine, alice, "PATCH", fmt.Sprintf("/proxies/%d", pAlice), map[string]any{"name": "mine"}); code != 200 || data(out)["name"] != "mine" {
		t.Fatalf("alice patch own: %d %v", code, out)
	}
	// The own test action is scoped too (it reaches the probe through the
	// stored proxy, so only the status matters here).
	if code, _ = do(t, engine, alice, "POST", fmt.Sprintf("/proxies/%d/test", pAlice), nil); code != 200 {
		t.Fatalf("alice test own: %d", code)
	}

	// The all range reaches every row, including legacy ones, and shows the
	// creator email even after the user is soft-deleted.
	code, out = do(t, engine, admin, "GET", fmt.Sprintf("/proxies/%d", pLegacy), nil)
	if code != 200 || data(out)["created_by"] != nil || data(out)["created_by_email"] != nil {
		t.Fatalf("admin get legacy: %d %v", code, out)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE users SET deleted_at = now() WHERE id = $1`, bob); err != nil {
		t.Fatal(err)
	}
	code, out = do(t, engine, admin, "GET", fmt.Sprintf("/proxies/%d", pBob), nil)
	if code != 200 || data(out)["created_by_email"] != "bob@x.com" {
		t.Fatalf("deleted creator email: %d %v", code, out)
	}
	if code, _ = do(t, engine, admin, "PATCH", fmt.Sprintf("/proxies/%d", pBob), map[string]any{"status": "disabled"}); code != 200 {
		t.Fatalf("admin patch bob's: %d", code)
	}

	// Under the own range a proxy in use still reports the full account
	// count, but only for the caller's own proxy.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO accounts (name, plugin_key, type, credentials_enc, proxy_id, created_by)
		VALUES ('a1', 'p', 't', '\x00', $1, $2), ('a2', 'p', 't', '\x00', $1, $3)`, pAlice, admin, bob); err != nil {
		t.Fatal(err)
	}
	code, out = do(t, engine, alice, "DELETE", fmt.Sprintf("/proxies/%d", pAlice), nil)
	if code != 409 || out["error"].(map[string]any)["details"].(map[string]any)["account_count"].(float64) != 2 {
		t.Fatalf("alice delete in use: %d %v", code, out)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at = now()`); err != nil {
		t.Fatal(err)
	}
	if code, _ = do(t, engine, alice, "DELETE", fmt.Sprintf("/proxies/%d", pAlice), nil); code != 204 {
		t.Fatalf("alice delete own: %d", code)
	}
}

func TestFindOrCreate(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	bus := &fakeBus{}
	svc := New(db, testCipher(t), bus, Options{})
	alice := addUser(t, db, "alice@x.com")
	bob := addUser(t, db, "bob@x.com")

	resolve := func(spec Spec, owner int64, scope *int64) (int64, bool) {
		t.Helper()
		var id int64
		var created bool
		err := db.Tx(ctx, func(tx pgx.Tx) error {
			var err error
			id, created, err = svc.FindOrCreate(ctx, tx, spec, owner, scope)
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
		return id, created
	}
	load := func(id int64) (name, status string, createdBy *int64, hasPassword bool) {
		t.Helper()
		if err := db.Pool.QueryRow(ctx, `SELECT name, status, created_by, password_enc IS NOT NULL FROM proxies WHERE id = $1`, id).
			Scan(&name, &status, &createdBy, &hasPassword); err != nil {
			t.Fatal(err)
		}
		return
	}

	spec, err := ParseURL("socks5h://u:pw@Proxy.Example.com:1080")
	if err != nil {
		t.Fatal(err)
	}
	p1, created := resolve(spec, alice, &alice)
	if !created {
		t.Fatal("first resolve did not create")
	}
	if name, status, by, hasPw := load(p1); name != "socks5://proxy.example.com:1080" || status != "active" || by == nil || *by != alice || !hasPw {
		t.Fatalf("created row: %s %s %v %v", name, status, by, hasPw)
	}
	if id, created := resolve(spec, alice, &alice); id != p1 || created {
		t.Fatalf("same url resolved to %d created=%v", id, created)
	}
	// A different password is a different proxy; the same for no password.
	other := spec
	other.Password = "pw2"
	p2, created := resolve(other, alice, &alice)
	if !created || p2 == p1 {
		t.Fatalf("password mismatch reused %d", p2)
	}
	noPw := spec
	noPw.Password = ""
	p3, created := resolve(noPw, alice, &alice)
	if !created || p3 == p1 || p3 == p2 {
		t.Fatalf("no-password resolve %d created=%v", p3, created)
	}
	if id, created := resolve(noPw, alice, &alice); id != p3 || created {
		t.Fatalf("no-password reuse %d created=%v", id, created)
	}
	if _, _, _, hasPw := load(p3); hasPw {
		t.Fatal("no-password row has a password")
	}
	// Own scope: bob cannot reuse alice's row and gets his own.
	p4, created := resolve(spec, bob, &bob)
	if !created || p4 == p1 {
		t.Fatalf("bob saw alice's proxy: %d created=%v", p4, created)
	}
	// All scope: several matches resolve to the smallest id.
	if id, created := resolve(spec, bob, nil); id != p1 || created {
		t.Fatalf("all scope resolved %d created=%v", id, created)
	}
	// Disabled proxies are skipped.
	if _, err := db.Pool.Exec(ctx, `UPDATE proxies SET status = 'disabled' WHERE id = $1`, p1); err != nil {
		t.Fatal(err)
	}
	if id, created := resolve(spec, bob, nil); id != p4 || created {
		t.Fatalf("disabled skipped: %d created=%v", id, created)
	}
	if id, created := resolve(spec, alice, &alice); id == p1 || !created {
		t.Fatalf("alice with p1 disabled: %d created=%v", id, created)
	}
	// Host matching is case-insensitive against rows created by hand.
	var mixed int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port, created_by) VALUES ('m', 'http', 'MiXed.Example', 3128, $1) RETURNING id`, alice).Scan(&mixed); err != nil {
		t.Fatal(err)
	}
	if id, created := resolve(Spec{Protocol: "http", Host: "mixed.example", Port: 3128}, alice, &alice); id != mixed || created {
		t.Fatalf("case-insensitive host: %d created=%v", id, created)
	}
	// Invalid specs are refused before touching the database.
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		_, _, err := svc.FindOrCreate(ctx, tx, Spec{Protocol: "ftp", Host: "h", Port: 1}, alice, nil)
		return err
	}); core.AsError(err).Code != "invalid_argument" {
		t.Fatalf("bad spec: %v", err)
	}

	// Audit for an automatic creation, in the caller's transaction.
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		return svc.AuditAutoCreate(ctx, tx, p1, alice, 42)
	}); err != nil {
		t.Fatal(err)
	}
	var detail map[string]any
	var uid int64
	if err := db.Pool.QueryRow(ctx, `SELECT user_id, detail FROM audit_logs WHERE action = 'proxy.create' AND target_type = 'proxy' AND target_id = $1`,
		strconv.FormatInt(p1, 10)).Scan(&uid, &detail); err != nil {
		t.Fatal(err)
	}
	if uid != alice || detail["auto"] != true || detail["account_id"].(float64) != 42 {
		t.Fatalf("auto audit: %d %v", uid, detail)
	}
	if got := bus.published(); len(got) != 1 || got[0] != fmt.Sprintf(`{"type":"proxy","id":%d}`, p1) {
		t.Fatalf("broadcast %v", got)
	}

	// Concurrent saves of a new url create exactly one row: the advisory
	// lock makes the second transaction wait for the first to commit.
	fresh := Spec{Protocol: "https", Host: "race.example", Port: 443, Username: "r", Password: "s"}
	var wg sync.WaitGroup
	results := make([]struct {
		id      int64
		created bool
	}, 2)
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = db.Tx(ctx, func(tx pgx.Tx) error {
				id, created, err := svc.FindOrCreate(ctx, tx, fresh, alice, &alice)
				if err != nil {
					return err
				}
				// Hold the lock a moment so the other goroutine really waits.
				time.Sleep(50 * time.Millisecond)
				results[i] = struct {
					id      int64
					created bool
				}{id, created}
				return nil
			})
		}()
	}
	wg.Wait()
	if results[0].id == 0 || results[0].id != results[1].id || results[0].created == results[1].created {
		t.Fatalf("race results %+v", results)
	}
	var n int
	_ = db.Pool.QueryRow(ctx, `SELECT count(*) FROM proxies WHERE host = 'race.example'`).Scan(&n)
	if n != 1 {
		t.Fatalf("race created %d rows", n)
	}
}
