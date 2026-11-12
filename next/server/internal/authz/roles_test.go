package authz

import (
	"context"
	"slices"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// rolePermissionKeys is every grant row of a role, removed permissions
// included, sorted.
func rolePermissionKeys(t *testing.T, s *Service, id int64) []string {
	t.Helper()
	var keys []string
	if err := s.db.Pool.QueryRow(context.Background(), `SELECT COALESCE(array_agg(p.key ORDER BY p.key), '{}')
FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1`, id).Scan(&keys); err != nil {
		t.Fatal(err)
	}
	return keys
}

// Nobody, the super admin and the system included, changes the super admin
// role in any way.
func TestSuperuserRoleFrozen(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	suID := roleID(t, s, RoleSuperAdmin)

	for _, actor := range []int64{root, admin, 0} {
		writes := map[string]error{}
		_, writes["name"] = s.UpdateRole(ctx, actor, suID, UpdateRoleInput{Name: lt("Root", "根")})
		_, writes["description"] = s.UpdateRole(ctx, actor, suID, UpdateRoleInput{Description: lt("x", "x")})
		_, writes["permissions"] = s.SetRolePermissions(ctx, actor, suID, []string{"user:read"})
		_, writes["reset"] = s.ResetRole(ctx, actor, suID)
		writes["delete"] = s.DeleteRole(ctx, actor, suID)
		for op, err := range writes {
			if !isCode(err, "conflict") {
				t.Errorf("actor %d %s super_admin: %v", actor, op, err)
			}
		}
	}
	if r, err := s.GetRole(ctx, suID); err != nil || r.Name.Get("zh") != "超级管理员" {
		t.Fatalf("super_admin changed: %+v %v", r, err)
	}
}

// M5: a role:define holder cannot change or delete a role granting more than
// it holds, so it cannot weaken a stronger user's role and then act on that
// user. Roles within its own permissions stay editable.
func TestRoleWritesNeedActOnRole(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	for key, perms := range map[string][]string{
		"helper": {"role:define", "user:read", "user:password:reset"},
		"big":    {"user:read", "settings:manage"},
		"small":  {"user:read"},
	} {
		if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: key, Name: lt(key, key), PermissionKeys: perms}); err != nil {
			t.Fatal(err)
		}
	}
	helper := addUser(t, s, "helper@x.com", "helper")
	victim := addUser(t, s, "victim@x.com", "big")
	bigID, smallID := roleID(t, s, "big"), roleID(t, s, "small")

	writes := map[string]error{}
	_, writes["weaken big"] = s.SetRolePermissions(ctx, helper, bigID, []string{"user:read"})
	_, writes["rename big"] = s.UpdateRole(ctx, helper, bigID, UpdateRoleInput{Name: lt("x", "x")})
	writes["delete big"] = s.DeleteRole(ctx, helper, bigID)
	_, writes["reset admin"] = s.ResetRole(ctx, helper, roleID(t, s, RoleAdmin))
	for op, err := range writes {
		if !isCode(err, "permission_denied") {
			t.Errorf("helper may %s: %v", op, err)
		}
	}
	if got := rolePermissionKeys(t, s, bigID); !slices.Equal(got, []string{"settings:manage", "user:read"}) {
		t.Fatalf("big changed: %v", got)
	}
	if err := s.CanActOnUser(ctx, helper, victim); !isCode(err, "permission_denied") {
		t.Fatalf("helper acts on victim: %v", err)
	}

	// Within its own permissions: it may add what it holds, nothing more.
	if _, err := s.SetRolePermissions(ctx, helper, smallID, []string{"user:read", "user:password:reset"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetRolePermissions(ctx, helper, smallID, []string{"user:read", "settings:manage"}); !isCode(err, "permission_denied") {
		t.Fatalf("helper grants settings:manage: %v", err)
	}
	if err := s.DeleteRole(ctx, helper, smallID); err != nil {
		t.Fatal(err)
	}
}

// P2: a role saves back as listed. Permissions of a disabled plugin are
// granted as before; removed ones are ignored and their grant rows kept.
func TestSetRolePermissionsKeepsInactive(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('guard', '{"en":"Guard"}', 'installed')`); err != nil {
		t.Fatal(err)
	}
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		return s.SyncPlugin(ctx, tx, "guard", []core.PermissionDef{{Key: "stats:read"}}, []string{RoleAdmin})
	}); err != nil {
		t.Fatal(err)
	}
	r, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "watch", Name: lt("Watch", "watch"),
		PermissionKeys: []string{"account:read", "proxy:read", "plugin.guard:stats:read"}})
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Tx(ctx, func(tx pgx.Tx) error { return s.SetPluginActive(ctx, tx, "guard", false) }); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE permissions SET status = 'removed' WHERE key = 'proxy:read'`); err != nil {
		t.Fatal(err)
	}

	if _, err := s.SetRolePermissions(ctx, admin, r.ID, r.PermissionKeys); err != nil {
		t.Fatalf("save as listed: %v", err)
	}
	if got := rolePermissionKeys(t, s, r.ID); !slices.Equal(got, []string{"account:read", "plugin.guard:stats:read", "proxy:read"}) {
		t.Fatalf("after save: %v", got)
	}
	// Dropping the plugin permission deletes its row; the removed one stays.
	if _, err := s.SetRolePermissions(ctx, admin, r.ID, []string{"account:read"}); err != nil {
		t.Fatal(err)
	}
	if got := rolePermissionKeys(t, s, r.ID); !slices.Equal(got, []string{"account:read", "proxy:read"}) {
		t.Fatalf("after drop: %v", got)
	}
	if _, err := s.SetRolePermissions(ctx, admin, r.ID, []string{"nope:x"}); !isCode(err, "invalid_argument") {
		t.Fatalf("unknown key: %v", err)
	}
}

// Every role write leaves one audit row, by its actor, on the role.
func TestRoleWritesAudited(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	r, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "ops", Name: lt("Ops", "运营"), PermissionKeys: []string{"user:read"}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateRole(ctx, root, r.ID, UpdateRoleInput{Name: lt("Ops 2", "运营 2")}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.SetRolePermissions(ctx, root, r.ID, []string{"user:read", "account:read"}); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteRole(ctx, root, r.ID); err != nil {
		t.Fatal(err)
	}
	opID := roleID(t, s, RoleOperator)
	if _, err := s.ResetRole(ctx, root, opID); err != nil {
		t.Fatal(err)
	}

	rows, err := db.Pool.Query(ctx, `SELECT action, target_id::bigint FROM audit_logs
WHERE target_type = 'role' AND action LIKE 'role.%' AND user_id = $1 ORDER BY id`, root)
	if err != nil {
		t.Fatal(err)
	}
	var got []string
	for rows.Next() {
		var action string
		var id int64
		if err := rows.Scan(&action, &id); err != nil {
			t.Fatal(err)
		}
		want := r.ID
		if action == "role.reset" {
			want = opID
		}
		if id != want {
			t.Errorf("%s on role %d, want %d", action, id, want)
		}
		got = append(got, action)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	want := []string{"role.create", "role.update", "role.permissions", "role.delete", "role.reset"}
	if !slices.Equal(got, want) {
		t.Fatalf("audit actions = %v, want %v", got, want)
	}
}
