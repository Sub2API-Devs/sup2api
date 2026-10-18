package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/jackc/pgx/v5"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"testing"
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
			if err := f.db.Tx(ctx, func(tx pgx.Tx) error { return f.s.MarkAccountDeleted(ctx, tx, id) }); err != nil {
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
		})
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
