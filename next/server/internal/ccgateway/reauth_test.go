package ccgateway

import (
	"context"
	"sort"
	"strconv"
	"strings"
	"testing"
)

// TestRetiredRuntimesAreLeftAloneThenDeleted: a runtime retired by a
// re-authorization (§49.17) is no longer reconciled nor visible as a draft,
// and the sweep deletes it after the grace period (an account-id key with
// X-CCG-Delete-Account); a failing controller keeps the row, and an
// account-id runtime the account would still fall back to is never deleted.
func TestRetiredRuntimesAreLeftAloneThenDeleted(t *testing.T) {
	ctl := newFakeController(t)
	f := newRuntimeFixture(t, ctl.ServeHTTP)
	ctx := context.Background()
	pid := f.proxy(nil)
	swapped, fallback := f.account(true), f.account(true)
	current, retiredDraft := newDraftKey(), newDraftKey()
	retiredID, fallbackID := strconv.FormatInt(swapped, 10), strconv.FormatInt(fallback, 10)
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{`INSERT INTO ccgateway_runtimes(key, proxy_id, created_by, account_id, adopted_at, for_account) VALUES($1,$2,1,$3,now(),$3)`, []any{current, pid, swapped}},
		{`INSERT INTO ccgateway_runtimes(key, proxy_id, created_by, retired_at, last_seen_at) VALUES($1,$2,1,now(),now() - interval '1 day')`, []any{retiredDraft, pid}},
		{`INSERT INTO ccgateway_runtimes(key, retired_at) VALUES($1, now())`, []any{retiredID}},
		// Inconsistent on purpose: the account has no other runtime.
		{`INSERT INTO ccgateway_runtimes(key, retired_at) VALUES($1, now() - interval '1 hour')`, []any{fallbackID}},
	} {
		if _, err := f.db.Pool.Exec(ctx, q.sql, q.args...); err != nil {
			t.Fatal(err)
		}
	}

	keys, err := f.s.runtimeKeys(ctx)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{current, fallbackID}
	if strings.Join(keys, ",") != strings.Join(sortedCopy(want), ",") {
		t.Fatalf("runtime keys: %v, want %v", keys, sortedCopy(want))
	}
	if key, err := f.s.resolveKey(ctx, retiredID); err != nil || key != current {
		t.Fatalf("account id resolves to %q %v", key, err)
	}
	if err := f.s.Reconcile(ctx, retiredDraft); err == nil {
		t.Fatal("retired draft key reconciled")
	}
	if len(ctl.seen("PUT /accounts/"+retiredDraft)) != 0 {
		t.Fatalf("retired runtime reconfigured: %v", ctl.seen("PUT"))
	}
	if code, out := f.request(1, "GET", "/system/ccgateway/drafts/"+retiredDraft+"/status", ""); code != 404 || reason(out) != "draft_not_found" {
		t.Fatalf("retired runtime as a draft: %d %v", code, out)
	}
	if code, _ := f.request(1, "DELETE", "/system/ccgateway/drafts/"+retiredDraft, ""); code != 404 {
		t.Fatalf("retired runtime deleted as a draft: %d", code)
	}

	// Within the grace period: nothing is deleted (the idle draft rule does
	// not apply to retired rows either).
	if n, err := f.s.SweepDrafts(ctx); err != nil || n != 0 || len(ctl.seen("DELETE")) != 0 {
		t.Fatalf("early sweep: %d %v %v", n, err, ctl.seen("DELETE"))
	}
	if _, err := f.db.Pool.Exec(ctx, `UPDATE ccgateway_runtimes SET retired_at = now() - interval '71 minutes' WHERE key = ANY($1)`,
		[]string{retiredDraft, retiredID}); err != nil {
		t.Fatal(err)
	}
	// A failing controller keeps the rows.
	ctl.mu.Lock()
	ctl.deleteCode = 500
	ctl.mu.Unlock()
	if n, err := f.s.SweepDrafts(ctx); err == nil || n != 0 {
		t.Fatalf("sweep with a failing controller: %d %v", n, err)
	}
	if ok, _, _, _ := f.draftRow(retiredID); !ok {
		t.Fatal("row deleted although the controller failed")
	}
	ctl.mu.Lock()
	ctl.deleteCode = 200
	ctl.calls = nil
	ctl.mu.Unlock()
	if n, err := f.s.SweepDrafts(ctx); err != nil || n != 2 {
		t.Fatalf("sweep: %d %v %v", n, err, ctl.seen("DELETE"))
	}
	deletes := ctl.seen("DELETE")
	if strings.Join(deletes, "\n") != strings.Join(sortedDeletes(retiredDraft, retiredID), "\n") {
		t.Fatalf("deletes: %v", deletes)
	}
	for k, want := range map[string]bool{retiredDraft: false, retiredID: false, current: true, fallbackID: true} {
		if ok, _, _, _ := f.draftRow(k); ok != want {
			t.Errorf("row %s exists=%v, want %v", k, ok, want)
		}
	}
}

func sortedCopy(in []string) []string {
	out := append([]string{}, in...)
	sort.Strings(out)
	return out
}

// sortedDeletes lists the expected controller calls in key order (the sweep
// reads retired rows ordered by key).
func sortedDeletes(draftKey, accountKey string) []string {
	calls := map[string]string{
		draftKey:   "DELETE /accounts/" + draftKey,
		accountKey: "DELETE /accounts/" + accountKey + " delete-account=" + accountKey,
	}
	var out []string
	for _, k := range sortedCopy([]string{draftKey, accountKey}) {
		out = append(out, calls[k])
	}
	return out
}
