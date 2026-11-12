package authz

import (
	"context"
	"fmt"
	"maps"
	"slices"
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

// A new database seeds the default lists of decision 5 (supplier comes with
// its role): admin assigns operator, user and every custom role; operator
// assigns user; nobody else anything. Seeding is not audited.
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
		{RoleAdmin, []string{"helper", RoleOperator, RoleUser}, true},
		{RoleOperator, []string{RoleUser}, false},
		{RoleUser, []string{}, false},
		{RoleSuperAdmin, []string{}, false},
		{"helper", []string{}, false},
	}
	for _, tt := range tests {
		if keys, custom := assignableOf(t, s, tt.role); !slices.Equal(keys, tt.keys) || custom != tt.custom {
			t.Errorf("%s: assignable %v custom %v, want %v %v", tt.role, keys, custom, tt.keys, tt.custom)
		}
	}
	var audited int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'authz.sync.grant' AND detail->>'via' = 'assignable'`).Scan(&audited); err != nil || audited != 0 {
		t.Fatalf("seeding audited %d rows: %v", audited, err)
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

	err := s.CanActOnUsers(ctx, admin, adminMaker)
	if !isCode(err, "permission_denied") {
		t.Fatalf("admin on an admin assigner: %v", err)
	}
	if got := core.AsError(err).Details["missing_assignable"]; !slices.Equal(got.([]string), []string{RoleAdmin}) {
		t.Fatalf("missing_assignable = %v", got)
	}
	if err := s.CanActOnUsers(ctx, admin, userMaker); err != nil {
		t.Fatalf("admin on a user assigner: %v", err)
	}
	if err := s.CanActOnUsers(ctx, root, adminMaker, userMaker); err != nil {
		t.Fatalf("superuser: %v", err)
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
