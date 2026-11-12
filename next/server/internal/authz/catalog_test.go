package authz

import (
	"context"
	"encoding/json"
	"slices"
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
