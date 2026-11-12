package authz

import (
	"context"
	"maps"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

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
