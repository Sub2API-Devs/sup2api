package account

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
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
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_, _ = w.Write([]byte(`{"features":["cli-profile-v1"]}`))
			return
		}
		// The Worker's capability read before every model request and probe
		// (each policy needs request_levels_v1).
		if r.URL.Path == "/healthz" {
			_ = json.NewEncoder(w).Encode(map[string]any{"status": "ok", "claude_version": "2.1.302", "capabilities": []string{
				features.RequestPolicyModeCapability, features.RequestLevelsCapability, features.BuildContentPreservationCapability,
			}})
			return
		}
		ctl(w, r)
	}))
	e.t.Cleanup(srv.Close)
	e.t.Setenv("CCGATEWAY_URL", srv.URL)
	ccg := ccgateway.New(e.db, e.svc.d.Cipher)
	plain, _ := json.Marshal(ccgateway.Config{Mode: "local", AccountRuntimes: runtimes, AdminKey: "controller-secret", RequestPolicy: &ccgateway.RequestPolicy{SchemaVersion: 1, UnknownField: "reject", CLIVersion: "2.1.302"}})
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
	// Registered like production (app.go): CCGateway is the ccgateway
	// accounts' lifecycle resource.
	if e.svc.d.LifecycleResources == nil {
		e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{}
	}
	e.svc.d.LifecycleResources["ccgateway"] = ccg
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

func TestAutomaticDisableKeepsCCGatewayRuntimeAvailable(t *testing.T) {
	e := setup(t)
	enabled := make(chan bool, 1)
	ccg := e.withCCGateway(true, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut && strings.HasSuffix(r.URL.Path, "/config") {
			var cfg struct {
				Enabled bool `json:"enabled"`
			}
			if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
				t.Error(err)
			}
			enabled <- cfg.Enabled
		}
		_, _ = w.Write([]byte(`{"status":"pending"}`))
	})
	id := e.mkRawAccount("ccgateway", "managed", "recoverable-worker", "unused", true)
	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('recovery','http','proxy.example',3128) RETURNING id`)
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET proxy_id=$2 WHERE id=$1`, id, pid); err != nil {
		t.Fatal(err)
	}
	if disabled, err := e.svc.AutoDisable(t.Context(), id, "quota exhausted"); err != nil || !disabled {
		t.Fatalf("disable: %t %v", disabled, err)
	}
	if err := ccg.Reconcile(t.Context(), itoa(id)); err != nil {
		t.Fatal(err)
	}
	if !<-enabled {
		t.Fatal("automatic disable made quota/authorization checks unavailable")
	}
}

// TestDisabledAccountAndProxyKeepCCGatewayRuntime: disabling the account or
// its proxy only takes it out of scheduling; the runtime keeps running with
// the same proxy, so tests and authorization still work.
func TestDisabledAccountAndProxyKeepCCGatewayRuntime(t *testing.T) {
	e := setup(t)
	type put struct {
		Enabled  bool           `json:"enabled"`
		Proxy    map[string]any `json:"proxy"`
		Revision string         `json:"revision"`
	}
	puts := make(chan put, 4)
	ccg := e.withCCGateway(true, func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut && strings.HasSuffix(r.URL.Path, "/config") {
			var cfg put
			if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
				t.Error(err)
			}
			puts <- cfg
		}
		_, _ = w.Write([]byte(`{"status":"pending"}`))
	})
	id := e.mkRawAccount("ccgateway", "managed", "disabled-worker", "unused", true)
	pid := e.exec1(`INSERT INTO proxies(name,protocol,host,port) VALUES('ccg','http','proxy.example',3128) RETURNING id`)
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET proxy_id=$2 WHERE id=$1`, id, pid); err != nil {
		t.Fatal(err)
	}
	if err := ccg.Reconcile(t.Context(), itoa(id)); err != nil {
		t.Fatal(err)
	}
	before := <-puts
	if !before.Enabled || before.Proxy["host"] != "proxy.example" {
		t.Fatalf("initial runtime: %+v", before)
	}
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET status='disabled',status_reason='disabled by administrator',schedulable=false WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE proxies SET status='disabled' WHERE id=$1`, pid); err != nil {
		t.Fatal(err)
	}
	ccg.Kick(itoa(id))
	if err := ccg.Reconcile(t.Context(), itoa(id)); err != nil {
		t.Fatal(err)
	}
	// The fake controller never reports ready, so the core writes the
	// configuration again: it is the same one (same revision, still enabled).
	if after := <-puts; !after.Enabled || after.Revision != before.Revision || after.Proxy["host"] != "proxy.example" {
		t.Fatalf("disabling the account or proxy changed the runtime: %+v, was %+v", after, before)
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

// runtimeDeletion reads the cleanup intent the account's runtime row holds:
// whether it is marked, its purge_after relative to now, and purged_at.
func (e *env) runtimeDeletion(id int64) (marked bool, purgeIn time.Duration, purged bool) {
	e.t.Helper()
	var seconds float64
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT retired_at IS NOT NULL, COALESCE(EXTRACT(EPOCH FROM purge_after-now()),-1e9), purged_at IS NOT NULL
		FROM ccgateway_runtimes WHERE account_id=$1`, id).Scan(&marked, &seconds, &purged); err != nil {
		e.t.Fatal(err)
	}
	return marked, time.Duration(seconds * float64(time.Second)), purged
}

// TestDeleteRetainResources: DELETE /accounts/:id?retain_resources=1 keeps
// the runtime for the retention days the account type declares; a type
// without a declaration, or any other value, is refused and nothing is
// deleted.
func TestDeleteRetainResources(t *testing.T) {
	e := setup(t)
	e.withCCGateway(true, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{"status":"pending"}`)) })
	retained := e.mkRawAccount("ccgateway", "managed", "retained", "unused", true)
	immediate := e.mkRawAccount("ccgateway", "managed", "immediate", "unused", true)
	other := e.mkRawAccount("anthropic", "apikey", "other", "sk-good-key-123", true)
	deleted := func(id int64) bool {
		var gone bool
		if err := e.db.Pool.QueryRow(context.Background(), `SELECT deleted_at IS NOT NULL FROM accounts WHERE id=$1`, id).Scan(&gone); err != nil {
			t.Fatal(err)
		}
		return gone
	}
	for _, tc := range []struct {
		id    int64
		query string
	}{
		{retained, "?retain_resources=yes"},
		{retained, "?retain_resources=0"},
		{retained, "?retain_resources=1"}, // this fixture's ccgateway/managed declares no retention
		{other, "?retain_resources=1"},    // a type without any deletion resource
	} {
		code, out := e.do("DELETE", "/accounts/"+itoa(tc.id)+tc.query, nil)
		errObj, _ := out["error"].(map[string]any)
		if code != 400 || errObj["code"] != "invalid_argument" || errObj["message"] == "" || deleted(tc.id) {
			t.Fatalf("%d%s: %d %v", tc.id, tc.query, code, out)
		}
	}
	e.gen.types[len(e.gen.types)-1].Type.Lifecycle = &manifest.AccountLifecycle{Deletion: &manifest.AccountDeletion{RetentionDays: 3}}
	if code, out := e.do("DELETE", "/accounts/"+itoa(retained)+"?retain_resources=1", nil); code != 204 {
		t.Fatalf("retained delete: %d %v", code, out)
	}
	if code, out := e.do("DELETE", "/accounts/"+itoa(immediate)+"?retain_resources=", nil); code != 204 {
		t.Fatalf("immediate delete: %d %v", code, out)
	}
	if marked, in, purged := e.runtimeDeletion(retained); !marked || purged || (in-72*time.Hour).Abs() > time.Minute {
		t.Fatalf("retained: marked=%v purge in %v purged=%v", marked, in, purged)
	}
	if marked, in, purged := e.runtimeDeletion(immediate); !marked || purged || in > 0 {
		t.Fatalf("immediate: marked=%v purge in %v purged=%v", marked, in, purged)
	}
	audits := e.auditRows("account.delete")
	if len(audits) != 2 {
		t.Fatalf("audits: %v", audits)
	}
	for _, a := range audits {
		detail, _ := a["detail"].(map[string]any)
		until, has := detail["retain_until"].(string)
		at, err := time.Parse(time.RFC3339, until)
		switch a["target_id"] {
		case itoa(retained):
			if !has || err != nil || time.Until(at)-72*time.Hour > time.Minute || 72*time.Hour-time.Until(at) > time.Minute {
				t.Fatalf("retained audit: %v", a)
			}
		default:
			if has {
				t.Fatalf("immediate audit carries retain_until: %v", a)
			}
		}
	}
}

// TestPurgePluginAccountsMarksRuntimeCleanup: uninstalling the plugin
// deletes its accounts' runtimes too (at once), instead of keeping their
// data forever.
func TestPurgePluginAccountsMarksRuntimeCleanup(t *testing.T) {
	e := setup(t)
	e.withCCGateway(true, func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte(`{}`)) })
	e.gen.types[len(e.gen.types)-1].Type.Lifecycle = &manifest.AccountLifecycle{Deletion: &manifest.AccountDeletion{RetentionDays: 3}}
	a, b := e.mkRawAccount("ccgateway", "managed", "a", "unused", true), e.mkRawAccount("ccgateway", "managed", "b", "unused", true)
	if _, err := e.db.Pool.Exec(context.Background(), `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at) VALUES('d00000000000000aa',$1,now())`, b); err != nil {
		t.Fatal(err)
	}
	if n, err := e.svc.PurgePluginAccounts(context.Background(), "ccgateway"); err != nil || n != 2 {
		t.Fatalf("purge: %d %v", n, err)
	}
	for _, id := range []int64{a, b} {
		if marked, in, purged := e.runtimeDeletion(id); !marked || purged || in > 0 {
			t.Fatalf("account %d: marked=%v purge in %v purged=%v", id, marked, in, purged)
		}
	}
}

// TestPurgePluginAccountsDropsCCGatewayRequestCache: the node that purged a
// plugin's accounts drops what CCGateway's request path kept of them at once,
// like a single account change, instead of serving the deleted account until
// the bus message comes back or the cache expires (code-quality audit
// 2026-10-24 K6).
func TestPurgePluginAccountsDropsCCGatewayRequestCache(t *testing.T) {
	e := setup(t)
	// The connection lookup fails: the request ends after the account was
	// read (and kept), before any Worker is reached.
	ccg := e.withCCGateway(true, func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusInternalServerError) })
	id := e.mkRawAccount("ccgateway", "managed", "cached", "unused", true)
	call := func() (*http.Response, error) {
		req, _ := http.NewRequest("POST", ccgateway.VirtualURL, strings.NewReader(`{}`))
		return ccg.ModelClientForRequest(ccgateway.ModelRequestContext{AccountID: id}).Do(req)
	}
	if res, err := call(); err == nil {
		res.Body.Close()
		t.Fatalf("connection lookup should fail: %d", res.StatusCode)
	}
	if n, err := e.svc.PurgePluginAccounts(context.Background(), "ccgateway"); err != nil || n != 1 {
		t.Fatalf("purge: %d %v", n, err)
	}
	res, err := call()
	if err != nil {
		t.Fatalf("the kept (not deleted) account was used: %v", err)
	}
	defer res.Body.Close()
	var body strings.Builder
	_, _ = io.Copy(&body, res.Body)
	if res.StatusCode != http.StatusServiceUnavailable || !strings.Contains(body.String(), "deleted") {
		t.Fatalf("deleted account not refused: %d %s", res.StatusCode, body.String())
	}
}

// failingResource fails every reconcile like a controller refusing a
// deletion (409 resource_in_use).
type failingResource struct{ *preparationResource }

func (failingResource) ReconcileAccount(context.Context, int64) error {
	return core.ErrUnavailable.WithDetails(map[string]any{"reason": "resource_in_use"})
}

// TestDeletedLifecycleFailureDoesNotHoldEvents: the cleanup intent of a
// deleted account is persisted and reconciliation retries it, so a remote
// failure is only recorded; it does not fail the event delivery (which held
// back every lifecycle event of the plugin for minutes). Other phases still
// fail and are retried.
func TestDeletedLifecycleFailureDoesNotHoldEvents(t *testing.T) {
	e := setup(t)
	e.gen.types[0].Type.Lifecycle = &manifest.AccountLifecycle{}
	e.gen.types[0].Client = &preparationPlugin{fakePlatform: e.plat}
	e.svc.d.LifecycleResources = map[string]core.AccountLifecycleResource{"anthropic": failingResource{&preparationResource{}}}
	id := e.mkRawAccount("anthropic", "apikey", "deleted", "sk-good-key-123", true)
	if err := e.svc.deliverAccountLifecycle(t.Context(), id, "anthropic", core.EventAccountUpdated, []string{"name"}); err == nil {
		t.Fatal("update failure hidden")
	}
	if _, err := e.db.Pool.Exec(t.Context(), `UPDATE accounts SET deleted_at=now(),updated_at=now() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.deliverAccountLifecycle(t.Context(), id, "anthropic", core.EventAccountDeleted, nil); err != nil {
		t.Fatalf("deleted phase failure held the event: %v", err)
	}
	var status, code string
	if err := e.db.Pool.QueryRow(t.Context(), `SELECT status,code FROM account_lifecycle_sync WHERE account_id=$1`, id).Scan(&status, &code); err != nil || status != "failed" || code != "resource_in_use" {
		t.Fatalf("synchronization state: %s %s %v", status, code, err)
	}
}
