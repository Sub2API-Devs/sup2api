package account

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
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

// TestCCGatewayReauthorize: re-authorizing a saved Claude Code account
// (CONTRACTS §49.17). The draft is idempotent per account, a commit needs
// the account's own signed-in draft, swaps the runtime (the old one retired,
// later deleted with X-CCG-Delete-Account), clears the account's state and
// routes model requests to the new key; cancelling the draft changes nothing.
func TestCCGatewayReauthorize(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	ctl := &reauthController{revision: map[string]string{}, loggedIn: map[string]bool{}}
	ccg := e.withCCGateway(true, ctl.ServeHTTP)
	ccg.Authorizer = authz
	// Both modules' routes on one router, as in the application: the
	// account module's .../reauthorize next to ccgateway's .../:id/:action.
	engine := gin.New()
	r := httpapi.NewRouter(engine, fakeTokens{}, authz)
	ccg.RegisterRoutes(r)
	e.svc.RegisterRoutes(r)
	e.h = engine
	ctx := context.Background()

	authz.keys[e.uid] = []string{"account:create", "account:update", "account:read", "proxy:read"}
	owner, stranger, reader := e.addUser("owner@x"), e.addUser("stranger@x"), e.addUser("reader@x")
	authz.keys[owner] = []string{"account:own:update", "account:own:read"}
	authz.keys[stranger] = []string{"account:own:update"}
	authz.keys[reader] = []string{"account:read"}

	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('ccg','http','proxy.example',3128) RETURNING id`)
	create := func(name string, proxy bool) int64 {
		body := map[string]any{"name": name, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}}
		if proxy {
			body["proxy_id"] = pid
		}
		code, out := e.do("POST", "/accounts", body)
		if code != 201 {
			t.Fatalf("create %s: %d %v", name, code, out)
		}
		id := int64(out["data"].(map[string]any)["id"].(float64))
		if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET created_by=$2 WHERE id=$1`, id, owner); err != nil {
			t.Fatal(err)
		}
		return id
	}
	id, other, noProxy := create("cc-1", true), create("cc-2", true), create("cc-3", false)
	path := "/system/ccgateway/accounts/" + itoa(id) + "/reauthorize"

	// History the re-authorization must clear.
	if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET status='error', status_reason='login expired',
		last_test_at=now(), last_test_ok=false, last_test_latency_ms=12, last_test_model='m', last_test_message='401' WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO account_quota_snapshots(account_id, windows, source, updated_at)
		VALUES($1, '{"5h":{"utilization":99}}', 'passive', now())`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO account_credential_refresh(account_id, error_type, error) VALUES($1, 'auth_rejected', 'dead')`, id); err != nil {
		t.Fatal(err)
	}
	if err := e.mr.Set(cooldownKey(id), "rate limited"); err != nil {
		t.Fatal(err)
	}

	// Permissions: own level only for accounts the caller created.
	if code, _ := e.doAs(stranger, "POST", path, nil); code != 404 {
		t.Fatalf("stranger: %d", code)
	}
	if code, _ := e.doAs(reader, "POST", path, nil); code != 403 {
		t.Fatalf("reader: %d", code)
	}
	if code, out := e.doAs(owner, "POST", "/system/ccgateway/accounts/"+itoa(noProxy)+"/reauthorize", nil); code != 400 || ccgReason(out) != "no_proxy" {
		t.Fatalf("account without a proxy: %d %v", code, out)
	}

	// One open re-authorization draft per account.
	code, out := e.doAs(owner, "POST", path, nil)
	key, _ := out["data"].(map[string]any)["key"].(string)
	if code != 201 || !regexp.MustCompile(`^d[0-9a-f]{16}$`).MatchString(key) {
		t.Fatalf("reauthorize: %d %v", code, out)
	}
	if code, out = e.doAs(owner, "POST", path, nil); code != 200 || out["data"].(map[string]any)["key"] != key {
		t.Fatalf("second reauthorize: %d %v", code, out)
	}
	var forAccount, proxyID, createdBy *int64
	if err := e.db.Pool.QueryRow(ctx, `SELECT for_account, proxy_id, created_by FROM ccgateway_runtimes WHERE key=$1 AND account_id IS NULL`, key).
		Scan(&forAccount, &proxyID, &createdBy); err != nil || forAccount == nil || *forAccount != id || proxyID == nil || *proxyID != pid || createdBy == nil || *createdBy != owner {
		t.Fatalf("draft row: %v %v %v %v", forAccount, proxyID, createdBy, err)
	}
	// The draft is driven with the draft endpoints (own update level suffices)
	// but cannot be re-pointed to another proxy nor saved as a new account.
	if code, out = e.doAs(owner, "GET", "/system/ccgateway/drafts/"+key+"/status", nil); code != 200 {
		t.Fatalf("draft status: %d %v", code, out)
	}
	if code, _ = e.doAs(owner, "PUT", "/system/ccgateway/drafts/"+key, map[string]any{"proxy_id": pid}); code != 404 {
		t.Fatalf("PUT on a re-authorization draft: %d", code)
	}
	ctl.login(key)
	setCreator := func(uid int64) {
		if _, err := e.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET created_by=$2 WHERE key=$1`, key, uid); err != nil {
			t.Fatal(err)
		}
	}
	setCreator(e.uid)
	if code, out = e.do("POST", "/accounts", map[string]any{"name": "steal", "plugin_key": "ccgateway", "type": "managed",
		"credentials": map[string]any{}, "proxy_id": pid, "ccgateway_runtime": key}); code != 400 || ccgReason(out) != "draft_not_found" {
		t.Fatalf("POST /accounts with a re-authorization draft: %d %v", code, out)
	}
	setCreator(owner)
	ctl.mu.Lock()
	ctl.loggedIn[key] = false
	ctl.mu.Unlock()
	// Someone else allowed to update the account takes the open draft over
	// (the previous creator then no longer sees it).
	if code, out = e.doAs(e.uid, "POST", path, nil); code != 200 || out["data"].(map[string]any)["key"] != key {
		t.Fatalf("reauthorize by another updater: %d %v", code, out)
	}
	if code, _ = e.doAs(owner, "GET", "/system/ccgateway/drafts/"+key+"/status", nil); code != 404 {
		t.Fatalf("previous creator still sees the draft: %d", code)
	}
	if code, _ = e.doAs(owner, "POST", path, nil); code != 200 {
		t.Fatalf("take back: %d", code)
	}

	// Commit checks: signed in, this account's re-authorization draft, open.
	commit := func(uid int64, account int64, k string) (int, map[string]any) {
		return e.doAs(uid, "POST", "/system/ccgateway/accounts/"+itoa(account)+"/reauthorize/"+k+"/commit", nil)
	}
	if code, out = commit(owner, id, key); code != 400 || ccgReason(out) != "draft_not_authorized" {
		t.Fatalf("commit before login: %d %v", code, out)
	}
	code, out = e.doAs(owner, "POST", "/system/ccgateway/accounts/"+itoa(other)+"/reauthorize", nil)
	otherKey, _ := out["data"].(map[string]any)["key"].(string)
	if code != 201 {
		t.Fatalf("reauthorize other: %d %v", code, out)
	}
	plain := "d00000000000000aa"
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, created_by) VALUES($1,$2,$3)`, plain, pid, owner); err != nil {
		t.Fatal(err)
	}
	ctl.login(otherKey)
	ctl.login(plain)
	for _, k := range []string{otherKey, plain, "d00000000000000ff", "12"} {
		if code, out = commit(owner, id, k); code != 400 || ccgReason(out) != "draft_not_found" {
			t.Errorf("commit %s on account %d: %d %v", k, id, code, out)
		}
	}
	if code, _ = commit(stranger, id, key); code != 404 {
		t.Fatalf("stranger commit: %d", code)
	}
	var retiredRows int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_runtimes WHERE retired_at IS NOT NULL`).Scan(&retiredRows); err != nil || retiredRows != 0 {
		t.Fatalf("failed commits retired runtimes: %d %v", retiredRows, err)
	}

	// The commit.
	ctl.login(key)
	if code, out = commit(owner, id, key); code != 200 {
		t.Fatalf("commit: %d %v", code, out)
	}
	v := out["data"].(map[string]any)
	if v["status"] != "active" || v["status_reason"] != "" || v["last_test"] != nil || v["cooldown_until"] != nil {
		t.Fatalf("account after commit: %v", v)
	}
	var n int
	if err := e.db.Pool.QueryRow(ctx, `SELECT (SELECT count(*) FROM account_quota_snapshots WHERE account_id=$1)
		+ (SELECT count(*) FROM account_credential_refresh WHERE account_id=$1)`, id).Scan(&n); err != nil || n != 0 {
		t.Fatalf("quota / refresh state kept: %d %v", n, err)
	}
	if e.mr.Exists(cooldownKey(id)) {
		t.Fatal("cooldown kept")
	}
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action='account.ccgateway_reauthorize' AND target_id=$1`, itoa(id)).Scan(&n); err != nil || n != 1 {
		t.Fatalf("audit: %d %v", n, err)
	}
	var adopted *int64
	if err := e.db.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1 AND adopted_at IS NOT NULL`, key).Scan(&adopted); err != nil || adopted == nil || *adopted != id {
		t.Fatalf("draft not adopted: %v %v", adopted, err)
	}
	var retiredAccount *int64
	if err := e.db.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1 AND retired_at IS NOT NULL`, itoa(id)).Scan(&retiredAccount); err != nil || retiredAccount != nil {
		t.Fatalf("old runtime not retired: %v %v", retiredAccount, err)
	}
	// The new runtime was configured before commit returned. Model routing
	// discovers that runtime's direct endpoint, never the retired account key.
	// The ccgateway package separately tests the actual data-plane transport.
	if len(ctl.seen("PUT /accounts/"+key+"/config")) == 0 {
		t.Fatalf("new runtime not configured: %v", ctl.seen("PUT"))
	}
	req, _ := http.NewRequest("POST", ccgateway.VirtualURL, strings.NewReader(`{}`))
	res, err := ccg.ModelClient(id).Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.Copy(io.Discard, res.Body)
	res.Body.Close()
	if res.StatusCode != http.StatusConflict || len(ctl.seen("GET /accounts/"+key+"/connection")) != 1 || len(ctl.seen("POST /accounts/")) != 0 {
		t.Fatalf("model endpoint discovery: status=%d calls=%v", res.StatusCode, ctl.seen("GET /accounts/"))
	}
	if code, out = e.doAs(owner, "GET", "/system/ccgateway/accounts/"+itoa(id)+"/status", nil); code != 200 || out["data"].(map[string]any)["key"] != key {
		t.Fatalf("account status after commit: %d %v", code, out)
	}
	if code, out = commit(owner, id, key); code != 400 || ccgReason(out) != "draft_not_found" {
		t.Fatalf("second commit: %d %v", code, out)
	}

	// A new re-authorization cancelled: the account keeps its runtime.
	code, out = e.doAs(owner, "POST", path, nil)
	next, _ := out["data"].(map[string]any)["key"].(string)
	if code != 201 || next == key {
		t.Fatalf("reauthorize after commit: %d %v", code, out)
	}
	if code, _ = e.doAs(owner, "DELETE", "/system/ccgateway/drafts/"+next, nil); code != 204 {
		t.Fatalf("cancel: %d", code)
	}
	if len(ctl.seen("DELETE /accounts/"+next)) != 1 {
		t.Fatalf("cancelled draft not deleted: %v", ctl.seen("DELETE"))
	}
	if err := e.db.Pool.QueryRow(ctx, `SELECT account_id FROM ccgateway_runtimes WHERE key=$1`, key).Scan(&adopted); err != nil || adopted == nil || *adopted != id {
		t.Fatalf("account runtime after cancel: %v %v", adopted, err)
	}

	// The sweep deletes the retired runtime only after the grace period, with
	// the header the controller requires for an account-id key.
	if _, err := ccg.SweepDrafts(ctx); err != nil {
		t.Fatal(err)
	}
	if len(ctl.seen("DELETE /accounts/"+itoa(id))) != 0 {
		t.Fatalf("retired runtime deleted too early: %v", ctl.seen("DELETE"))
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET retired_at = now() - interval '71 minutes' WHERE retired_at IS NOT NULL`); err != nil {
		t.Fatal(err)
	}
	if _, err := ccg.SweepDrafts(ctx); err != nil {
		t.Fatal(err)
	}
	if got := ctl.seen("DELETE /accounts/" + itoa(id)); len(got) != 1 || got[0] != "DELETE /accounts/"+itoa(id)+" delete-account="+itoa(id) {
		t.Fatalf("retired runtime delete: %v", got)
	}
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_runtimes WHERE key=$1`, itoa(id)).Scan(&n); err != nil || n != 0 {
		t.Fatalf("retired row kept: %d %v", n, err)
	}
	if len(ctl.seen("DELETE /accounts/"+key)) != 0 {
		t.Fatal("the account's runtime was deleted")
	}

	// A second re-authorization retires the adopted draft key the same way.
	// The account is disabled (e.g. automatically after the old login
	// failed): it stays disabled until the operator enables it.
	if _, err := e.db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled', status_reason='401' WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	code, out = e.doAs(owner, "POST", path, nil)
	third, _ := out["data"].(map[string]any)["key"].(string)
	if code != 201 {
		t.Fatalf("third reauthorize: %d %v", code, out)
	}
	ctl.login(third)
	if code, out = commit(owner, id, third); code != 200 {
		t.Fatalf("second commit: %d %v", code, out)
	}
	if v := out["data"].(map[string]any); v["status"] != "disabled" || v["last_test"] != nil {
		t.Fatalf("disabled account after commit: %v", v)
	}
	var retiredAt *time.Time
	if err := e.db.Pool.QueryRow(ctx, `SELECT retired_at FROM ccgateway_runtimes WHERE key=$1 AND account_id IS NULL`, key).Scan(&retiredAt); err != nil || retiredAt == nil {
		t.Fatalf("previous draft key not retired: %v %v", retiredAt, err)
	}

	// Migration resolves the currently adopted runtime, ignores caller-supplied
	// source keys, and leaves the account binding unchanged until manual commit.
	code, out = e.doAs(owner, "POST", path, map[string]any{"authorization_mode": "migrate", "source": itoa(other)})
	if code != 201 {
		t.Fatalf("migrate: %d %v", code, out)
	}
	migrated := out["data"].(map[string]any)["key"].(string)
	if got := ctl.seen("MIGRATE "); len(got) != 1 || got[0] != "MIGRATE "+third+" "+migrated {
		t.Fatalf("migration source: %v", got)
	}
	var active string
	if err := e.db.Pool.QueryRow(ctx, `SELECT key FROM ccgateway_runtimes WHERE account_id=$1`, id).Scan(&active); err != nil || active != third {
		t.Fatalf("migration switched early: %s %v", active, err)
	}
	if err := ccg.MigrateReauth(ctx, other, migrated, &owner); err == nil {
		t.Fatal("cross-account migration accepted")
	}
	if code, _ := e.doAs(owner, "POST", path, map[string]any{"authorization_mode": "migrate"}); code != 400 {
		t.Fatalf("existing draft overwritten: %d", code)
	}
	if code, out = commit(owner, id, migrated); code != 200 {
		t.Fatalf("migration commit: %d %v", code, out)
	}
}
