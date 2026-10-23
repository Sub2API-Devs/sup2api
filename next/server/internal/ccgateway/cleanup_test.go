package ccgateway

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestDeletedRuntimePurgesDataAndRetriesFailure(t *testing.T) {
	for _, adopted := range []bool{false, true} {
		t.Run(strconv.FormatBool(adopted), func(t *testing.T) {
			ctl := newFakeController(t)
			purgeHeaders := []string{}
			f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path == "/health" {
					_ = json.NewEncoder(w).Encode(map[string]any{"features": []string{cleanupFeature, "cli-profile-v1"}})
					return
				}
				if r.Method == http.MethodDelete {
					purgeHeaders = append(purgeHeaders, r.Header.Get("X-CCG-Delete-Account")+"|"+r.Header.Get("X-CCG-Delete-Data"))
				}
				ctl.ServeHTTP(w, r)
			})
			ctx := context.Background()
			id := f.account(false)
			key := strconv.FormatInt(id, 10)
			if adopted {
				key = newDraftKey()
				if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at) VALUES($1,$2,now())`, key, id); err != nil {
					t.Fatal(err)
				}
			}
			if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled' WHERE id=$1`, id); err != nil {
				t.Fatal(err)
			}
			if err := f.s.Reconcile(ctx, strconv.FormatInt(id, 10)); err != nil {
				t.Fatal(err)
			}
			if len(purgeHeaders) != 0 {
				t.Fatal("disabled account deleted")
			}
			if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at=now() WHERE id=$1`, id); err != nil {
				t.Fatal(err)
			}
			if err := f.s.Reconcile(ctx, key); err != nil {
				t.Fatal(err)
			}
			if len(purgeHeaders) != 0 {
				t.Fatal("historical deletion purged without an explicit cleanup job")
			}
			if err := f.db.Tx(ctx, func(tx pgx.Tx) error { return f.s.MarkAccountDeleted(ctx, tx, id, core.AccountDeletionOptions{}) }); err != nil {
				t.Fatal(err)
			}
			ctl.deleteCode = 500
			if err := f.s.Reconcile(ctx, key); err == nil {
				t.Fatal("cleanup failure hidden")
			}
			ctl.deleteCode = 200
			if err := f.s.Reconcile(ctx, key); err != nil {
				t.Fatal(err)
			}
			if len(purgeHeaders) != 2 || purgeHeaders[0] != key+"|1" || purgeHeaders[1] != key+"|1" {
				t.Fatalf("purge requests: %v", purgeHeaders)
			}
			// Purged once: recorded, never purged again (by no node, at no pass).
			f.s.forgetBlocked()
			if err := f.s.Reconcile(ctx, key); err != nil || len(purgeHeaders) != 2 {
				t.Fatalf("purged again: %v %v", err, purgeHeaders)
			}
			if !f.purged(key) {
				t.Fatal("purge not recorded")
			}
			if keys, err := f.s.runtimeKeys(ctx); err != nil || slices.Contains(keys, key) {
				t.Fatalf("purged runtime still reconciled: %v %v", keys, err)
			}
		})
	}
}

// purged reports whether the runtime row of key records its purge.
func (f *runtimeFixture) purged(key string) bool {
	f.t.Helper()
	var purged bool
	if err := f.db.Pool.QueryRow(context.Background(), `SELECT purged_at IS NOT NULL FROM ccgateway_runtimes WHERE key=$1`, key).Scan(&purged); err != nil {
		f.t.Fatal(err)
	}
	return purged
}

// markDeleted soft-deletes account id as the account module does, keeping
// its runtime until retainUntil (nil: purge at once).
func (f *runtimeFixture) markDeleted(id int64, retainUntil *time.Time) {
	f.t.Helper()
	ctx := context.Background()
	if err := f.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE accounts SET deleted_at=now() WHERE id=$1`, id); err != nil {
			return err
		}
		return f.s.MarkAccountDeleted(ctx, tx, id, core.AccountDeletionOptions{RetainUntil: retainUntil})
	}); err != nil {
		f.t.Fatal(err)
	}
}

// cleanupController answers /health with the cleanup feature and DELETE
// /accounts/<key> with deleteCode/deleteBody when set; the rest goes to ctl.
func cleanupController(ctl *fakeController, deleteCode *int, deleteBody *string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_ = json.NewEncoder(w).Encode(map[string]any{"features": []string{cleanupFeature, "runtime-purge-v2", "cli-profile-v1"}})
			return
		}
		if r.Method == http.MethodDelete && *deleteCode != 0 {
			ctl.mu.Lock()
			ctl.calls = append(ctl.calls, "DELETE "+r.URL.Path+" refused")
			ctl.mu.Unlock()
			w.WriteHeader(*deleteCode)
			_, _ = w.Write([]byte(*deleteBody))
			return
		}
		ctl.ServeHTTP(w, r)
	}
}

// A deleted account kept for its retention period is blocked (stopped, data
// kept) and protected from the orphan cleanup; when the period ends it is
// purged once and recorded.
func TestRetainedDeletedRuntimeBlocksThenPurgesOnce(t *testing.T) {
	ctl := newFakeController(t)
	var code int
	var body string
	f := newRuntimeFixture(t, cleanupController(ctl, &code, &body))
	ctx := context.Background()
	id := f.account(true)
	key := strconv.FormatInt(id, 10)
	if err := f.s.Reconcile(ctx, key); err != nil {
		t.Fatal(err)
	}
	until := time.Now().Add(72 * time.Hour)
	f.markDeleted(id, &until)
	for i := 0; i < 2; i++ {
		f.s.forgetBlocked()
		if err := f.s.Reconcile(ctx, key); err != nil {
			t.Fatal(err)
		}
	}
	ctl.mu.Lock()
	blocked := ctl.revision[key] == ""
	ctl.mu.Unlock()
	if !blocked || len(ctl.seen("DELETE")) != 0 || f.purged(key) {
		t.Fatalf("retained runtime: blocked=%v deletes=%v", blocked, ctl.seen("DELETE"))
	}
	keep, err := f.s.cleanupKeepKeys(ctx)
	if err != nil || !slices.Contains(keep, key) {
		t.Fatalf("orphan cleanup would delete a retained runtime: %v %v", keep, err)
	}
	status, out := f.request(1, "GET", "/system/ccgateway/runtimes/retained", "")
	list, _ := data(out)["runtimes"].([]any)
	if status != 200 || len(list) != 1 {
		t.Fatalf("retained list: %d %v", status, out)
	}
	item := list[0].(map[string]any)
	purgeAfter, perr := time.Parse(time.RFC3339, item["purge_after"].(string))
	if item["key"] != key || item["account_id"] != float64(id) || perr != nil || purgeAfter.Sub(until).Abs() > time.Second {
		t.Fatalf("retained item: %v", item)
	}
	f.auth.keys[2] = []string{"account:read"}
	if status, _ := f.request(2, "GET", "/system/ccgateway/runtimes/retained", ""); status != 403 {
		t.Fatalf("retained list without settings:read: %d", status)
	}

	// The retention ends (the blocked mark of this node does not delay it).
	// While the controller refuses, the runtime stays listed as due.
	if _, err := f.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET purge_after=now()-interval '1 second' WHERE key=$1`, key); err != nil {
		t.Fatal(err)
	}
	code, body = http.StatusConflict, `{"error":"resource_in_use"}`
	if err := f.s.Reconcile(ctx, key); err == nil || f.purged(key) {
		t.Fatalf("refused purge: %v purged=%v", err, f.purged(key))
	}
	if _, out := f.request(1, "GET", "/system/ccgateway/runtimes/retained", ""); len(data(out)["runtimes"].([]any)) != 1 || data(out)["runtimes"].([]any)[0].(map[string]any)["due"] != true {
		t.Fatalf("failed purge not listed as due: %v", out)
	}
	code, body = 0, ""
	if err := f.s.Reconcile(ctx, key); err != nil {
		t.Fatal(err)
	}
	if deletes := ctl.seen("DELETE"); len(deletes) != 2 || deletes[1] != "DELETE /accounts/"+key+" delete-account="+key+" delete-data=1" || !f.purged(key) {
		t.Fatalf("expired retention: %v purged=%v", deletes, f.purged(key))
	}
	f.s.forgetBlocked()
	if err := f.s.Reconcile(ctx, key); err != nil || len(ctl.seen("DELETE")) != 2 {
		t.Fatalf("purged again: %v %v", err, ctl.seen("DELETE"))
	}
	if keep, _ := f.s.cleanupKeepKeys(ctx); slices.Contains(keep, key) {
		t.Fatal("purged runtime still protected")
	}
	if _, out := f.request(1, "GET", "/system/ccgateway/runtimes/retained", ""); len(data(out)["runtimes"].([]any)) != 0 {
		t.Fatalf("purged runtime still listed: %v", out)
	}
}

// An unusable bound proxy kept a deleted account's runtime from ever being
// purged; a row an older core marked (retired_at, no purge_after) is purged
// at once.
func TestDeletedRuntimePurgedDespiteUnusableProxyAndLegacyMark(t *testing.T) {
	ctl := newFakeController(t)
	var code int
	var body string
	f := newRuntimeFixture(t, cleanupController(ctl, &code, &body))
	ctx := context.Background()
	unusable, legacy := f.account(true), f.account(false)
	if _, err := f.db.Pool.Exec(ctx, `DELETE FROM proxies WHERE id=(SELECT proxy_id FROM accounts WHERE id=$1)`, unusable); err != nil {
		t.Fatal(err)
	}
	f.markDeleted(unusable, nil)
	f.markDeleted(legacy, nil)
	if _, err := f.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET purge_after=NULL WHERE account_id=$1`, legacy); err != nil {
		t.Fatal(err)
	}
	for _, id := range []int64{unusable, legacy} {
		key := strconv.FormatInt(id, 10)
		if err := f.s.Reconcile(ctx, key); err != nil {
			t.Fatal(err)
		}
		if len(ctl.seen("DELETE /accounts/"+key+" ")) != 1 || !f.purged(key) {
			t.Fatalf("account %d not purged: %v", id, ctl.seen("DELETE"))
		}
	}
}

// The controller's 409 resource_in_use (a foreign container uses the
// runtime's network or volume) is named, not reported as a generic failure,
// and the purge stays pending; the sweep of retired runtimes names it too.
func TestPurgeConflictNamesResourceInUse(t *testing.T) {
	ctl := newFakeController(t)
	code, body := http.StatusConflict, `{"error":"resource_in_use"}`
	f := newRuntimeFixture(t, cleanupController(ctl, &code, &body))
	ctx := context.Background()
	id := f.account(false)
	key := strconv.FormatInt(id, 10)
	f.markDeleted(id, nil)
	err := f.s.Reconcile(ctx, key)
	if reasonOf(core.AsError(err)) != reasonResourceInUse || f.purged(key) {
		t.Fatalf("reconcile: %v purged=%v", err, f.purged(key))
	}
	status, out := f.call("POST", id, "sync", "")
	if status != 503 || reason(out) != reasonResourceInUse {
		t.Fatalf("sync: %d %v", status, out)
	}
	code, body = http.StatusServiceUnavailable, `{"error":"runtime_unavailable"}`
	if err := f.s.Reconcile(ctx, key); reasonOf(core.AsError(err)) != "runtime_cleanup_failed" {
		t.Fatalf("other failure: %v", err)
	}
	code, body = http.StatusConflict, `{"error":"resource_in_use"}`
	retired := strconv.FormatInt(f.account(false), 10)
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,retired_at) VALUES($1,now()-interval '2 hours')`, retired); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at) VALUES($1,$2,now())`, newDraftKey(), retired); err != nil {
		t.Fatal(err)
	}
	if _, err := f.s.sweepRetired(ctx); reasonOf(core.AsError(err)) != reasonResourceInUse {
		t.Fatalf("sweep: %v", err)
	}
	code = 0
	if err := f.s.Reconcile(ctx, key); err != nil || !f.purged(key) {
		t.Fatalf("retry: %v", err)
	}
}

// POST /system/ccgateway/runtimes/:key/purge ends a retention now, and
// retries a due purge.
func TestRuntimePurgeEndsRetention(t *testing.T) {
	ctl := newFakeController(t)
	var code int
	var body string
	f := newRuntimeFixture(t, cleanupController(ctl, &code, &body))
	ctx := context.Background()
	retained, active, immediate := f.account(false), f.account(false), f.account(false)
	until := time.Now().Add(24 * time.Hour)
	f.markDeleted(retained, &until)
	f.markDeleted(immediate, nil)
	key := strconv.FormatInt(retained, 10)
	path := func(key string) string { return "/system/ccgateway/runtimes/" + key + "/purge" }
	f.auth.keys[2] = []string{"settings:read"}
	if status, _ := f.request(2, "POST", path(key), ""); status != 403 {
		t.Fatalf("reader: %d", status)
	}
	kicked := func(want string) {
		t.Helper()
		select {
		case got := <-f.s.kick:
			if got != want {
				t.Fatalf("kicked %s, want %s", got, want)
			}
		default:
			t.Fatalf("%s not kicked", want)
		}
	}
	// active has no runtime row (404); a live account's row is 409.
	activeKey := strconv.FormatInt(active, 10)
	if status, out := f.request(1, "POST", path(activeKey), ""); status != 404 {
		t.Fatalf("no runtime row: %d %v", status, out)
	}
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at) VALUES($1,$2,now())`, activeKey, active); err != nil {
		t.Fatal(err)
	}
	if status, out := f.request(1, "POST", path(activeKey), ""); status != 409 || reason(out) != "runtime_not_retained" {
		t.Fatalf("live account: %d %v", status, out)
	}
	// A due purge (deleted without retention) is retried; its time stays.
	immediateKey := strconv.FormatInt(immediate, 10)
	var before, after time.Time
	_ = f.db.Pool.QueryRow(ctx, `SELECT purge_after FROM ccgateway_runtimes WHERE key=$1`, immediateKey).Scan(&before)
	if status, out := f.request(1, "POST", path(immediateKey), ""); status != 202 {
		t.Fatalf("retry due purge: %d %v", status, out)
	}
	kicked(immediateKey)
	if err := f.db.Pool.QueryRow(ctx, `SELECT purge_after FROM ccgateway_runtimes WHERE key=$1`, immediateKey).Scan(&after); err != nil || !after.Equal(before) {
		t.Fatalf("due purge time moved: %v -> %v (%v)", before, after, err)
	}
	if status, _ := f.request(1, "POST", path("999999"), ""); status != 404 {
		t.Fatalf("unknown key: %d", status)
	}
	if status, _ := f.request(1, "POST", path("x"), ""); status != 404 {
		t.Fatalf("invalid key: %d", status)
	}
	status, out := f.request(1, "POST", path(key), "")
	if status != 202 || data(out)["accepted"] != true || data(out)["key"] != key {
		t.Fatalf("purge: %d %v", status, out)
	}
	var due bool
	var audits int
	if err := f.db.Pool.QueryRow(ctx, `SELECT purge_after <= now() FROM ccgateway_runtimes WHERE key=$1`, key).Scan(&due); err != nil || !due {
		t.Fatalf("retention not ended: %v", err)
	}
	if err := f.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.purge' AND detail->>'key'=$1`, key).Scan(&audits); err != nil || audits != 1 {
		t.Fatalf("audit: %d %v", audits, err)
	}
	kicked(key)
	if err := f.s.Reconcile(ctx, key); err != nil || !f.purged(key) {
		t.Fatalf("reconcile after purge request: %v", err)
	}
	if status, out := f.request(1, "POST", path(key), ""); status != 409 || reason(out) != "runtime_not_retained" {
		t.Fatalf("purged already: %d %v", status, out)
	}
}

func TestCleanupUsesCompleteAuthoritativeKeepList(t *testing.T) {
	var got struct {
		KeepKeys   []string           `json:"keep_keys"`
		Candidates []cleanupCandidate `json:"candidates"`
	}
	calls := 0
	inventorySeen := false
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			_ = json.NewEncoder(w).Encode(map[string]any{"features": []string{cleanupFeature, "cli-profile-v1"}})
			return
		}
		if r.URL.Path == "/runtime/cleanup" {
			if r.Method == http.MethodGet {
				inventorySeen = true
				_ = json.NewEncoder(w).Encode(cleanupInventory{[]cleanupCandidate{{Key: "999999", Identity: strings.Repeat("a", 64)}}})
				return
			}
			if !inventorySeen {
				t.Error("cleanup sent before inventory")
			}
			calls++
			if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
				t.Error(err)
			}
			_ = json.NewEncoder(w).Encode(cleanupReport{Deleted: 1, Results: []cleanupResult{{Key: "999999", Status: "deleted"}}})
			return
		}
		ctl.ServeHTTP(w, r)
	})
	ctx := context.Background()
	active, disabled, deleted := f.account(false), f.account(false), f.account(false)
	if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET status='disabled' WHERE id=$1`, disabled); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `UPDATE accounts SET deleted_at=now() WHERE id=$1`, deleted); err != nil {
		t.Fatal(err)
	}
	adopted, preparation, expired := newDraftKey(), newDraftKey(), newDraftKey()
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key,account_id,adopted_at) VALUES($1,$2,now())`, adopted, active); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO ccgateway_runtimes(key) VALUES($1),($2)`, preparation, expired); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET last_seen_at=now()-interval '1 day' WHERE key=$1`, expired); err != nil {
		t.Fatal(err)
	}
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) SELECT 'bulk-'||n,'ccgateway','managed',''::bytea FROM generate_series(1,205) n`); err != nil {
		t.Fatal(err)
	}
	f.auth.keys[2] = []string{"settings:read"}
	if code, _ := f.request(2, "POST", "/system/ccgateway/runtime/cleanup", "{}"); code != 403 {
		t.Fatalf("reader cleanup: %d", code)
	}
	if code, _ := f.request(1, "POST", "/system/ccgateway/runtime/cleanup", `{"keep_keys":[]}`); code != 400 {
		t.Fatalf("browser list accepted: %d", code)
	}
	code, out := f.request(1, "POST", "/system/ccgateway/runtime/cleanup", "{}")
	if code != 200 || calls != 1 || data(out)["deleted"] != float64(1) {
		t.Fatalf("cleanup %d %v", code, out)
	}
	if len(got.KeepKeys) != 209 || !slices.Contains(got.KeepKeys, adopted) || !slices.Contains(got.KeepKeys, preparation) || !slices.Contains(got.KeepKeys, expired) || !slices.Contains(got.KeepKeys, strconv.FormatInt(disabled, 10)) {
		t.Fatalf("incomplete keep list (%d)", len(got.KeepKeys))
	}
	if slices.Contains(got.KeepKeys, strconv.FormatInt(deleted, 10)) || slices.Contains(got.KeepKeys, strconv.FormatInt(active, 10)) {
		t.Fatal("orphaned runtime incorrectly protected")
	}
	if len(got.Candidates) != 1 || got.Candidates[0].Identity != strings.Repeat("a", 64) {
		t.Fatal("inventory identities lost")
	}
}
