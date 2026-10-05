package ccgateway

import (
	"context"
	"io"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func (f *runtimeFixture) draftRow(key string) (exists bool, accountID *int64, proxyID *int64, lastSeen time.Time) {
	f.t.Helper()
	e := f.db.Pool.QueryRow(context.Background(), `SELECT account_id, proxy_id, last_seen_at FROM ccgateway_runtimes WHERE key=$1`, key).
		Scan(&accountID, &proxyID, &lastSeen)
	return e == nil, accountID, proxyID, lastSeen
}

// TestDraftLifecycle: the editor creates a draft, the runtime is prepared
// under the draft key, Claude Code is authorized in it and the draft is
// deleted; only its creator (or a settings administrator) sees it.
func TestDraftLifecycle(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	creator, stranger, admin := f.user("creator@x"), f.user("stranger@x"), f.user("admin@x")
	f.auth.keys[creator] = []string{"account:create"}
	f.auth.keys[stranger] = []string{"account:create"}
	pid := f.proxy(nil)

	code, out := f.request(creator, "POST", "/system/ccgateway/drafts", `{"proxy_id":`+strconv.FormatInt(pid, 10)+`}`)
	key, _ := data(out)["key"].(string)
	if code != 201 || !isDraftKey(key) {
		t.Fatalf("create: %d %v", code, out)
	}
	if ok, acc, p, _ := f.draftRow(key); !ok || acc != nil || p == nil || *p != pid {
		t.Fatalf("draft row: %v %v %v", ok, acc, p)
	}
	base := "/system/ccgateway/drafts/" + key
	if code, out = f.request(creator, "GET", base+"/status", ""); code != 200 || data(out)["status"] != "creating" || data(out)["key"] != key {
		t.Fatalf("status before sync: %d %v", code, out)
	}
	if code, out = f.request(creator, "POST", base+"/sync", `{}`); code != 200 || data(out)["synced"] != true {
		t.Fatalf("sync: %d %v", code, out)
	}
	if len(ctl.seen("PUT /accounts/"+key+"/config")) == 0 {
		t.Fatalf("runtime not configured under the draft key: %v", ctl.seen(""))
	}
	if code, out = f.request(creator, "GET", base+"/status", ""); code != 200 || data(out)["status"] != "ready" || data(out)["container"] != "ccg-"+key+"-app" {
		t.Fatalf("status after sync: %d %v", code, out)
	}
	if code, out = f.request(creator, "POST", base+"/start", `{}`); code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("start: %d %v", code, out)
	}
	if code, out = f.request(creator, "GET", base+"/session", ""); code != 200 || data(out)["session_id"] != "s1" {
		t.Fatalf("session: %d %v", code, out)
	}
	if code, out = f.request(creator, "POST", base+"/complete", `{"code":"no-state"}`); code != 400 || reason(out) != "invalid_code" {
		t.Fatalf("bad code: %d %v", code, out)
	}
	if code, out = f.request(creator, "POST", base+"/complete", `{"code":"abc#st","session_id":"s1"}`); code != 200 {
		t.Fatalf("complete: %d %v", code, out)
	}
	if code, out = f.request(creator, "GET", base+"/health", ""); code != 200 || data(out)["logged_in"] != true {
		t.Fatalf("health: %d %v", code, out)
	}
	if code, _ = f.request(creator, "POST", base+"/logout", `{}`); code != 404 {
		t.Fatalf("logout on a draft: %d", code)
	}
	// Every call touches last_seen_at.
	if _, err := f.db.Pool.Exec(context.Background(), `UPDATE ccgateway_runtimes SET last_seen_at = now() - interval '10 minutes' WHERE key=$1`, key); err != nil {
		t.Fatal(err)
	}
	f.request(creator, "GET", base+"/status", "")
	if _, _, _, seen := f.draftRow(key); time.Since(seen) > time.Minute {
		t.Fatalf("status did not touch the draft: %v", seen)
	}

	// Another creator does not see it; a settings administrator does.
	for _, path := range []string{"/status", "/health", "/session"} {
		if code, out = f.request(stranger, "GET", base+path, ""); code != 404 || reason(out) != "draft_not_found" {
			t.Fatalf("stranger GET %s: %d %v", path, code, out)
		}
	}
	if code, _ = f.request(stranger, "PUT", base, `{"proxy_id":`+strconv.FormatInt(pid, 10)+`}`); code != 404 {
		t.Fatalf("stranger PUT: %d", code)
	}
	if code, _ = f.request(stranger, "DELETE", base, ""); code != 404 {
		t.Fatalf("stranger DELETE: %d", code)
	}
	if code, out = f.request(admin, "GET", base+"/status", ""); code != 200 {
		t.Fatalf("admin status: %d %v", code, out)
	}

	// Changing the proxy re-reconciles under a new revision.
	pid2 := f.proxy(nil)
	if code, out = f.request(creator, "PUT", base, `{"proxy_id":`+strconv.FormatInt(pid2, 10)+`}`); code != 200 || data(out)["key"] != key {
		t.Fatalf("update: %d %v", code, out)
	}
	if code, out = f.request(creator, "GET", base+"/status", ""); data(out)["status"] != "creating" {
		t.Fatalf("status after a proxy change: %d %v", code, out)
	}

	if code, out = f.request(creator, "DELETE", base, ""); code != 204 {
		t.Fatalf("delete: %d %v", code, out)
	}
	if len(ctl.seen("DELETE /accounts/"+key)) != 1 {
		t.Fatalf("controller delete: %v", ctl.seen("DELETE"))
	}
	if ok, _, _, _ := f.draftRow(key); ok {
		t.Fatal("draft row kept")
	}
	if code, _ = f.request(creator, "GET", base+"/status", ""); code != 404 {
		t.Fatalf("deleted draft: %d", code)
	}
	if code, _ = f.request(creator, "GET", "/system/ccgateway/drafts/123/status", ""); code != 404 {
		t.Fatalf("account id as draft key: %d", code)
	}
}

// TestDraftDeleteKeepsTheRowWhenTheControllerFails: the row stays (marked
// expired, so the sweep retries) when the controller cannot delete.
func TestDraftDeleteKeepsTheRowWhenTheControllerFails(t *testing.T) {
	ctl := newFakeController(t)
	ctl.deleteCode = 500
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	code, out := f.request(1, "POST", "/system/ccgateway/drafts", `{"proxy_id":`+strconv.FormatInt(f.proxy(nil), 10)+`}`)
	key, _ := data(out)["key"].(string)
	if code != 201 {
		t.Fatalf("create: %d %v", code, out)
	}
	if code, out = f.request(1, "DELETE", "/system/ccgateway/drafts/"+key, ""); code != 503 {
		t.Fatalf("delete with a failing controller: %d %v", code, out)
	}
	ok, _, _, seen := f.draftRow(key)
	if !ok || time.Since(seen) < 20*time.Hour {
		t.Fatalf("row after a failed delete: %v %v", ok, seen)
	}
}

func TestDraftCreateValidatesTheProxy(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	own, ownNoProxy, all := f.user("own@x"), f.user("own2@x"), f.user("all@x")
	f.auth.keys[own] = []string{"account:own:create", "proxy:own:read"}
	f.auth.keys[ownNoProxy] = []string{"account:own:create"}
	f.auth.keys[all] = []string{"account:create"}
	mineProxy, otherProxy := f.proxy(&own), f.proxy(nil)
	disabled := f.proxy(nil)
	if _, err := f.db.Pool.Exec(context.Background(), `UPDATE proxies SET status='disabled' WHERE id=$1`, disabled); err != nil {
		t.Fatal(err)
	}
	body := func(id int64) string { return `{"proxy_id":` + strconv.FormatInt(id, 10) + `}` }
	for _, tc := range []struct {
		uid    int64
		body   string
		code   int
		reason any
	}{
		{all, `{}`, 400, "no_proxy"},
		{all, body(999999), 400, "proxy_not_found"},
		{all, body(disabled), 400, "proxy_disabled"},
		{all, body(otherProxy), 201, nil}, // account:create: any existing proxy
		{own, body(otherProxy), 400, "proxy_not_found"},
		{own, body(mineProxy), 201, nil},
		{ownNoProxy, body(mineProxy), 400, "proxy_not_found"},
		{f.user("x@x"), body(mineProxy), 201, nil}, // holds every key
	} {
		code, out := f.request(tc.uid, "POST", "/system/ccgateway/drafts", tc.body)
		if code != tc.code || reason(out) != tc.reason {
			t.Errorf("user %d %s: %d %v, want %d %v", tc.uid, tc.body, code, out, tc.code, tc.reason)
		}
	}
	reader := f.user("reader2@x")
	f.auth.keys[reader] = []string{"account:read"}
	if code, _ := f.request(reader, "POST", "/system/ccgateway/drafts", body(otherProxy)); code != 403 {
		t.Fatalf("reader: %d", code)
	}
	f.runtimes(false)
	if code, out := f.request(all, "POST", "/system/ccgateway/drafts", body(otherProxy)); code != 503 || reason(out) != "not_configured" {
		t.Fatalf("runtimes off: %d %v", code, out)
	}
}

// TestAdoptedAccountUsesTheDraftKey: once adopted, every runtime operation of
// the account (reconcile, status, model requests, kick by account id) uses
// the draft key; the draft endpoints no longer reach it.
func TestAdoptedAccountUsesTheDraftKey(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	ctx := context.Background()
	id := f.account(true)
	key := newDraftKey()
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, created_by) VALUES($1, $2, 1)`, key, f.proxy(nil)); err != nil {
		t.Fatal(err)
	}
	tx, err := f.db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = AdoptDraft(ctx, tx, key, id, nil); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	keys, err := f.s.runtimeKeys(ctx)
	if err != nil || strings.Join(keys, ",") != key {
		t.Fatalf("runtime keys: %v %v", keys, err)
	}
	if err = f.s.Reconcile(ctx, strconv.FormatInt(id, 10)); err != nil {
		t.Fatal(err)
	}
	if len(ctl.seen("PUT /accounts/"+key+"/config")) != 1 || len(ctl.seen("PUT /accounts/"+strconv.FormatInt(id, 10))) != 0 {
		t.Fatalf("reconcile by account id: %v", ctl.seen("PUT"))
	}
	if code, out := f.call("GET", id, "status", ""); code != 200 || data(out)["status"] != "ready" || data(out)["key"] != key ||
		data(out)["account_id"] != strconv.FormatInt(id, 10) {
		t.Fatalf("account status: %d %v", code, out)
	}
	if code, _ := f.request(1, "GET", "/system/ccgateway/drafts/"+key+"/status", ""); code != 404 {
		t.Fatalf("adopted draft still a draft: %d", code)
	}
	req, _ := http.NewRequest("POST", VirtualURL, strings.NewReader(`{}`))
	res, err := f.s.ModelClient(id).Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.Copy(io.Discard, res.Body)
	res.Body.Close()
	if len(ctl.seen("POST /accounts/"+key+"/v1/messages")) != 1 {
		t.Fatalf("model request route: %v", ctl.seen("POST"))
	}
	// A second adoption of the same draft fails.
	tx, _ = f.db.Pool.Begin(ctx)
	defer tx.Rollback(ctx)
	if err = AdoptDraft(ctx, tx, key, f.account(true), nil); err == nil {
		t.Fatal("draft adopted twice")
	}
}

// TestSweepRemovesAbandonedDrafts: idle and too old drafts, and controller
// draft runtimes unknown to the core, are removed; adopted runtimes,
// account-id keys, fresh drafts and young orphans are kept.
func TestSweepRemovesAbandonedDrafts(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	f.s.Locker = testutil.NewMemLocker()
	ctx := context.Background()
	pid := f.proxy(nil)
	idle, old, fresh, adopted := newDraftKey(), newDraftKey(), newDraftKey(), newDraftKey()
	orphanOld, orphanYoung := newDraftKey(), newDraftKey()
	accountID := f.account(true)
	for _, row := range []struct {
		key                string
		seenAgo, createdAg string
		account            *int64
	}{
		{idle, "20 minutes", "30 minutes", nil},
		{old, "1 minute", "3 hours", nil},
		{fresh, "1 minute", "5 minutes", nil},
		{adopted, "5 hours", "5 hours", &accountID},
	} {
		if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key, proxy_id, account_id, last_seen_at, created_at)
			VALUES($1, $2, $3, now() - $4::interval, now() - $5::interval)`, row.key, pid, row.account, row.seenAgo, row.createdAg); err != nil {
			t.Fatal(err)
		}
	}
	long := time.Now().Add(-time.Hour)
	ctl.mu.Lock()
	for _, k := range []string{idle, old, fresh, adopted, orphanOld, "42"} {
		ctl.created[k] = long
	}
	ctl.created[orphanYoung] = time.Now()
	ctl.mu.Unlock()

	// Another node holds the sweep: nothing happens here.
	lk, ok, _ := f.s.Locker.TryLock(ctx, sweepLockKey, time.Minute)
	if !ok {
		t.Fatal("lock")
	}
	if n, err := f.s.SweepDrafts(ctx); n != 0 || err != nil || len(ctl.seen("DELETE")) != 0 {
		t.Fatalf("sweep without the lock: %d %v %v", n, err, ctl.seen("DELETE"))
	}
	lk.Release()

	n, err := f.s.SweepDrafts(ctx)
	if err != nil || n != 3 {
		t.Fatalf("sweep: %d %v (deletes %v)", n, err, ctl.seen("DELETE"))
	}
	deleted := strings.Join(ctl.seen("DELETE"), ",")
	for _, k := range []string{idle, old, orphanOld} {
		if !strings.Contains(deleted, k) {
			t.Errorf("%s not deleted: %s", k, deleted)
		}
	}
	for _, k := range []string{fresh, adopted, orphanYoung, "/42"} {
		if strings.Contains(deleted, k) {
			t.Errorf("%s deleted: %s", k, deleted)
		}
	}
	for k, want := range map[string]bool{idle: false, old: false, fresh: true, adopted: true} {
		if ok, _, _, _ := f.draftRow(k); ok != want {
			t.Errorf("row %s exists=%v, want %v", k, ok, want)
		}
	}

	// A failing controller keeps the row for the next sweep.
	ctl.mu.Lock()
	ctl.deleteCode = 500
	ctl.mu.Unlock()
	if _, err := f.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET last_seen_at = now() - interval '1 hour' WHERE key=$1`, fresh); err != nil {
		t.Fatal(err)
	}
	if n, err = f.s.SweepDrafts(ctx); err == nil || n != 0 {
		t.Fatalf("sweep with a failing controller: %d %v", n, err)
	}
	if ok, _, _, _ := f.draftRow(fresh); !ok {
		t.Fatal("row deleted although the controller failed")
	}

	// Runtimes off: the sweep does nothing.
	ctl.mu.Lock()
	ctl.deleteCode = 200
	before := len(ctl.calls)
	ctl.mu.Unlock()
	f.runtimes(false)
	if n, err = f.s.SweepDrafts(ctx); n != 0 || err != nil || len(ctl.seen("")) != before {
		t.Fatalf("sweep with runtimes off: %d %v", n, err)
	}
}
