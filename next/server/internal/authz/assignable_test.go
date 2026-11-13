package authz

import (
	"context"
	"fmt"
	"maps"
	"slices"
	"strconv"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// letAssign puts roles on roleKey's assignable list, as the database holds
// it, without any check.
func letAssign(t *testing.T, s *Service, roleKey string, roles ...string) {
	t.Helper()
	if _, err := s.db.Pool.Exec(context.Background(), `INSERT INTO role_assignable_roles (role_id, assignable_role_id)
		SELECT r.id, a.id FROM roles r, roles a WHERE r.key = $1 AND a.key = ANY($2)`, roleKey, roles); err != nil {
		t.Fatal(err)
	}
}

// assignableOf is the sorted Assignable of roleKeys in the grant view and
// their assign-custom flag.
func assignableOf(t *testing.T, s *Service, roleKeys ...string) ([]string, bool) {
	t.Helper()
	set, err := s.RolesPermissions(context.Background(), s.db.Pool, roleKeys)
	if err != nil {
		t.Fatal(err)
	}
	return slices.Sorted(maps.Keys(set.Assignable)), set.AssignCustom
}

// A new database seeds the default lists of decision 5: admin assigns
// operator, supplier, user and every custom role; operator assigns supplier
// and user; nobody else anything. Each seeded entry is audited once, as
// part of a role created now (P4F3).
func TestBuiltinAssignableDefaults(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name) VALUES ('helper', '{"en":"x"}')`); err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		role   string
		keys   []string
		custom bool
	}{
		{RoleAdmin, []string{"helper", RoleOperator, RoleSupplier, RoleUser}, true},
		{RoleOperator, []string{RoleSupplier, RoleUser}, false},
		{RoleSupplier, []string{}, false},
		{RoleUser, []string{}, false},
		{RoleSuperAdmin, []string{}, false},
		{"helper", []string{}, false},
	}
	for _, tt := range tests {
		if keys, custom := assignableOf(t, s, tt.role); !slices.Equal(keys, tt.keys) || custom != tt.custom {
			t.Errorf("%s: assignable %v custom %v, want %v %v", tt.role, keys, custom, tt.keys, tt.custom)
		}
	}
	var audited, created int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE detail->>'role_created' = 'true') FROM audit_logs
WHERE action = 'authz.sync.grant' AND user_id IS NULL AND detail->>'via' = 'assignable'`).Scan(&audited, &created); err != nil || audited != 5 || created != 5 {
		t.Fatalf("seeding audited %d rows (%d as created): %v", audited, created, err)
	}
}

// Not parallel: it extends the package's built-in roles while it runs. A
// built-in role created later joins the existing lists naming it, once, and
// each such grant is audited.
func TestSyncCoreAppendsNewBuiltinRole(t *testing.T) {
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()

	saved := builtinRoles
	defer func() { builtinRoles = saved }()
	builtinRoles = slices.Clone(builtinRoles)
	for i, r := range builtinRoles {
		if r.key == RoleAdmin {
			builtinRoles[i].assignable = append(slices.Clone(r.assignable), "probe")
		}
	}
	builtinRoles = append(builtinRoles, builtinRole{key: "probe", name: lt("Probe", "探针"), assignable: []string{RoleUser}})

	for range 2 {
		if err := s.SyncCore(ctx); err != nil {
			t.Fatal(err)
		}
		var audited []int64
		if err := db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(target_id::bigint), '{}') FROM audit_logs
WHERE action = 'authz.sync.grant' AND user_id IS NULL AND detail->>'via' = 'assignable' AND detail->>'key' = 'probe'`).Scan(&audited); err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(audited, []int64{roleID(t, s, RoleAdmin)}) {
			t.Fatalf("audited roles %v, want admin only", audited)
		}
	}
	if keys, _ := assignableOf(t, s, RoleAdmin); !slices.Contains(keys, "probe") {
		t.Fatalf("admin assignable %v", keys)
	}
	if keys, _ := assignableOf(t, s, RoleOperator); slices.Contains(keys, "probe") {
		t.Fatalf("operator assignable %v", keys)
	}
	if keys, custom := assignableOf(t, s, "probe"); !slices.Equal(keys, []string{RoleUser}) || custom {
		t.Fatalf("probe assignable %v custom %v", keys, custom)
	}
}

// An upgrade bringing the supplier role to a database that has the other
// built-in roles: it is created with its defaults and joins the assignable
// lists of admin and operator, each audited once; their other entries (here
// what migration 0097 left on a production operator) stay.
func TestSyncCoreAddsSupplierToExistingRoles(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	// The database before the supplier role existed (and without the audit
	// of the first sync, which created every built-in role).
	if _, err := db.Pool.Exec(ctx, `DELETE FROM roles WHERE key = 'supplier';
DELETE FROM audit_logs;
UPDATE roles SET assign_custom = true WHERE key = 'operator';
INSERT INTO role_assignable_roles (role_id, assignable_role_id) SELECT r.id, r.id FROM roles r WHERE r.key = 'operator'`); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := s.SyncCore(ctx); err != nil {
			t.Fatal(err)
		}
	}
	if keys, custom := assignableOf(t, s, RoleOperator); !slices.Equal(keys, []string{RoleOperator, RoleSupplier, RoleUser}) || !custom {
		t.Fatalf("operator assignable %v custom %v", keys, custom)
	}
	if r, err := s.GetRole(ctx, roleID(t, s, RoleAdmin)); err != nil || !slices.Equal(r.AssignableRoleKeys, []string{RoleOperator, RoleSupplier, RoleUser}) {
		t.Fatalf("admin assignable %+v, %v", r, err)
	}
	if r, err := s.GetRole(ctx, roleID(t, s, RoleSupplier)); err != nil || !r.Builtin || len(r.PermissionKeys) != len(supplierPermissions) {
		t.Fatalf("supplier %+v, %v", r, err)
	}
	var audited []int64
	if err := db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(target_id::bigint ORDER BY target_id::bigint), '{}') FROM audit_logs
WHERE action = 'authz.sync.grant' AND user_id IS NULL AND detail->>'via' = 'assignable' AND detail->>'key' = 'supplier'`).Scan(&audited); err != nil {
		t.Fatal(err)
	}
	want := []int64{roleID(t, s, RoleAdmin), roleID(t, s, RoleOperator)}
	slices.Sort(want)
	if !slices.Equal(audited, want) {
		t.Fatalf("audited roles %v, want admin and operator %v", audited, want)
	}
	// The supplier role's own defaults are audited too, once (P4F3).
	var keys []string
	if err := db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(detail->>'key' ORDER BY detail->>'key'), '{}') FROM audit_logs
WHERE action = 'authz.sync.grant' AND user_id IS NULL AND target_type = 'role' AND target_id = $1
  AND detail->>'via' = 'default' AND detail->>'role_created' = 'true'`, strconv.FormatInt(roleID(t, s, RoleSupplier), 10)).Scan(&keys); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(keys, slices.Sorted(slices.Values(supplierPermissions))) {
		t.Fatalf("supplier grants audited %v, want %v", keys, supplierPermissions)
	}
}

// The target's side of SEC-H2 includes the roles it may assign: admin, who
// cannot assign admin, cannot act on a holder of a custom role that can.
func TestCanActOnUsersComparesAssignable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name) VALUES ('admin_maker', '{"en":"x"}'), ('user_maker', '{"en":"x"}');
INSERT INTO role_assignable_roles (role_id, assignable_role_id)
SELECT r.id, a.id FROM roles r JOIN roles a ON (r.key, a.key) IN (('admin_maker', 'admin'), ('user_maker', 'user'))`); err != nil {
		t.Fatal(err)
	}
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	adminMaker := addUser(t, s, "am@x.com", "admin_maker")
	userMaker := addUser(t, s, "um@x.com", "user_maker")

	err := s.CanActOnUsers(ctx, admin, core.ActOnIdentity, adminMaker)
	if !isCode(err, "permission_denied") {
		t.Fatalf("admin on an admin assigner: %v", err)
	}
	if got := core.AsError(err).Details["missing_assignable"]; !slices.Equal(got.([]string), []string{RoleAdmin}) {
		t.Fatalf("missing_assignable = %v", got)
	}
	if err := s.CanActOnUsers(ctx, admin, core.ActOnIdentity, userMaker); err != nil {
		t.Fatalf("admin on a user assigner: %v", err)
	}
	if err := s.CanActOnUsers(ctx, root, core.ActOnIdentity, adminMaker, userMaker); err != nil {
		t.Fatalf("superuser: %v", err)
	}
}

// Peer protection: every role a target holds, the default user role aside,
// must be one the actor may assign. With the default lists an admin leaves
// other admins alone and an operator other operators; a role with no
// assignable list still acts on plain users.
func TestCanActOnUsersPeerProtection(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	for _, key := range []string{"support", "viewer"} {
		if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: key, Name: lt(key, key), PermissionKeys: []string{"user:read", "user:update"}}); err != nil {
			t.Fatal(err)
		}
	}
	admin := addUser(t, s, "admin@x.com", RoleUser, RoleAdmin)
	admin2 := addUser(t, s, "admin2@x.com", RoleUser, RoleAdmin)
	operator := addUser(t, s, "op@x.com", RoleOperator)
	operator2 := addUser(t, s, "op2@x.com", RoleUser, RoleOperator)
	support := addUser(t, s, "support@x.com", RoleUser, "support")
	viewer := addUser(t, s, "viewer@x.com", "viewer")
	plain := addUser(t, s, "plain@x.com", RoleUser)
	roleless := addUser(t, s, "none@x.com")

	tests := []struct {
		name    string
		actor   int64
		targets []int64
		role    string // "" = allowed, else details.role of the denial
	}{
		{"admin on another admin", admin, []int64{admin2}, RoleAdmin},
		{"admin on an operator, a custom role holder and users", admin, []int64{operator, support, plain, roleless}, ""},
		{"one peer rejects the batch", admin, []int64{plain, admin2}, RoleAdmin},
		{"operator on another operator", operator, []int64{operator2}, RoleOperator},
		{"operator on a custom role holder", operator, []int64{viewer}, "viewer"},
		{"operator on users", operator, []int64{plain, roleless}, ""},
		{"no assignable list: users only", support, []int64{plain, roleless}, ""},
		{"no assignable list: not a holder of the same role", support, []int64{viewer}, "viewer"},
		// FU6: oneself by the same rule; admin is not on admin's list.
		{"itself", admin, []int64{admin}, RoleAdmin},
		{"super admin itself", root, []int64{root, admin}, ""},
		{"super admin", root, []int64{admin, admin2, operator, viewer}, ""},
		{"system", 0, []int64{admin, operator}, ""},
	}
	for _, tt := range tests {
		err := s.CanActOnUsers(ctx, tt.actor, core.ActOnData, tt.targets...)
		switch {
		case tt.role == "" && err != nil:
			t.Errorf("%s: %v", tt.name, err)
		case tt.role != "" && (!isCode(err, "permission_denied") || detail(err, "role") != tt.role):
			t.Errorf("%s: %v, want a denial naming %s", tt.name, err, tt.role)
		}
	}

	// Role assignment judges the target the same way: the admin may assign
	// operator, but not to another admin.
	if err := setRoles(s, admin, admin2, RoleUser, RoleAdmin, RoleOperator); !isCode(err, "permission_denied") || detail(err, "role") != RoleAdmin {
		t.Fatalf("admin assigns operator to another admin: %v", err)
	}
	if err := setRoles(s, admin, plain, RoleUser, RoleOperator); err != nil {
		t.Fatalf("admin assigns operator to a user: %v", err)
	}
	// FU6: an access key narrows what its owner may do, not whom: the
	// admin's key reaches whom the admin manages, and no other admin.
	keyed := core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: admin, Permissions: []string{"user:read", "user:update"}})
	if err := s.CanActOnUsers(keyed, admin, core.ActOnIdentity, viewer); err != nil {
		t.Fatalf("admin's access key on a custom role holder: %v", err)
	}
	if err := s.CanActOnUsers(keyed, admin, core.ActOnData, admin2); !isCode(err, "permission_denied") || detail(err, "role") != RoleAdmin {
		t.Fatalf("admin's access key on another admin: %v", err)
	}
	// The super admin's key: data of its owner yes, its account only with a
	// step-up proof (期 4 S3; no verifier here, so none).
	rootKey := core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: root, Permissions: []string{"user:read", "user:update", "balance:adjust"}})
	if err := s.CanActOnUsers(rootKey, root, core.ActOnData, root, admin); err != nil {
		t.Fatalf("super admin's key on its own data: %v", err)
	}
	if err := s.CanActOnUsers(rootKey, root, core.ActOnIdentity, root); !isCode(err, "verification_required") || detail(err, "scope") != core.StepUpSuperAdminIdentity {
		t.Fatalf("super admin's key on its own account: %v", err)
	}
	if err := s.CanActOnUsers(rootKey, root, core.ActOnIdentity, admin); err != nil {
		t.Fatalf("super admin's key on an admin's account: %v", err)
	}
	// An admin's key on the super admin's account: not managed, whatever
	// the session would say.
	if err := s.CanActOnUsers(keyed, admin, core.ActOnIdentity, root); !isCode(err, "permission_denied") || detail(err, "reason") != "not_manageable" {
		t.Fatalf("admin's access key on the super admin's account: %v", err)
	}
	if err := s.CanActOnUsers(keyed, admin, core.ActOnIdentity, roleless); err != nil {
		t.Fatalf("admin's access key on a user: %v", err)
	}
}

// detail is the details[key] of a core error.
func detail(err error, key string) any {
	if e := core.AsError(err); e != nil {
		return e.Details[key]
	}
	return nil
}

// Assigning a role, or revoking one, needs it on the actor's assignable
// list and everything it carries within the actor's own (decision 4).
func TestAssignmentRules(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	operator := addUser(t, s, "op@x.com", RoleOperator)
	alice := addUser(t, s, "alice@x.com", RoleUser)
	bob := addUser(t, s, "bob@x.com")

	// The operator assigns user, not admin, and revokes nothing else either.
	if err := setRoles(s, operator, bob, RoleUser); err != nil {
		t.Fatalf("operator assigns user: %v", err)
	}
	if err := setRoles(s, operator, bob, RoleUser, RoleAdmin); !isCode(err, "permission_denied") || detail(err, "role") != RoleAdmin {
		t.Fatalf("operator assigns admin: %v", err)
	}
	if err := setRoles(s, operator, admin, RoleUser); !isCode(err, "permission_denied") || detail(err, "role") != RoleAdmin {
		t.Fatalf("operator revokes admin: %v", err)
	}

	// On the list but beyond the operator's permissions.
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "installer", Name: lt("Installer", "安装"),
		PermissionKeys: []string{"plugin:install"}}); err != nil {
		t.Fatal(err)
	}
	letAssign(t, s, RoleOperator, "installer")
	if err := setRoles(s, operator, alice, RoleUser, "installer"); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing").([]string), []string{"plugin:install"}) {
		t.Fatalf("operator assigns installer: %v", err)
	}

	// A custom role that may assign admin is beyond the admin, who may
	// assign every custom role but not admin.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name) VALUES ('admin_maker', '{"en":"x"}')`); err != nil {
		t.Fatal(err)
	}
	letAssign(t, s, "admin_maker", RoleAdmin)
	if err := setRoles(s, admin, alice, RoleUser, "admin_maker"); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing_assignable").([]string), []string{RoleAdmin}) {
		t.Fatalf("admin assigns admin_maker: %v", err)
	}

	// An access key assigns nothing, role:assign or not.
	keyed := core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: admin, Permissions: []string{"role:assign", "user:read"}})
	if err := setRolesAs(keyed, s, admin, alice, RoleUser, RoleOperator); !isCode(err, "permission_denied") {
		t.Fatalf("access key assigns operator: %v", err)
	}

	// The default role for a user without any needs no list, only the
	// permissions it carries: user:create plus those creates the user.
	user, err := s.RolesPermissions(ctx, db.Pool, []string{RoleUser})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "creator", Name: lt("Creator", "创建"),
		PermissionKeys: append(slices.Collect(maps.Keys(user.Keys)), "user:create")}); err != nil {
		t.Fatal(err)
	}
	creator := addUser(t, s, "creator@x.com", "creator")
	carol := addUser(t, s, "carol@x.com")
	if err := setRoles(s, creator, carol, RoleUser); err != nil {
		t.Fatalf("creator assigns the default role: %v", err)
	}
	if err := setRoles(s, creator, carol); !isCode(err, "permission_denied") {
		t.Fatalf("creator revokes the default role: %v", err)
	}

	// A change is audited once, with what it added and removed; a no-op is not.
	if err := setRoles(s, admin, alice, RoleOperator); err != nil {
		t.Fatal(err)
	}
	if err := setRoles(s, admin, alice, RoleOperator); err != nil {
		t.Fatal(err)
	}
	var details []string
	if err := db.Pool.QueryRow(ctx, `SELECT COALESCE(array_agg(detail::text), '{}') FROM audit_logs
WHERE action = 'user.roles' AND user_id = $1 AND target_type = 'user' AND target_id = $2`, admin, fmt.Sprint(alice)).Scan(&details); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(details, []string{`{"added": ["operator"], "removed": ["user"]}`}) {
		t.Fatalf("audit = %v", details)
	}
}

// Deleting a role with holders revokes it from them, so the actor must be
// able to assign it; a role without holders only needs editableRole.
func TestDeleteRoleRevokes(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	for _, key := range []string{"held", "unheld"} {
		if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: key, Name: lt("x", "x"), PermissionKeys: []string{"user:read"}}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "definer", Name: lt("Definer", "定义"),
		PermissionKeys: []string{"role:define", "user:read"}}); err != nil {
		t.Fatal(err)
	}
	definer := addUser(t, s, "definer@x.com", "definer")
	addUser(t, s, "holder@x.com", "held")

	if err := s.DeleteRole(ctx, definer, roleID(t, s, "held")); !isCode(err, "permission_denied") || detail(err, "role") != "held" {
		t.Fatalf("definer deletes a held role: %v", err)
	}
	if err := s.DeleteRole(ctx, definer, roleID(t, s, "unheld")); err != nil {
		t.Fatalf("definer deletes an unheld role: %v", err)
	}
	letAssign(t, s, "definer", "held")
	if err := s.DeleteRole(ctx, definer, roleID(t, s, "held")); err != nil {
		t.Fatalf("definer deletes a role it may assign: %v", err)
	}
}

// PUT /roles/:id/assignable: the super admin role is frozen, keys must exist
// and not name it, and the actor must be able to assign what is added.
func TestSetRoleAssignable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	for _, key := range []string{"definer", "team"} {
		if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: key, Name: lt(key, key),
			PermissionKeys: []string{"role:define", "user:read"}}); err != nil {
			t.Fatal(err)
		}
	}
	letAssign(t, s, "definer", RoleUser)
	definer := addUser(t, s, "definer@x.com", "definer")
	teamID := roleID(t, s, "team")
	set := func(actor, id int64, custom bool, keys ...string) (*Role, error) {
		return s.SetRoleAssignable(ctx, actor, id, AssignableInput{RoleKeys: keys, AssignCustom: custom})
	}

	r, err := set(root, teamID, false, RoleUser, RoleOperator, RoleUser)
	if err != nil || !slices.Equal(r.AssignableRoleKeys, []string{RoleOperator, RoleUser}) || r.AssignCustom {
		t.Fatalf("root sets team: %+v %v", r, err)
	}
	var audited string
	if err := db.Pool.QueryRow(ctx, `SELECT detail::text FROM audit_logs WHERE action = 'role.assignable' AND user_id = $1 AND target_id = $2`,
		root, fmt.Sprint(teamID)).Scan(&audited); err != nil || audited != `{"added": ["operator", "user"], "role_keys": ["operator", "user"], "assign_custom": false}` {
		t.Fatalf("audit %s: %v", audited, err)
	}

	if _, err := set(root, roleID(t, s, RoleSuperAdmin), false, RoleUser); !isCode(err, "conflict") {
		t.Fatalf("super_admin role: %v", err)
	}
	for _, keys := range [][]string{{RoleUser, RoleSuperAdmin}, {"nobody"}} {
		if _, err := set(root, teamID, false, keys...); !isCode(err, "invalid_argument") {
			t.Fatalf("list %v: %v", keys, err)
		}
	}

	// The definer assigns user only: it may keep or drop what team has
	// within it, never add operator or every custom role.
	if _, err := set(root, teamID, false, RoleUser); err != nil {
		t.Fatal(err)
	}
	if _, err := set(definer, teamID, false, RoleUser, RoleOperator); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing_assignable").([]string), []string{RoleOperator}) {
		t.Fatalf("definer adds operator: %v", err)
	}
	if _, err := set(definer, teamID, true, RoleUser); !isCode(err, "permission_denied") || detail(err, "missing_assign_custom") != true {
		t.Fatalf("definer adds every custom role: %v", err)
	}
	if r, err := set(definer, teamID, false); err != nil || len(r.AssignableRoleKeys) != 0 {
		t.Fatalf("definer drops user: %+v %v", r, err)
	}
	if _, err := set(definer, roleID(t, s, RoleAdmin), false); !isCode(err, "permission_denied") {
		t.Fatalf("definer edits admin: %v", err)
	}

	// The admin assigns every custom role but not admin.
	if _, err := set(admin, teamID, true, RoleAdmin); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing_assignable").([]string), []string{RoleAdmin}) {
		t.Fatalf("admin adds admin: %v", err)
	}
	if r, err := set(admin, teamID, true, RoleOperator); err != nil || !r.AssignCustom {
		t.Fatalf("admin sets team: %+v %v", r, err)
	}
	// The wildcard leaves out team itself (§43.6).
	if keys, custom := assignableOf(t, s, "team"); !slices.Equal(keys, []string{"definer", RoleOperator}) || !custom {
		t.Fatalf("team grants %v custom %v", keys, custom)
	}
}

// POST /roles takes the assignable list under the same rule.
func TestCreateRoleAssignable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	create := func(key string, custom bool, keys ...string) (*Role, error) {
		return s.CreateRole(ctx, admin, CreateRoleInput{Key: key, Name: lt(key, key),
			PermissionKeys: []string{"user:read"}, AssignableRoleKeys: keys, AssignCustom: custom})
	}
	if _, err := create("admin_maker", false, RoleAdmin); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing_assignable").([]string), []string{RoleAdmin}) {
		t.Fatalf("admin creates an admin assigner: %v", err)
	}
	if _, err := create("root_maker", false, RoleSuperAdmin); !isCode(err, "invalid_argument") {
		t.Fatalf("admin creates a super admin assigner: %v", err)
	}
	r, err := create("lead", true, RoleUser, RoleOperator)
	if err != nil || !slices.Equal(r.AssignableRoleKeys, []string{RoleOperator, RoleUser}) || !r.AssignCustom {
		t.Fatalf("admin creates lead: %+v %v", r, err)
	}
}

// GET /me/assignable-roles lists the caller's assignable roles with whether
// it may grant each; an access key assigns nothing.
func TestAssignableRoles(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name) VALUES ('admin_maker', '{"en":"x"}')`); err != nil {
		t.Fatal(err)
	}
	letAssign(t, s, "admin_maker", RoleAdmin)
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	admin := addUser(t, s, "admin@x.com", RoleAdmin)
	operator := addUser(t, s, "op@x.com", RoleOperator)

	type row struct {
		key       string
		grantable bool
	}
	rowsOf := func(ctx context.Context, actor int64) []row {
		t.Helper()
		roles, err := s.AssignableRoles(ctx, actor)
		if err != nil {
			t.Fatal(err)
		}
		out := []row{}
		for _, r := range roles {
			out = append(out, row{r.Key, r.Grantable})
		}
		return out
	}
	tests := []struct {
		name  string
		ctx   context.Context
		actor int64
		want  []row
	}{
		{"root", ctx, root, []row{{RoleAdmin, true}, {RoleOperator, true}, {RoleSupplier, true}, {RoleUser, true}, {"admin_maker", true}}},
		{"admin", ctx, admin, []row{{RoleOperator, true}, {RoleSupplier, true}, {RoleUser, true}, {"admin_maker", false}}},
		{"operator", ctx, operator, []row{{RoleSupplier, true}, {RoleUser, true}}},
		{"admin key", core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: admin, Permissions: []string{"role:assign", "user:read"}}), admin, []row{}},
		{"root key", core.WithAccessKey(ctx, core.AccessKeyIdentity{UserID: root, Permissions: []string{"user:read"}}), root, []row{}},
	}
	for _, tt := range tests {
		if got := rowsOf(tt.ctx, tt.actor); !slices.Equal(got, tt.want) {
			t.Errorf("%s: %v, want %v", tt.name, got, tt.want)
		}
	}

	roles, err := s.AssignableRoles(ctx, admin)
	if err != nil {
		t.Fatal(err)
	}
	maker := roles[len(roles)-1]
	if !slices.Equal(maker.MissingAssignable, []string{RoleAdmin}) || len(maker.Missing) != 0 || maker.MissingAssignCustom {
		t.Fatalf("admin_maker for admin: %+v", maker)
	}
}

// A reset restores the default assignable list too.
func TestResetRoleAssignable(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	for _, role := range []string{RoleAdmin, RoleOperator, RoleSupplier, RoleUser} {
		id := roleID(t, s, role)
		if _, err := s.SetRoleAssignable(ctx, root, id, AssignableInput{RoleKeys: []string{RoleAdmin}, AssignCustom: true}); err != nil {
			t.Fatal(err)
		}
		def, _ := builtinRoleByKey(role)
		r, err := s.ResetRole(ctx, root, id)
		if err != nil {
			t.Fatal(err)
		}
		want := slices.Sorted(slices.Values(def.assignable))
		if !slices.Equal(r.AssignableRoleKeys, want) || r.AssignCustom != def.assignCustom {
			t.Errorf("%s reset to %v custom %v, want %v %v", role, r.AssignableRoleKeys, r.AssignCustom, want, def.assignCustom)
		}
	}
}

// "Every custom role" (assign_custom) never covers a role its holder holds
// (§43.6): a lead with balance:adjust + assign_custom manages the holders of
// other custom roles, not itself or other leads, and cannot hand out, by
// assignment or through a role it defines, what would. A role named on the
// list counts as listed. The super admin is unaffected.
func TestAssignCustomExcludesOwnRole(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	perms := []string{"user:read", "user:update", "balance:adjust", "role:define", "role:assign"}
	lead, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "lead", Name: lt("lead", "lead"), PermissionKeys: perms, AssignCustom: true})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "staff", Name: lt("staff", "staff"), PermissionKeys: []string{"user:read"}}); err != nil {
		t.Fatal(err)
	}
	lead1 := addUser(t, s, "lead1@x.com", RoleUser, "lead")
	lead2 := addUser(t, s, "lead2@x.com", RoleUser, "lead")
	staff := addUser(t, s, "staff@x.com", RoleUser, "staff")
	plain := addUser(t, s, "plain@x.com", RoleUser)

	if got, custom := assignableOf(t, s, "lead"); !slices.Equal(got, []string{"staff"}) || !custom {
		t.Fatalf("lead assigns %v custom %v, want [staff] true", got, custom)
	}
	for _, target := range []int64{lead1, lead2} {
		if err := s.CanActOnUsers(ctx, lead1, core.ActOnData, target); !isCode(err, "permission_denied") || detail(err, "role") != "lead" {
			t.Fatalf("lead on lead %d: %v", target, err)
		}
	}
	if err := s.CanActOnUsers(ctx, lead1, core.ActOnData, staff, plain); err != nil {
		t.Fatalf("lead on a staff holder and a user: %v", err)
	}
	if err := s.CanActOnUsers(ctx, root, core.ActOnData, root, lead1, lead2); err != nil {
		t.Fatalf("super admin: %v", err)
	}
	if err := setRoles(s, lead1, plain, RoleUser, "lead"); !isCode(err, "permission_denied") || detail(err, "role") != "lead" {
		t.Fatalf("lead assigns lead: %v", err)
	}
	if err := setRoles(s, lead1, plain, RoleUser, "staff"); err != nil {
		t.Fatalf("lead assigns staff: %v", err)
	}
	// A wildcard handed out through a new role or the lead's own list
	// would cover lead: refused, whatever the flag the lead holds.
	_, err = s.CreateRole(ctx, lead1, CreateRoleInput{Key: "deputy", Name: lt("deputy", "deputy"), PermissionKeys: []string{"user:read"}, AssignCustom: true})
	if !isCode(err, "permission_denied") || !slices.Equal(detail(err, "missing_assignable").([]string), []string{"lead"}) {
		t.Fatalf("lead creates a role with assign_custom: %v", err)
	}
	if _, err := s.SetRoleAssignable(ctx, lead1, lead.ID, AssignableInput{RoleKeys: []string{"lead"}, AssignCustom: true}); !isCode(err, "permission_denied") {
		t.Fatalf("lead lists itself: %v", err)
	}
	// A holder of another wildcard role can assign lead, which the lead
	// cannot: not managed either.
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "coach", Name: lt("coach", "coach"), PermissionKeys: []string{"user:read"}, AssignCustom: true}); err != nil {
		t.Fatal(err)
	}
	coach := addUser(t, s, "coach@x.com", RoleUser, "coach")
	if err := s.CanActOnUsers(ctx, lead1, core.ActOnData, coach); !isCode(err, "permission_denied") ||
		!slices.Equal(detail(err, "missing_assignable").([]string), []string{"lead"}) {
		t.Fatalf("lead on a coach: %v", err)
	}

	// Listed by name, lead manages leads, itself included, and assigns lead.
	if _, err := s.SetRoleAssignable(ctx, root, lead.ID, AssignableInput{RoleKeys: []string{"lead"}, AssignCustom: true}); err != nil {
		t.Fatal(err)
	}
	if got, _ := assignableOf(t, s, "lead"); !slices.Equal(got, []string{"coach", "lead", "staff"}) {
		t.Fatalf("lead listing itself assigns %v", got)
	}
	if err := s.CanActOnUsers(ctx, lead1, core.ActOnData, lead1, lead2, staff, coach); err != nil {
		t.Fatalf("lead listing itself on leads: %v", err)
	}
	if err := setRoles(s, lead1, plain, RoleUser, "lead"); err != nil {
		t.Fatalf("lead listing itself assigns lead: %v", err)
	}
}
