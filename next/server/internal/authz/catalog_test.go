package authz

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestKeyAllowed(t *testing.T) {
	t.Parallel()
	for key, want := range map[string]bool{"plugin.x:y": false, "user:read": true, "unknown:key": true} {
		if got := KeyAllowed(key); got != want {
			t.Fatalf("KeyAllowed(%q) = %v, want %v", key, got, want)
		}
	}
}

// Catalog invariants: a session-only permission is one worth flagging, and a
// super-only one reaches no built-in role by default.
func TestCatalogFlagInvariants(t *testing.T) {
	t.Parallel()
	for _, m := range coreModules {
		for _, p := range m.perms {
			if p.sessionOnly && !p.sensitive {
				t.Errorf("%s is sessionOnly but not sensitive", p.key)
			}
			if p.sessionOnly && KeyAllowed(p.key) {
				t.Errorf("%s is sessionOnly but allowed in access keys", p.key)
			}
			if !p.superOnly {
				continue
			}
			for _, r := range builtinRoles {
				if r.grants != nil && r.grants(m.key, p.key) {
					t.Errorf("%s is superOnly but in the defaults of %s", p.key, r.key)
				}
			}
		}
	}
}

// The flagged sets are pinned: sensitive covers credentials, money, trust
// roots, code execution and identity or authorization (display only);
// sessionOnly is the decided list kept out of access keys (CONTRACTS §80).
func TestCatalogFlaggedSets(t *testing.T) {
	t.Parallel()
	var sensitive, session []string
	for _, m := range coreModules {
		for _, p := range m.perms {
			if p.sensitive {
				sensitive = append(sensitive, p.key)
			}
			if p.sessionOnly {
				session = append(session, p.key)
			}
		}
	}
	wantSensitive := []string{
		"account:credential:view", "account:delete", "account:own:credential:view", "account:own:delete", "account:relay",
		"balance:adjust", "group:manage",
		"plugin:grant:critical", "plugin:grant:db_schema_unconfined", "plugin:grant:high",
		"plugin:install", "plugin:manage", "plugin:uninstall",
		"price:manage", "proxy:manage", "publisher:manage",
		"role:assign", "role:define", "settings:manage",
		"system:update:execute", "system:update:recover",
		"task:manage", "task:run", "usage:settle", "user:delete", "user:password:reset",
	}
	wantSession := []string{"role:assign", "role:define", "settings:manage", "user:password:reset"}
	slices.Sort(sensitive)
	slices.Sort(session)
	if !slices.Equal(sensitive, wantSensitive) {
		t.Errorf("sensitive = %v\nwant %v", sensitive, wantSensitive)
	}
	if !slices.Equal(session, wantSession) {
		t.Errorf("sessionOnly = %v, want %v", session, wantSession)
	}
}

// Not parallel: it extends the package catalog while it runs. A new core
// permission inheriting a split one reaches that one's holders once, the
// built-in roles accepting it get it by default, and every such grant to an
// existing role is audited.
func TestSyncCoreInheritsAndAuditsGrants(t *testing.T) {
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := db.Pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	exec(`INSERT INTO permissions (key, module, label, source) VALUES ('legacy:split', 'legacy', '{"en":"x"}', 'core')`)
	exec(`INSERT INTO roles (key, name) VALUES ('splitter', '{"en":"x"}')`)
	custom := roleID(t, s, "splitter")
	exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE key = 'legacy:split'`, custom)

	saved := coreModules
	defer func() { coreModules = saved }()
	coreModules = slices.Clone(coreModules)
	i := coreModuleOrder["role"]
	coreModules[i].perms = append(slices.Clone(coreModules[i].perms), corePerm{
		key: "role:probe", en: "Probe", zh: "探针", sensitive: true, sessionOnly: true, inherits: []string{"legacy:split"},
	})

	type grant struct {
		role int64
		via  string
	}
	audited := func() map[grant]int {
		t.Helper()
		rows, err := db.Pool.Query(ctx, `SELECT target_id::bigint, detail->>'via', detail->'from' FROM audit_logs
WHERE action = 'authz.sync.grant' AND target_type = 'role' AND user_id IS NULL AND detail->>'key' = 'role:probe'`)
		if err != nil {
			t.Fatal(err)
		}
		defer rows.Close()
		out := map[grant]int{}
		for rows.Next() {
			var g grant
			var from json.RawMessage
			if err := rows.Scan(&g.role, &g.via, &from); err != nil {
				t.Fatal(err)
			}
			if g.via == "inherit" && string(from) != `["legacy:split"]` {
				t.Fatalf("inherit from = %s", from)
			}
			out[g]++
		}
		return out
	}

	want := map[grant]int{{custom, "inherit"}: 1}
	for _, r := range builtinRoles {
		if r.grants != nil && r.grants("role", "role:probe") {
			want[grant{roleID(t, s, r.key), "default"}] = 1
		}
	}
	if len(want) < 2 {
		t.Fatal("no built-in role accepts role:probe by default")
	}
	for range 2 {
		if err := s.SyncCore(ctx); err != nil {
			t.Fatal(err)
		}
		got := audited()
		if len(got) != len(want) {
			t.Fatalf("audited = %v, want %v", got, want)
		}
		for g, n := range want {
			if got[g] != n {
				t.Fatalf("audited = %v, want %v", got, want)
			}
		}
	}
	var held bool
	if err := db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE rp.role_id = $1 AND p.key = 'role:probe')`, custom).Scan(&held); err != nil || !held {
		t.Fatalf("inherited grant: %v, %v", held, err)
	}

	if KeyAllowed("role:probe") {
		t.Fatal("a sessionOnly permission is allowed in access keys")
	}
	mods, err := s.ListPermissions(ctx)
	if err != nil {
		t.Fatal(err)
	}
	only := map[string]bool{}
	for _, m := range mods {
		for _, p := range m.Permissions {
			only[p.Key] = p.SessionOnly
		}
	}
	if !only["role:probe"] || only["role:read"] {
		t.Fatalf("session_only: probe %v, role:read %v", only["role:probe"], only["role:read"])
	}
}

// role:manage was split into role:define and role:assign (decision 3): the
// first sync after the split gives a role holding role:manage both halves,
// once, and keeps role:manage as a removed permission that grants nothing.
func TestSyncCoreSplitsRoleManage(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	ctx := context.Background()
	exec := func(sql string) {
		t.Helper()
		if _, err := db.Pool.Exec(ctx, sql); err != nil {
			t.Fatal(err)
		}
	}
	// The catalog before the split, with a custom role holding role:manage.
	exec(`INSERT INTO permissions (key, module, label, source) VALUES ('role:manage', 'role', '{"en":"x"}', 'core')`)
	exec(`INSERT INTO roles (key, name) VALUES ('delegator', '{"en":"x"}')`)
	exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = 'delegator' AND p.key = 'role:manage'`)

	s := newService(t, db, newMemBus(), nil) // Start runs the first sync.
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	role := roleID(t, s, "delegator")
	var status string
	var held, audited int
	err := db.Pool.QueryRow(ctx, `SELECT
    (SELECT status FROM permissions WHERE key = 'role:manage'),
    (SELECT count(*) FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.key IN ('role:define', 'role:assign')),
    (SELECT count(*) FROM audit_logs WHERE action = 'authz.sync.grant' AND target_type = 'role'
        AND target_id = $1::text AND detail->>'via' = 'inherit')`, role).Scan(&status, &held, &audited)
	if err != nil || status != "removed" || held != 2 || audited != 2 {
		t.Fatalf("status %q, held %d, audited %d: %v", status, held, audited, err)
	}
	uid := addUser(t, s, "delegator@x.com", "delegator")
	mustCan(t, s, uid, "role:define", true)
	mustCan(t, s, uid, "role:assign", true)
	mustCan(t, s, uid, "role:manage", false)
}

// Not parallel: it extends the package's built-in roles while it runs. A
// custom role holding a built-in role key stops the sync (decision D5): it
// is neither turned into the built-in role nor skipped, and the error names
// the row and how to rename it. Once renamed, the sync creates the built-in
// role.
func TestSyncCoreRefusesCustomRoleOnBuiltinKey(t *testing.T) {
	db := testutil.DB(t)
	s := newService(t, db, newMemBus(), nil)
	ctx := context.Background()
	const key = "supplier"
	if _, ok := builtinRoleByKey(key); !ok {
		saved := builtinRoles
		defer func() { builtinRoles = saved }()
		builtinRoles = append(slices.Clone(builtinRoles), builtinRole{key: key, name: lt("Supplier", "供应商")})
		if _, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name) VALUES ($1, '{"en":"x"}')`, key); err != nil {
			t.Fatal(err)
		}
	} else if _, err := db.Pool.Exec(ctx, `UPDATE roles SET builtin = false WHERE key = $1`, key); err != nil {
		t.Fatal(err)
	}
	id := roleID(t, s, key)
	v1, _ := s.currentVersion(ctx)

	err := s.SyncCore(ctx)
	fix := fmt.Sprintf("UPDATE roles SET key = 'supplier_custom' WHERE id = %d;", id)
	if err == nil || !strings.Contains(err.Error(), fmt.Sprintf("role id %d key %q", id, key)) || !strings.Contains(err.Error(), fix) {
		t.Fatalf("sync with a custom role on a built-in key: %v", err)
	}
	var builtin bool
	if err := db.Pool.QueryRow(ctx, `SELECT builtin FROM roles WHERE id = $1`, id).Scan(&builtin); err != nil || builtin {
		t.Fatalf("custom role became built-in: %v, %v", builtin, err)
	}
	if v2, _ := s.currentVersion(ctx); v2 != v1 {
		t.Fatalf("a refused sync bumped the version: %d -> %d", v1, v2)
	}

	if _, err := db.Pool.Exec(ctx, fix); err != nil {
		t.Fatal(err)
	}
	if err := s.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	var keys []string
	if err := db.Pool.QueryRow(ctx, `SELECT array_agg(key ORDER BY key) FROM roles WHERE key LIKE 'supplier%' AND builtin`).Scan(&keys); err != nil || !slices.Equal(keys, []string{key}) {
		t.Fatalf("built-in roles after the rename: %v, %v", keys, err)
	}
	if err := db.Pool.QueryRow(ctx, `SELECT builtin FROM roles WHERE id = $1`, id).Scan(&builtin); err != nil || builtin {
		t.Fatalf("renamed custom role: built-in %v, %v", builtin, err)
	}
}
