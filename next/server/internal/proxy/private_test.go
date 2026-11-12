package proxy

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// The guard sits on the dial to the proxy, so it judges the resolved address
// and not the spelling of the host.
func TestTransportDialGuard(t *testing.T) {
	fp, _, _ := forwardProxy(t)
	u, _ := url.Parse(fp.URL)
	get := func(allowPrivate bool) (*http.Response, error) {
		tr := newTransport(u, allowPrivate)
		defer tr.CloseIdleConnections()
		req, _ := http.NewRequestWithContext(t.Context(), http.MethodGet, "http://probe.example.invalid/", nil)
		return (&http.Client{Transport: tr}).Do(req)
	}
	if _, err := get(false); !errors.Is(err, netguard.ErrPrivate) {
		t.Fatalf("guarded dial to a loopback proxy: %v", err)
	}
	resp, err := get(true)
	if err != nil {
		t.Fatalf("allowPrivate: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("allowPrivate status %d", resp.StatusCode)
	}
}

func allowPrivate(t *testing.T, svc *Service, id int64) (v bool) {
	t.Helper()
	if err := svc.db.Pool.QueryRow(context.Background(), `SELECT allow_private FROM proxies WHERE id = $1`, id).Scan(&v); err != nil {
		t.Fatal(err)
	}
	return v
}

// PATCH with a new host is judged like a new proxy: only proxy:manage may
// move one to a private address, and allow_private follows the last writer.
func TestUpdateHostPrivate(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	svc := New(db, testCipher(t), nil, Options{})
	admin, alice := addUser(t, db, "admin@x.com"), addUser(t, db, "alice@x.com")
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{
		admin: {"proxy:read", "proxy:manage"},
		alice: {"proxy:own:read", "proxy:own:manage"},
	}}))
	code, out := do(t, engine, alice, "POST", "/proxies", map[string]any{"name": "p", "protocol": "http", "host": "h.example", "port": 8080})
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	id := int64(data(out)["id"].(float64))
	path := fmt.Sprintf("/proxies/%d", id)
	if allowPrivate(t, svc, id) {
		t.Fatal("own-level proxy created with allow_private")
	}

	code, out = do(t, engine, alice, "PATCH", path, map[string]any{"host": "10.0.0.8"})
	if code != 403 || out["error"].(map[string]any)["details"].(map[string]any)["permission"] != "proxy:manage" {
		t.Fatalf("own patch to a private host: %d %v", code, out)
	}
	if code, out = do(t, engine, alice, "GET", path, nil); data(out)["host"] != "h.example" {
		t.Fatalf("refused patch changed the host: %d %v", code, out)
	}

	if code, out = do(t, engine, admin, "PATCH", path, map[string]any{"host": "10.0.0.8"}); code != 200 || data(out)["host"] != "10.0.0.8" {
		t.Fatalf("manage patch to a private host: %d %v", code, out)
	}
	if !allowPrivate(t, svc, id) {
		t.Fatal("manage patch did not set allow_private")
	}
	// Other fields leave the flag alone; a host the owner sets clears it.
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"name": "renamed", "port": 3128}); code != 200 || !allowPrivate(t, svc, id) {
		t.Fatalf("own patch without host: %d %v", code, out)
	}
	if code, out = do(t, engine, alice, "PATCH", path, map[string]any{"host": "other.example"}); code != 200 || allowPrivate(t, svc, id) {
		t.Fatalf("own patch to a public host: %d %v", code, out)
	}
}

// Probe saves in the caller's write range: proxy:manage reaches a private
// proxy, stores it with allow_private and reuses rows of other users.
func TestProbeSaveWriteScope(t *testing.T) {
	gin.SetMode(gin.TestMode)
	db := testutil.DB(t)
	svc := New(db, testCipher(t), nil, Options{ProbeURL: "http://probe.example.invalid/generate_204"})
	admin, bob := addUser(t, db, "admin@x.com"), addUser(t, db, "bob@x.com")
	engine := gin.New()
	svc.RegisterRoutes(httpapi.NewRouter(engine, fakeTokens{}, fakeAuthz{keys: map[int64][]string{admin: {"proxy:manage"}}}))
	fp, _, _ := forwardProxy(t)
	hostport := strings.TrimPrefix(fp.URL, "http://")

	code, out := do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": "http://" + hostport, "save": true})
	res := data(out)
	if code != 200 || res["ok"] != true || res["proxy_created"] != true {
		t.Fatalf("manage probe of a loopback proxy: %d %v", code, out)
	}
	if id := int64(res["proxy_id"].(float64)); !allowPrivate(t, svc, id) {
		t.Fatal("proxy saved by proxy:manage has no allow_private")
	}

	u, _ := url.Parse(fp.URL)
	var bobs int64
	if err := db.Pool.QueryRow(context.Background(), `INSERT INTO proxies (name, protocol, host, port, username, created_by)
		VALUES ('bob''s', 'http', $1, $2::int, 'bob', $3) RETURNING id`, u.Hostname(), u.Port(), bob).Scan(&bobs); err != nil {
		t.Fatal(err)
	}
	code, out = do(t, engine, admin, "POST", "/proxies/probe", map[string]any{"proxy_url": "http://bob@" + hostport, "save": true})
	res = data(out)
	if code != 200 || res["proxy_created"] != false || int64(res["proxy_id"].(float64)) != bobs {
		t.Fatalf("manage probe did not reuse another user's proxy: %d %v", code, out)
	}
}
