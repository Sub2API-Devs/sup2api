package billing

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
)

// Who may adjust whose balance is authz's CanActOnUsers, and never one's own
// (M7). Every caller here holds balance:adjust (allowAll); the roles decide.
func TestAdjustBalanceActsOnOthers(t *testing.T) {
	e := newEnv(t)
	az := authz.New(authz.Deps{DB: e.db, Bus: e.bus})
	if err := az.SyncCore(context.Background()); err != nil {
		t.Fatal(err)
	}
	e.svc.Users = az
	withRole := func(email, role string) int64 {
		id := e.user(email)
		e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, id, role)
		return id
	}
	super, admin := withRole("super@example.com", authz.RoleSuperAdmin), withRole("admin@example.com", authz.RoleAdmin)
	operator, user := withRole("operator@example.com", authz.RoleOperator), withRole("user@example.com", authz.RoleUser)
	adjust := func(actor, target int64) (int, map[string]any) {
		return e.call(actor, "POST", "/users/"+itoa(target)+"/balance/adjust", map[string]any{"amount": "1", "credit": true})
	}
	adjusted := 0
	for _, tc := range []struct {
		name          string
		actor, target int64
		status        int
		code          string
	}{
		{"oneself", admin, admin, 409, "conflict"},
		{"a superuser oneself", super, super, 409, "conflict"},
		{"a user with higher privileges", operator, admin, 403, "permission_denied"},
		{"a superuser", admin, super, 403, "permission_denied"},
		{"a user within one's own roles", operator, user, 200, ""},
		{"an admin as the superuser", super, admin, 200, ""},
	} {
		status, resp := adjust(tc.actor, tc.target)
		if status != tc.status || (tc.code != "" && errCode(resp) != tc.code) {
			t.Fatalf("adjusting %s: %d %v", tc.name, status, resp)
		}
		if status == 200 {
			adjusted++
		}
	}
	// Refused adjustments moved no money.
	var n int
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM balance_ledger`).Scan(&n); err != nil || n != adjusted {
		t.Fatalf("ledger rows: %d %v", n, err)
	}
	// Not wired, nobody adjusts anything.
	e.svc.Users = nil
	if status, resp := adjust(super, user); status != 500 {
		t.Fatalf("no guard: %d %v", status, resp)
	}
}
