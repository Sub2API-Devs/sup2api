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

// Decision 6: a built-in role's name, permissions and assignable list are
// the super admin's alone to change, whatever the actor holds; custom roles
// follow the actor's own permissions as before.
func TestBuiltinRolesSuperAdminOnly(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	operator := addUser(t, s, "op@x.com", RoleOperator)
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "helper", Name: lt("Helper", "助手"), PermissionKeys: []string{"user:read"}}); err != nil {
		t.Fatal(err)
	}
	helperID := roleID(t, s, "helper")

	writes := func(actor, id int64) map[string]error {
		out := map[string]error{}
		_, out["rename"] = s.UpdateRole(ctx, actor, id, UpdateRoleInput{Name: lt("x", "x")})
		_, out["permissions"] = s.SetRolePermissions(ctx, actor, id, []string{"user:read"})
		_, out["assignable"] = s.SetRoleAssignable(ctx, actor, id, AssignableInput{})
		return out
	}
	// The admin holds everything each of these roles grants and may assign,
	// and is refused all the same.
	for _, key := range []string{RoleAdmin, RoleOperator, RoleUser} {
		id := roleID(t, s, key)
		before, err := s.GetRole(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		for _, actor := range []int64{admin, operator} {
			denied := writes(actor, id)
			_, denied["reset"] = s.ResetRole(ctx, actor, id)
			denied["delete"] = s.DeleteRole(ctx, actor, id)
			for op, err := range denied {
				if !isCode(err, "permission_denied") || detail(err, "superuser") != true {
					t.Errorf("actor %d %s %s: %v", actor, op, key, err)
				}
			}
		}
		after, err := s.GetRole(ctx, id)
		if err != nil || !slices.Equal(after.PermissionKeys, before.PermissionKeys) || !slices.Equal(after.AssignableRoleKeys, before.AssignableRoleKeys) ||
			after.AssignCustom != before.AssignCustom || after.Name.Get("en") != before.Name.Get("en") {
			t.Fatalf("%s changed by a non-super admin: %+v, %v", key, after, err)
		}
	}

	// The super admin changes and resets them; deleting stays refused for
	// everyone (built-in).
	opID := roleID(t, s, RoleOperator)
	for op, err := range writes(root, opID) {
		if err != nil {
			t.Errorf("super admin %s operator: %v", op, err)
		}
	}
	if _, err := s.ResetRole(ctx, root, opID); err != nil {
		t.Fatalf("super admin resets operator: %v", err)
	}
	if err := s.DeleteRole(ctx, root, opID); !isCode(err, "conflict") {
		t.Fatalf("super admin deletes operator: %v", err)
	}

	// Custom roles are unchanged: the admin edits and deletes one within it.
	for op, err := range writes(admin, helperID) {
		if err != nil {
			t.Errorf("admin %s helper: %v", op, err)
		}
	}
	if err := s.DeleteRole(ctx, admin, helperID); err != nil {
		t.Fatalf("admin deletes helper: %v", err)
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
