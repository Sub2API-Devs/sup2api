package authz

import (
	"context"
	"slices"
	"strings"
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

// A built-in role other than the super admin's is changed (renamed, its
// permissions or assignable list replaced, reset) by whoever has it on the
// assignable list and holds what it grants, as with a custom role holding
// users (editableRole): with the default lists the admin changes operator,
// supplier and user, never admin; nobody deletes one or changes its key.
// What is added must still be held (cannotGrant). An access key has no
// assignable list, the super admin's included.
func TestBuiltinRolesEditable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	operator := addUser(t, s, "op@x.com", RoleOperator)

	writes := func(actor, id int64, perms []string) map[string]error {
		out := map[string]error{}
		_, out["rename"] = s.UpdateRole(ctx, actor, id, UpdateRoleInput{Name: lt("x", "x")})
		_, out["permissions"] = s.SetRolePermissions(ctx, actor, id, perms)
		_, out["assignable"] = s.SetRoleAssignable(ctx, actor, id, AssignableInput{})
		_, out["reset"] = s.ResetRole(ctx, actor, id)
		return out
	}
	// Not on the actor's list: the admin's own role, the operator's own.
	for _, c := range []struct {
		actor int64
		key   string
	}{{admin, RoleAdmin}, {operator, RoleOperator}, {operator, RoleAdmin}} {
		id := roleID(t, s, c.key)
		before, err := s.GetRole(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		denied := writes(c.actor, id, []string{"user:read"})
		denied["delete"] = s.DeleteRole(ctx, c.actor, id)
		for op, err := range denied {
			if !isCode(err, "permission_denied") {
				t.Errorf("actor %d %s %s: %v", c.actor, op, c.key, err)
			}
		}
		after, err := s.GetRole(ctx, id)
		if err != nil || !slices.Equal(after.PermissionKeys, before.PermissionKeys) || after.Name.Get("en") != before.Name.Get("en") {
			t.Fatalf("%s changed: %+v, %v", c.key, after, err)
		}
	}

	// On the admin's list and within it: changed, reset; never deleted, the
	// key unchanged.
	for _, key := range []string{RoleOperator, RoleSupplier, RoleUser} {
		id := roleID(t, s, key)
		def, err := s.GetRole(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		for op, err := range writes(admin, id, []string{"user:read", "balance:adjust"}) {
			if err != nil {
				t.Errorf("admin %s %s: %v", op, key, err)
			}
		}
		if _, err := s.SetRolePermissions(ctx, admin, id, []string{"user:read"}); err != nil {
			t.Fatal(err)
		}
		r, err := s.ResetRole(ctx, admin, id)
		if err != nil || r.Key != key || !slices.Equal(r.PermissionKeys, def.PermissionKeys) || !slices.Equal(r.AssignableRoleKeys, def.AssignableRoleKeys) ||
			r.Name.Get("en") != def.Name.Get("en") {
			t.Fatalf("admin resets %s: %+v %v\nwant %+v", key, r, err, def)
		}
		if err := s.DeleteRole(ctx, admin, id); !isCode(err, "conflict") {
			t.Fatalf("admin deletes %s: %v", key, err)
		}
	}

	opID := roleID(t, s, RoleOperator)
	// Adding what the admin lacks is a grant beyond it.
	cur := rolePermissionKeys(t, s, opID)
	if _, err := s.SetRolePermissions(ctx, admin, opID, append(cur, "publisher:manage")); !isCode(err, "permission_denied") || detail(err, "missing") == nil {
		t.Fatalf("admin grants publisher:manage to operator: %v", err)
	}
	// The super admin's access key is refused: it has no assignable list.
	keyed := core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: root, Permissions: []string{"role:define", "user:read"}})
	if _, err := s.SetRolePermissions(keyed, root, opID, []string{"user:read"}); !isCode(err, "permission_denied") || detail(err, "missing_assignable") == nil {
		t.Fatalf("super admin's access key changes operator: %v", err)
	}
	// Once the super admin grants the operator more than the admin holds,
	// the admin can no longer change or reset it (M5).
	if _, err := s.SetRolePermissions(ctx, root, opID, append(cur, "publisher:manage")); err != nil {
		t.Fatal(err)
	}
	for op, err := range writes(admin, opID, cur) {
		if !isCode(err, "permission_denied") {
			t.Errorf("admin %s an operator above it: %v", op, err)
		}
	}

	// The super admin and the system change and reset every one of them,
	// admin included; deleting stays refused for everyone (built-in).
	for _, actor := range []int64{root, 0} {
		for _, key := range []string{RoleAdmin, RoleOperator, RoleSupplier, RoleUser} {
			for op, err := range writes(actor, roleID(t, s, key), []string{"user:read"}) {
				if err != nil {
					t.Errorf("actor %d %s %s: %v", actor, op, key, err)
				}
			}
		}
	}
	if err := s.DeleteRole(ctx, root, opID); !isCode(err, "conflict") {
		t.Fatalf("super admin deletes operator: %v", err)
	}
}

// A reset hands out every default again, so the actor must hold them all:
// a definer that may change the user role (within it, on its list) but
// lacks a default of it is refused with what it misses.
func TestResetNeedsEveryDefault(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "keeper", Name: lt("Keeper", "管家"),
		PermissionKeys: []string{"role:define", "gateway:use"}, AssignableRoleKeys: []string{RoleUser}}); err != nil {
		t.Fatal(err)
	}
	keeper := addUser(t, s, "keeper@x.com", "keeper")
	userID := roleID(t, s, RoleUser)
	if _, err := s.SetRolePermissions(ctx, root, userID, []string{"gateway:use"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.UpdateRole(ctx, keeper, userID, UpdateRoleInput{Description: lt("Gateway only", "只能调网关")}); err != nil {
		t.Fatalf("keeper edits the user role: %v", err)
	}
	_, err := s.ResetRole(ctx, keeper, userID)
	missing, _ := detail(err, "missing").([]string)
	if !isCode(err, "permission_denied") || !slices.Contains(missing, "apikey:self:manage") {
		t.Fatalf("keeper resets the user role: %v (missing %v)", err, detail(err, "missing"))
	}
	if got := rolePermissionKeys(t, s, userID); !slices.Equal(got, []string{"gateway:use"}) {
		t.Fatalf("user role after a refused reset: %v", got)
	}
}

// Decision D2: the super-only permissions are in no built-in role's defaults,
// on a new database or after a reset; a sync neither grants them nor takes
// away what a role already holds; and the super admin, who alone holds them
// by default, is the one to hand them to a role.
func TestSuperOnlyPermissions(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	superOnly := superOnlyKeys()
	holds := func(roleKey string) []string {
		t.Helper()
		var held []string
		for _, k := range rolePermissionKeys(t, s, roleID(t, s, roleKey)) {
			if slices.Contains(superOnly, k) {
				held = append(held, k)
			}
		}
		return held
	}
	for _, b := range builtinRoles {
		if got := holds(b.key); len(got) != 0 {
			t.Errorf("%s holds %v by default", b.key, got)
		}
	}
	for _, k := range superOnly {
		mustCan(t, s, admin, k, false)
		mustCan(t, s, root, k, true)
	}

	// The admin cannot hand them out; the super admin can, to a custom role
	// and, explicitly, to a built-in one.
	if _, err := s.CreateRole(ctx, admin, CreateRoleInput{Key: "updater", Name: lt("Updater", "升级"), PermissionKeys: []string{"system:update:execute"}}); !isCode(err, "permission_denied") {
		t.Fatalf("admin grants a super-only permission: %v", err)
	}
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "updater", Name: lt("Updater", "升级"), PermissionKeys: superOnly}); err != nil {
		t.Fatalf("super admin grants super-only permissions: %v", err)
	}
	if got := holds("updater"); len(got) != len(superOnly) {
		t.Fatalf("updater holds %v", got)
	}
	adminID := roleID(t, s, RoleAdmin)
	cur := rolePermissionKeys(t, s, adminID)
	if _, err := s.SetRolePermissions(ctx, root, adminID, append(cur, "publisher:manage")); err != nil {
		t.Fatal(err)
	}
	mustCan(t, s, admin, "publisher:manage", true)

	// A sync leaves what the role holds; a reset takes it back to defaults.
	if _, err := db.Pool.Exec(ctx, `DELETE FROM permissions WHERE key = 'system:update:recover'`); err != nil {
		t.Fatal(err)
	}
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	if got := holds(RoleAdmin); !slices.Equal(got, []string{"publisher:manage"}) {
		t.Fatalf("admin after a sync that created a super-only permission: %v", got)
	}
	if _, err := s.ResetRole(ctx, root, adminID); err != nil {
		t.Fatal(err)
	}
	if got := holds(RoleAdmin); len(got) != 0 {
		t.Fatalf("admin after a reset: %v", got)
	}
	mustCan(t, s, admin, "publisher:manage", false)
}

// The operator whitelist (decision D3) is what a reset restores; a sync
// leaves an existing operator's permissions as they are, moving audit:read
// to its own module without touching who holds it.
func TestOperatorWhitelist(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	opID := roleID(t, s, RoleOperator)

	// The operator as an older version left it: beyond the whitelist here,
	// short of it there, and audit:read still in the cluster module.
	before := []string{"user:read", "user:delete", "role:define", "balance:adjust", "audit:read", "price:manage"}
	if _, err := s.SetRolePermissions(ctx, root, opID, before); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE permissions SET module = 'node' WHERE key = 'audit:read'`); err != nil {
		t.Fatal(err)
	}
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	slices.Sort(before)
	if got := rolePermissionKeys(t, s, opID); !slices.Equal(got, before) {
		t.Fatalf("a sync changed the operator: %v, want %v", got, before)
	}
	var module string
	if err := db.Pool.QueryRow(ctx, `SELECT module FROM permissions WHERE key = 'audit:read'`).Scan(&module); err != nil || module != "audit" {
		t.Fatalf("audit:read module = %q, %v", module, err)
	}

	r, err := s.ResetRole(ctx, root, opID)
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(r.PermissionKeys, operatorDefaults) {
		t.Fatalf("reset operator = %v\nwant %v", r.PermissionKeys, operatorDefaults)
	}
	// What the role is for, and what it is kept from.
	operator := addUser(t, s, "op@x.com", RoleOperator)
	for key, want := range map[string]bool{
		"account:update": true, "role:assign": true, "audit:read": true, "task:run": true, "account:credential:view:own": true,
		"role:define": false, "balance:adjust": false, "usage:settle": false, "user:delete": false, "user:password:reset": false,
		"account:credential:view": false, "account:relay": false, "system:update:execute": false, "settings:read": false, "plugin:read": false,
	} {
		mustCan(t, s, operator, key, want)
	}
	// It can hand out the supplier role, which its assignable list names.
	plain := addUser(t, s, "plain@x.com", RoleUser)
	if err := setRoles(s, operator, plain, RoleUser, RoleSupplier); err != nil {
		t.Fatalf("operator assigns supplier: %v", err)
	}
	// ...and still act on the supplier afterwards, to take the role back.
	if err := s.CanActOnUser(ctx, operator, core.ActOnIdentity, plain); err != nil {
		t.Fatalf("operator acts on a supplier: %v", err)
	}
	if err := setRoles(s, operator, plain, RoleUser); err != nil {
		t.Fatalf("operator revokes supplier: %v", err)
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
	if err := s.CanActOnUser(ctx, helper, core.ActOnIdentity, victim); !isCode(err, "permission_denied") {
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
		return s.SyncPlugin(ctx, tx, "guard", withRoles([]core.PermissionDef{{Key: "stats:read"}}, RoleAdmin))
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
	// The reset says what the role had and now has.
	var assign string
	if err := db.Pool.QueryRow(ctx, `SELECT detail->'after'->>'assignable_role_keys' FROM audit_logs WHERE action = 'role.reset' AND detail->>'key' = 'operator'
  AND detail->'after'->'permission_keys' ? 'task:run' AND detail->'before'->'permission_keys' ? 'task:run' AND NOT detail ? 'via'`).Scan(&assign); err != nil || assign != `["supplier", "user"]` {
		t.Fatalf("role.reset detail: %q %v", assign, err)
	}
}

// A role's key never changes: PATCH /roles/:id refuses a different key with
// a field error on key (built-in roles included) and ignores the same one.
func TestUpdateRoleKeyImmutable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	r, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "ops", Name: lt("Ops", "运营")})
	if err != nil {
		t.Fatal(err)
	}
	key := func(k string) *string { return &k }

	for _, id := range []int64{r.ID, roleID(t, s, RoleOperator)} {
		_, err := s.UpdateRole(ctx, root, id, UpdateRoleInput{Key: key("renamed"), Name: lt("Renamed", "改名")})
		if !isCode(err, "invalid_argument") || fieldCode(err, "key") != "immutable" {
			t.Fatalf("role %d: different key: %v", id, err)
		}
		if got, _ := s.GetRole(ctx, id); got.Name.Get("en") == "Renamed" {
			t.Fatalf("role %d renamed by a refused update", id)
		}
	}

	// The refusal speaks the request's language.
	_, err = s.UpdateRole(core.WithLocale(ctx, "zh"), root, r.ID, UpdateRoleInput{Key: key("renamed")})
	if !isCode(err, "invalid_argument") || !strings.Contains(err.Error(), "角色标识创建后不可修改") {
		t.Fatalf("zh refusal: %v", err)
	}

	got, err := s.UpdateRole(ctx, root, r.ID, UpdateRoleInput{Key: key("ops"), Name: lt("Ops 2", "运营 2")})
	if err != nil {
		t.Fatalf("same key: %v", err)
	}
	if got.Key != "ops" || got.Name.Get("zh") != "运营 2" {
		t.Fatalf("same key: got %s %v", got.Key, got.Name)
	}
}
