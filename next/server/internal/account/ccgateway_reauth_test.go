package account

import (
	"context"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// reauthController is a minimal per-account runtime controller: it applies
// configurations, reports status and the Claude login per runtime key, and
// deletes an account-id runtime only with X-CCG-Delete-Account naming it.
type reauthController struct {
	mu       sync.Mutex
	revision map[string]string
	loggedIn map[string]bool
	calls    []string
}

var reauthPath = regexp.MustCompile(`^/accounts/([0-9a-f]+)(?:/(.*))?$`)

func (c *reauthController) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/health" {
		_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
		return
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	call := r.Method + " " + r.URL.Path
	if h := r.Header.Get("X-CCG-Delete-Account"); h != "" {
		call += " delete-account=" + h
	}
	c.calls = append(c.calls, call)
	m := reauthPath.FindStringSubmatch(r.URL.Path)
	if m == nil {
		w.WriteHeader(404)
		return
	}
	key, path := m[1], m[2]
	switch {
	case path == "migrate-auth" && r.Method == "POST":
		var body struct {
			Source string `json:"source"`
		}
		if json.NewDecoder(r.Body).Decode(&body) != nil || !c.loggedIn[body.Source] || body.Source == key {
			w.WriteHeader(400)
			return
		}
		c.calls = append(c.calls, "MIGRATE "+body.Source+" "+key)
		c.loggedIn[key] = true
		_, _ = w.Write([]byte(`{"migrated":true}`))
	case path == "" && r.Method == "DELETE":
		if !strings.HasPrefix(key, "d") && r.Header.Get("X-CCG-Delete-Account") != key {
			w.WriteHeader(405)
			_, _ = w.Write([]byte(`{"error":"method_not_allowed"}`))
			return
		}
		delete(c.revision, key)
		_, _ = w.Write([]byte(`{"deleted":true}`))
	case path == "config":
		var body struct {
			Enabled  bool   `json:"enabled"`
			Revision string `json:"revision"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		c.revision[key] = ""
		if body.Enabled {
			c.revision[key] = body.Revision
		}
		_, _ = w.Write([]byte(`{}`))
	case path == "status":
		status := "pending"
		if c.revision[key] != "" {
			status = "ready"
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"status": status, "revision": c.revision[key], "container": "ccg-" + key})
	case path == "admin/status":
		_ = json.NewEncoder(w).Encode(map[string]any{"healthy": true, "logged_in": c.loggedIn[key]})
	case path == "connection":
		// This account lifecycle fixture has no private business endpoint.
		// Check the requested revision, then explicitly report it unavailable.
		if r.Header.Get("X-CCG-Revision") == "" || r.Header.Get("X-CCG-Revision") != c.revision[key] {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.WriteHeader(http.StatusConflict)
	default:
		_, _ = w.Write([]byte(`{}`))
	}
}

func (c *reauthController) seen(prefix string) []string {
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

func (c *reauthController) login(key string) {
	c.mu.Lock()
	c.loggedIn[key] = true
	c.mu.Unlock()
}

func ccgReason(out map[string]any) any {
	errObj, _ := out["error"].(map[string]any)
	d, _ := errObj["details"].(map[string]any)
	return d["reason"]
}

// Existing numeric and adopted-draft runtimes must remain unchanged by reauthorization.
func TestCCGatewayReauthorize(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	ctl := &reauthController{revision: map[string]string{}, loggedIn: map[string]bool{}}
	ccg := e.withCCGateway(true, ctl.ServeHTTP)
	ccg.Authorizer = authz
	engine := gin.New()
	r := httpapi.NewRouter(engine, fakeTokens{}, authz)
	ccg.RegisterRoutes(r)
	e.svc.RegisterRoutes(r)
	e.h = engine
	ctx := context.Background()
	authz.keys[e.uid] = []string{"account:create", "account:update", "account:read"}
	owner, stranger, reader := e.addUser("owner@x"), e.addUser("stranger@x"), e.addUser("reader@x")
	authz.keys[owner] = []string{"account:own:update", "account:own:read", "account:own:delete"}
	authz.keys[stranger] = []string{"account:own:update"}
	authz.keys[reader] = []string{"account:read"}
	create := func(name string) int64 {
		code, out := e.do("POST", "/accounts", map[string]any{"name": name, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}})
		if code != 201 {
			t.Fatalf("create: %d %v", code, out)
		}
		id := int64(out["data"].(map[string]any)["id"].(float64))
		if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET created_by=$2,status='error',status_reason='expired',last_test_at=now(),last_test_ok=false WHERE id=$1`, id, owner); err != nil {
			t.Fatal(err)
		}
		return id
	}
	for _, adopted := range []bool{false, true} {
		id := create("in-place")
		key := itoa(id)
		if adopted {
			key = "d00000000000000ab"
			if _, err := e.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at,created_by) VALUES($1,$2,now(),$3)`, key, id, owner); err != nil {
				t.Fatal(err)
			}
		}
		if err := ccg.Reconcile(ctx, itoa(id)); err != nil {
			t.Fatal(err)
		}
		beforeWrites := len(ctl.seen("PUT"))
		path := "/system/ccgateway/accounts/" + itoa(id) + "/reauthorize"
		if code, _ := e.doAs(stranger, "POST", path, nil); code != 404 {
			t.Fatalf("stranger: %d", code)
		}
		if code, _ := e.doAs(reader, "POST", path, nil); code != 403 {
			t.Fatalf("reader: %d", code)
		}
		for i := 0; i < 2; i++ {
			code, out := e.doAs(owner, "POST", path, map[string]any{"authorization_mode": "fresh"})
			if code != 200 || out["data"].(map[string]any)["key"] != key || out["data"].(map[string]any)["in_place"] != true {
				t.Fatalf("begin: %d %v", code, out)
			}
		}
		commit := path + "/" + key + "/commit"
		if code, out := e.doAs(owner, "POST", commit, nil); code != 400 || ccgReason(out) != "draft_not_authorized" {
			t.Fatalf("before login: %d %v", code, out)
		}
		ctl.login(key)
		if code, _ := e.doAs(owner, "POST", path+"/d00000000000000ff/commit", nil); code != 400 {
			t.Fatalf("wrong runtime: %d", code)
		}
		if err := e.mr.Set(cooldownKey(id), "expired"); err != nil {
			t.Fatal(err)
		}
		code, out := e.doAs(owner, "POST", commit, nil)
		if code != 200 {
			t.Fatalf("commit: %d %v", code, out)
		}
		v := out["data"].(map[string]any)
		if v["status"] != "active" || v["last_test"] != nil || e.mr.Exists(cooldownKey(id)) {
			t.Fatalf("state not reset: %v", v)
		}
		var current string
		if err := e.db.Pool.QueryRow(ctx, `SELECT COALESCE(r.key,a.id::text) FROM accounts a LEFT JOIN ccgateway_runtimes r ON r.account_id=a.id WHERE a.id=$1`, id).Scan(&current); err != nil || current != key {
			t.Fatalf("mapping changed: %s %v", current, err)
		}
		var n int
		if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_runtimes WHERE for_account=$1 OR (account_id=$1 AND retired_at IS NOT NULL)`, id).Scan(&n); err != nil || n != 0 {
			t.Fatalf("replacement records created: %d %v", n, err)
		}
		if len(ctl.seen("PUT")) != beforeWrites || len(ctl.seen("DELETE")) != 0 || len(ctl.seen("MIGRATE")) != 0 {
			t.Fatalf("reauth changed runtime: %v", ctl.seen(""))
		}
		if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled' WHERE id=$1`, id); err != nil {
			t.Fatal(err)
		}
		if code, out := e.doAs(owner, "POST", path, nil); code != 400 || ccgReason(out) != "account_disabled" {
			t.Fatalf("disabled runtime silently started: %d %v", code, out)
		}
		if code, out := e.doAs(owner, "DELETE", "/accounts/"+itoa(id), nil); code != 204 {
			t.Fatalf("delete: %d %v", code, out)
		}
		var cleanupPending bool
		if err := e.db.Pool.QueryRow(ctx, `SELECT retired_at IS NOT NULL FROM ccgateway_runtimes WHERE account_id=$1 AND key=$2`, id, key).Scan(&cleanupPending); err != nil || !cleanupPending {
			t.Fatalf("delete did not persist cleanup intent: %v %v", cleanupPending, err)
		}
	}
}
