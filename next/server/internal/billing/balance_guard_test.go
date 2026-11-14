package billing

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// keyTokens is allowAll that also answers "sak_<name>" with keys[name].
type keyTokens struct {
	allowAll
	keys map[string]core.AccessKeyIdentity
}

func (k keyTokens) VerifyAccessKey(_ context.Context, raw, _ string) (core.AccessKeyIdentity, error) {
	id, ok := k.keys[strings.TrimPrefix(raw, core.AccessKeyPrefix)]
	if !ok {
		return core.AccessKeyIdentity{}, core.ErrUnauthenticated
	}
	return id, nil
}

// Who may adjust whose balance (M7, FU6): balance:adjust decides whether
// (the route, narrowed by an access key), and the roles the caller manages
// decide whom (authz's CanActOnUsers, by the caller's roles, itself
// included), plain users only (no role but user) unless those roles also
// grant balance:adjust:any (core.ActOnBalance). The super admin adjusts
// everyone's; an admin plain users', and with balance:adjust:any those of
// suppliers and operators too, never an admin's, itself included; an
// operator given balance:adjust plain users'. Each action on oneself leaves
// one audit row.
func TestAdjustBalanceManagedUsers(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	az := authz.New(authz.Deps{DB: e.db, Bus: e.bus})
	if err := az.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	withRoles := func(email string, roles ...string) int64 {
		id := e.user(email)
		for _, role := range roles {
			e.exec(`INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE key = $2`, id, role)
		}
		return id
	}
	super := withRoles("super@example.com", authz.RoleSuperAdmin)
	admin, admin2 := withRoles("admin@example.com", authz.RoleUser, authz.RoleAdmin), withRoles("admin2@example.com", authz.RoleUser, authz.RoleAdmin)
	operator, operator2 := withRoles("op@example.com", authz.RoleUser, authz.RoleOperator), withRoles("op2@example.com", authz.RoleUser, authz.RoleOperator)
	supplier, user := withRoles("supplier@example.com", authz.RoleUser, authz.RoleSupplier), withRoles("user@example.com", authz.RoleUser)
	roleless := withRoles("roleless@example.com")
	// adjusting holds only balance:adjust: an operator holding it too keeps
	// the operator's assignable list.
	if _, err := az.CreateRole(ctx, super, authz.CreateRoleInput{Key: "adjusting", Name: core.LocalizedText{"en": "Adjusting"},
		PermissionKeys: []string{"balance:adjust"}}); err != nil {
		t.Fatal(err)
	}
	adjusting := withRoles("op-adjusting@example.com", authz.RoleUser, authz.RoleOperator, "adjusting")
	// The super admin hands balance:adjust:any (super-only) to a role.
	if _, err := az.CreateRole(ctx, super, authz.CreateRoleInput{Key: "adjusting_any", Name: core.LocalizedText{"en": "Adjusting any"},
		PermissionKeys: []string{"balance:adjust", "balance:adjust:any"}}); err != nil {
		t.Fatal(err)
	}
	adminAny := withRoles("admin-any@example.com", authz.RoleUser, authz.RoleAdmin, "adjusting_any")
	e.svc.Users = az
	engine := gin.New()
	e.svc.RegisterRoutes(httpapi.NewRouter(engine, keyTokens{keys: map[string]core.AccessKeyIdentity{
		"super_adjust": {UserID: super, KeyID: 11, Permissions: []string{"balance:adjust"}},
		"super_read":   {UserID: super, KeyID: 12, Permissions: []string{"balance:read"}},
		"admin_adjust": {UserID: admin, KeyID: 13, Permissions: []string{"balance:adjust"}},
		"admin_read":   {UserID: admin, KeyID: 14, Permissions: []string{"balance:read"}},
	}}, az))
	e.h = engine
	adjust := func(actor int64, key string, target int64) (int, map[string]any) {
		var auth []string
		if key != "" {
			auth = []string{"Authorization", "Bearer " + core.AccessKeyPrefix + key}
		}
		return e.call(actor, "POST", "/users/"+itoa(target)+"/balance/adjust", map[string]any{"amount": "1", "credit": true}, auth...)
	}
	const allowed, noPermission, notManaged, notPlain = "allowed", "permission", "not managed", "not plain"
	adjusted := 0
	for _, tc := range []struct {
		name   string
		actor  int64
		key    string
		target int64
		want   string
	}{
		{"super admin itself", super, "", super, allowed},
		{"super admin an admin", super, "", admin, allowed},
		{"super admin an operator", super, "", operator, allowed},
		{"super admin's key with balance:adjust itself", super, "super_adjust", super, allowed},
		{"super admin's key with balance:adjust a user", super, "super_adjust", user, allowed},
		{"super admin's key without it", super, "super_read", super, noPermission},
		{"admin a user", admin, "", user, allowed},
		{"admin a user without roles", admin, "", roleless, allowed},
		{"admin a supplier", admin, "", supplier, notPlain},
		{"admin an operator", admin, "", operator, notPlain},
		{"admin another admin", admin, "", admin2, notManaged},
		{"admin the super admin", admin, "", super, notManaged},
		{"admin itself", admin, "", admin, notManaged},
		{"admin's key with balance:adjust a user", admin, "admin_adjust", user, allowed},
		{"admin's key with balance:adjust a supplier", admin, "admin_adjust", supplier, notPlain},
		{"admin's key with balance:adjust another admin", admin, "admin_adjust", admin2, notManaged},
		{"admin's key with balance:adjust itself", admin, "admin_adjust", admin, notManaged},
		{"admin's key without it", admin, "admin_read", user, noPermission},
		{"admin with balance:adjust:any a supplier", adminAny, "", supplier, allowed},
		{"admin with balance:adjust:any an operator", adminAny, "", operator, allowed},
		{"admin with balance:adjust:any another admin", adminAny, "", admin, notManaged},
		{"operator by default", operator, "", user, noPermission},
		{"operator with balance:adjust a supplier", adjusting, "", supplier, notPlain},
		{"operator with balance:adjust a user", adjusting, "", user, allowed},
		{"operator with balance:adjust another operator", adjusting, "", operator2, notManaged},
		{"operator with balance:adjust an admin", adjusting, "", admin, notManaged},
		{"operator with balance:adjust itself", adjusting, "", adjusting, notManaged},
		{"a plain user", user, "", user, noPermission},
	} {
		status, resp := adjust(tc.actor, tc.key, tc.target)
		var details map[string]any
		if er, ok := resp["error"].(map[string]any); ok {
			details, _ = er["details"].(map[string]any)
		}
		switch tc.want {
		case allowed:
			if status != 200 {
				t.Errorf("%s: %d %v", tc.name, status, resp)
			}
			adjusted++
		case noPermission:
			if status != 403 || details["permission"] != "balance:adjust" {
				t.Errorf("%s: %d %v, want 403 for the permission", tc.name, status, resp)
			}
		case notManaged:
			if status != 403 || details["reason"] != "not_manageable" {
				t.Errorf("%s: %d %v, want 403 not manageable", tc.name, status, resp)
			}
		case notPlain:
			if status != 403 || details["reason"] != "not_plain_user" {
				t.Errorf("%s: %d %v, want 403 not a plain user", tc.name, status, resp)
			}
		}
	}
	// Refused adjustments moved no money.
	var n int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM balance_ledger`).Scan(&n); err != nil || n != adjusted {
		t.Fatalf("ledger rows: %d %v", n, err)
	}
	// Two actions on oneself went through, both the super admin's.
	rows, err := e.db.Pool.Query(ctx, `SELECT user_id, target_id, detail FROM audit_logs WHERE action = 'user.act_on_self' ORDER BY id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var got []map[string]any
	for rows.Next() {
		var uid int64
		var target string
		var raw []byte
		if err := rows.Scan(&uid, &target, &raw); err != nil {
			t.Fatal(err)
		}
		var d map[string]any
		if err := json.Unmarshal(raw, &d); err != nil || uid != super || target != itoa(super) || d["self"] != true {
			t.Fatalf("audit row: %d %s %s %v", uid, target, raw, err)
		}
		got = append(got, d)
	}
	if len(got) != 2 || got[0]["via"] != "session" || got[0]["access_key_id"] != nil ||
		got[1]["via"] != "access_key" || got[1]["access_key_id"] != float64(11) {
		t.Fatalf("audit rows: %v", got)
	}
	// Not wired, nobody adjusts anything.
	e.svc.Users = nil
	if status, resp := adjust(super, "", user); status != 500 {
		t.Fatalf("no guard: %d %v", status, resp)
	}
}
