package account

import (
	"slices"
	"testing"
)

// GET /accounts/summary counts live accounts by status over the caller's
// range: every account with account:read, its own with account:read:own
// only; without either it is 403.
func TestAccountSummaryFollowsOwnerScope(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	admin := e.uid
	alice := e.addUser("alice-summary@example.test")
	nobody := e.addUser("nobody-summary@example.test")
	authz.keys[admin], authz.keys[alice], authz.keys[nobody] = adminKeys, supplierKeys, nil
	insert := func(owner int64, status string, schedulable bool, deleted bool) {
		t.Helper()
		e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, created_by, status, schedulable, deleted_at)
			VALUES ('s', 'anthropic', 'apikey', ''::bytea, $1, $2, $3, CASE WHEN $4 THEN now() END) RETURNING id`, owner, status, schedulable, deleted)
	}
	insert(alice, "active", true, false)
	insert(alice, "active", false, false)
	insert(alice, "disabled", true, false)
	insert(alice, "active", true, true) // deleted: not counted
	insert(admin, "active", true, false)
	insert(admin, "error", true, false)
	// Nobody's (created_by NULL): only the full range counts it.
	e.exec1(`INSERT INTO accounts (name, plugin_key, type, credentials_enc, status) VALUES ('s', 'anthropic', 'apikey', ''::bytea, 'disabled') RETURNING id`)
	// Holding both levels is the full range.
	both := e.addUser("both-summary@example.test")
	authz.keys[both] = append(slices.Clone(adminKeys), supplierKeys...)

	summary := func(uid int64) (int, map[string]any) {
		t.Helper()
		return e.doAs(uid, "GET", "/accounts/summary", nil)
	}
	for _, tc := range []struct {
		uid                                      int64
		total, available, autoDisabled, disabled float64
	}{
		{alice, 3, 1, 1, 1},
		{admin, 6, 2, 2, 2},
		{both, 6, 2, 2, 2},
	} {
		code, out := summary(tc.uid)
		d := data(out)
		if code != 200 || d["total"] != tc.total || d["available"] != tc.available || d["auto_disabled"] != tc.autoDisabled || d["disabled"] != tc.disabled {
			t.Fatalf("user %d: %d %v", tc.uid, code, out)
		}
	}
	if code, _ := summary(nobody); code != 403 {
		t.Fatalf("without account read: %d", code)
	}
}
