package authz

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// The roles a plugin permission may name in defaultRoles are exactly the
// built-in roles but the super admin.
func TestManifestBuiltinRoleKeysMatchBuiltinRoles(t *testing.T) {
	var keys []string
	for _, r := range builtinRoles {
		if !r.superuser {
			keys = append(keys, r.key)
		}
	}
	slices.Sort(keys)
	want := slices.Sorted(slices.Values(manifest.BuiltinRoleKeys))
	if !slices.Equal(keys, want) {
		t.Fatalf("built-in roles %v, manifest.BuiltinRoleKeys %v", keys, want)
	}
}

func permissionHolders(t *testing.T, db *store.DB, key string) []string {
	t.Helper()
	var roles []string
	if err := db.Pool.QueryRow(context.Background(), `
SELECT COALESCE(array_agg(r.key ORDER BY r.key), '{}') FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE p.key = $1`, key).Scan(&roles); err != nil {
		t.Fatal(err)
	}
	return roles
}

func syncGrantAudits(t *testing.T, db *store.DB, key, via string) int {
	t.Helper()
	var n int
	if err := db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs
WHERE action = 'authz.sync.grant' AND target_type = 'role' AND user_id IS NULL AND detail->>'key' = $1 AND detail->>'via' = $2`, key, via).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// A permission the catalog creates goes to its GrantRoles (never a super
// admin role) and to the holders of its InheritFrom keys, each grant
// audited; a rename inherits before the old key is deleted, and an
// existing permission keeps its grants.
func TestSyncPluginGrantRolesAndInheritFrom(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('guard', '{"en":"Guard"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	sync := func(defs ...core.PermissionDef) {
		t.Helper()
		if err := db.Tx(ctx, func(tx pgx.Tx) error { return s.SyncPlugin(ctx, tx, "guard", defs) }); err != nil {
			t.Fatal(err)
		}
	}
	const read, view, manage = "plugin.guard:stats:read", "plugin.guard:stats:view", "plugin.guard:rules:manage"
	sync(core.PermissionDef{Key: "stats:read", GrantRoles: []string{RoleAdmin, RoleSuperAdmin, RoleOperator, RoleOperator}},
		core.PermissionDef{Key: "rules:manage"})
	if got := permissionHolders(t, db, read); !slices.Equal(got, []string{RoleAdmin, RoleOperator}) {
		t.Fatalf("holders of %s: %v", read, got)
	}
	if got := permissionHolders(t, db, manage); len(got) != 0 {
		t.Fatalf("holders of %s: %v", manage, got)
	}
	if n := syncGrantAudits(t, db, read, "default"); n != 2 {
		t.Fatalf("default grant audits: %d", n)
	}

	// stats:read is renamed stats:view, which also goes to the user role.
	sync(core.PermissionDef{Key: "stats:view", GrantRoles: []string{RoleUser}, InheritFrom: []string{"stats:read"}},
		core.PermissionDef{Key: "rules:manage", GrantRoles: []string{RoleAdmin}})
	if got := permissionHolders(t, db, view); !slices.Equal(got, []string{RoleAdmin, RoleOperator, RoleUser}) {
		t.Fatalf("holders of %s: %v", view, got)
	}
	if got := permissionHolders(t, db, manage); len(got) != 0 {
		t.Fatalf("existing %s widened: %v", manage, got)
	}
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM permissions WHERE key = $1`, read).Scan(&n); err != nil || n != 0 {
		t.Fatalf("old key kept: %d %v", n, err)
	}
	if n := syncGrantAudits(t, db, view, "inherit"); n != 2 {
		t.Fatalf("inherit grant audits: %d", n)
	}
	if n := syncGrantAudits(t, db, view, "default"); n != 1 {
		t.Fatalf("default grant audits of %s: %d", view, n)
	}
	var from []string
	if err := db.Pool.QueryRow(ctx, `SELECT ARRAY(SELECT jsonb_array_elements_text(detail->'from')) FROM audit_logs
WHERE action = 'authz.sync.grant' AND detail->>'key' = $1 AND detail->>'via' = 'inherit' LIMIT 1`, view).Scan(&from); err != nil || !slices.Equal(from, []string{read}) {
		t.Fatalf("inherit audit from %v %v", from, err)
	}
}

// Only grants that exist before the sync are inherited: on a first install a
// key inheriting from another new key gets none of its defaults, and a chain
// through a key created in the same sync is not followed (manifest
// InheritFrom; moderation:exempt from moderation:read).
func TestSyncPluginInheritsOnlyEarlierGrants(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ('mod', '{"en":"Mod"}', 'enabled')`); err != nil {
		t.Fatal(err)
	}
	sync := func(defs ...core.PermissionDef) {
		t.Helper()
		if err := db.Tx(ctx, func(tx pgx.Tx) error { return s.SyncPlugin(ctx, tx, "mod", defs) }); err != nil {
			t.Fatal(err)
		}
	}
	const read, exempt, chained = "plugin.mod:read", "plugin.mod:exempt", "plugin.mod:chained"
	// exempt is listed before and chained after what they inherit from, so
	// neither the order nor the defaults written now matter.
	sync(core.PermissionDef{Key: "exempt", GrantRoles: []string{}, InheritFrom: []string{"read"}},
		core.PermissionDef{Key: "read", GrantRoles: []string{RoleAdmin}},
		core.PermissionDef{Key: "chained", GrantRoles: []string{}, InheritFrom: []string{"exempt"}})
	if got := permissionHolders(t, db, read); !slices.Equal(got, []string{RoleAdmin}) {
		t.Fatalf("holders of %s: %v", read, got)
	}
	for _, key := range []string{exempt, chained} {
		if got := permissionHolders(t, db, key); len(got) != 0 {
			t.Fatalf("holders of %s on a first install: %v", key, got)
		}
	}
	// An upgrade adding a key that inherits from an existing one does
	// inherit its holders.
	sync(core.PermissionDef{Key: "exempt", GrantRoles: []string{}, InheritFrom: []string{"read"}},
		core.PermissionDef{Key: "read", GrantRoles: []string{RoleAdmin}},
		core.PermissionDef{Key: "chained", GrantRoles: []string{}, InheritFrom: []string{"exempt"}},
		core.PermissionDef{Key: "later", GrantRoles: []string{}, InheritFrom: []string{"read"}})
	if got := permissionHolders(t, db, "plugin.mod:later"); !slices.Equal(got, []string{RoleAdmin}) {
		t.Fatalf("holders of a key added later: %v", got)
	}
}

// Handing new plugin permissions to a role is a change of that role
// (editableRole) on the actor's assignable list (T59): a custom role within
// the actor and on its list only, never one it holds itself (wildcard or
// listed by name) unless it is the super admin, built-in roles
// the super admin alone, super admin roles never; unknown roles are invalid.
func TestCanGrantToRoles(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	ops := addUser(t, s, "ops@x.com", RoleOperator)
	installerPerms := []string{"user:read", "role:define", "plugin:install"}
	for _, in := range []CreateRoleInput{
		{Key: "small", PermissionKeys: []string{"user:read"}},
		{Key: "other", PermissionKeys: []string{"user:read"}},
		{Key: "big", PermissionKeys: append([]string{"user:update"}, installerPerms...)},
		// installer may assign small, big and the built-in user role;
		// crew may assign every custom role but its own.
		{Key: "installer", PermissionKeys: installerPerms, AssignableRoleKeys: []string{"small", "big", RoleUser}},
		{Key: "crew", PermissionKeys: installerPerms, AssignCustom: true},
		// lead's list names lead; pair's names held, which pair holds too.
		{Key: "lead", PermissionKeys: installerPerms},
		{Key: "held", PermissionKeys: []string{"user:read"}},
		{Key: "pair", PermissionKeys: installerPerms, AssignableRoleKeys: []string{"held"}},
	} {
		in.Name = lt(in.Key, in.Key)
		r, err := s.CreateRole(ctx, root, in)
		if err != nil {
			t.Fatal(err)
		}
		if in.Key == "lead" {
			if _, err := s.SetRoleAssignable(ctx, root, r.ID, AssignableInput{RoleKeys: []string{"lead"}}); err != nil {
				t.Fatal(err)
			}
		}
	}
	installer := addUser(t, s, "installer@x.com", "installer")
	crew := addUser(t, s, "crew@x.com", "crew")
	lead := addUser(t, s, "lead@x.com", "lead")
	pair := addUser(t, s, "pair@x.com", "pair", "held")
	if err := db.Tx(ctx, func(tx pgx.Tx) error {
		_, err := s.SetUserRoles(ctx, tx, 0, root, []string{RoleSuperAdmin, "small"})
		return err
	}); err != nil {
		t.Fatal(err)
	}
	can := func(actor int64, roles ...string) string {
		t.Helper()
		var code string
		_ = db.Tx(ctx, func(tx pgx.Tx) error {
			if err := s.CanGrantToRoles(ctx, tx, actor, roles); err != nil {
				code = core.AsError(err).Code
			}
			return nil
		})
		return code
	}
	for _, c := range []struct {
		name  string
		actor int64
		roles []string
		want  string
	}{
		{"custom within and assignable", installer, []string{"small", "small"}, ""},
		{"custom not assignable", installer, []string{"small", "other"}, "permission_denied"},
		{"custom wider", installer, []string{"small", "big"}, "permission_denied"},
		{"built-in assignable", installer, []string{RoleUser}, "permission_denied"},
		{"own role", installer, []string{"installer"}, "permission_denied"},
		{"every custom role but its own", crew, []string{"small", "other"}, ""},
		{"own role under every custom role", crew, []string{"crew"}, "permission_denied"},
		{"own role listed by name", lead, []string{"lead"}, "permission_denied"},
		{"another held role listed by name", pair, []string{"held"}, "permission_denied"},
		{"custom without assignable list", ops, []string{"small"}, "permission_denied"},
		{"built-in", ops, []string{RoleUser}, "permission_denied"},
		{"super admin role", ops, []string{RoleSuperAdmin}, "permission_denied"},
		{"unknown", ops, []string{"nope"}, "invalid_argument"},
		{"none", ops, nil, ""},
		{"super admin on built-in and custom", root, []string{RoleAdmin, RoleUser, "big", "installer", "crew"}, ""},
		{"super admin on a role it also holds", root, []string{"small"}, ""},
		{"super admin on super admin role", root, []string{RoleSuperAdmin}, "permission_denied"},
	} {
		if got := can(c.actor, c.roles...); got != c.want {
			t.Errorf("%s: %q, want %q", c.name, got, c.want)
		}
	}
}

// Syncing the real growth and moderation manifests over their old keys:
// holders of growth:read get growth:use, of growth:manage growth:stats:read,
// of moderation:read moderation:exempt (T60).
func TestSyncPluginSplitsGrowthAndModeration(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	root := addUser(t, s, "root@x.com", RoleSuperAdmin)
	if _, err := s.CreateRole(ctx, root, CreateRoleInput{Key: "moderator", Name: lt("Moderator", "审核员"), PermissionKeys: []string{"user:read"}}); err != nil {
		t.Fatal(err)
	}
	sync := func(key string, defs []core.PermissionDef) {
		t.Helper()
		if err := db.Tx(ctx, func(tx pgx.Tx) error { return s.SyncPlugin(ctx, tx, key, defs) }); err != nil {
			t.Fatal(err)
		}
	}
	load := func(key string) *manifest.Manifest {
		t.Helper()
		raw, err := os.ReadFile(filepath.Join("..", "..", "..", "plugins", key, "manifest.json"))
		if err != nil {
			t.Fatal(err)
		}
		var m manifest.Manifest
		if err := json.Unmarshal(raw, &m); err != nil {
			t.Fatal(err)
		}
		return &m
	}
	for _, key := range []string{"growth", "moderation"} {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'enabled')`, key); err != nil {
			t.Fatal(err)
		}
	}
	sync("growth", []core.PermissionDef{{Key: "growth:read", GrantRoles: []string{RoleUser, RoleAdmin}}, {Key: "growth:manage", GrantRoles: []string{RoleAdmin}}})
	sync("moderation", []core.PermissionDef{{Key: "moderation:read", GrantRoles: []string{RoleAdmin, "moderator"}}, {Key: "moderation:manage", GrantRoles: []string{RoleAdmin}}})

	// Without the manifest defaults only inheritance hands the new keys out.
	sync("growth", install.PermissionDefs(load("growth"), nil))
	sync("moderation", install.PermissionDefs(load("moderation"), nil))
	for key, want := range map[string][]string{
		"plugin.growth:growth:use":            {RoleAdmin, RoleUser},
		"plugin.growth:growth:stats:read":     {RoleAdmin},
		"plugin.growth:growth:read":           nil,
		"plugin.growth:growth:manage":         nil,
		"plugin.moderation:moderation:exempt": {RoleAdmin, "moderator"},
		"plugin.moderation:moderation:read":   {RoleAdmin, "moderator"},
	} {
		if got := permissionHolders(t, db, key); !slices.Equal(got, want) {
			t.Errorf("holders of %s: %v, want %v", key, got, want)
		}
	}
}
