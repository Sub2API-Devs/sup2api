package install

import (
	"context"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// Handing a version's new permissions to roles the request names needs
// role:define and the catalog's CanGrantToRoles for every named role;
// manifest defaults need neither, and an upgrade adding no permission
// needs nothing whatever roles it names.
func TestConsentRoleGrantRights(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	upload := func(version string) {
		t.Helper()
		if _, err := e.svc.Upload(ctx, pkgtest.Build(pkgtest.Guard("guard", version, "sub2api"), e.root), e.admin, UploadOptions{}); err != nil {
			t.Fatalf("upload %s: %v", version, err)
		}
	}
	upload("0.1.0")
	explicit := ConsentRequest{Grants: explicitGuardGrants(), NewPermissionRoles: map[string][]string{"rules:read": {"auditor"}, "stats:read": {"auditor", "ops"}}}

	_, err := e.svc.Consent(ctx, "guard", "0.1.0", explicit, e.admin)
	if ce := core.AsError(err); ce.Code != "permission_denied" || ce.Details["permission"] != "role:define" || len(e.perms.checked) != 0 {
		t.Fatalf("named roles without role:define: %v, checked %v", err, e.perms.checked)
	}

	e.authz.perms[e.admin]["role:define"] = true
	e.perms.denyRoles = core.ErrPermissionDenied.WithMessage("only the super admin can change built-in roles")
	if _, err := e.svc.Consent(ctx, "guard", "0.1.0", explicit, e.admin); core.AsError(err).Code != "permission_denied" {
		t.Fatalf("role the operator may not change: %v", err)
	}
	if len(e.perms.checked) != 1 || !slices.Equal(e.perms.checked[0], []string{"auditor", "ops"}) {
		t.Fatalf("checked roles %v", e.perms.checked)
	}
	e.perms.denyRoles = nil
	// An empty override names no role (nothing to check); the other
	// permissions keep their manifest defaults, which need no rights.
	none := ConsentRequest{Grants: explicitGuardGrants(), NewPermissionRoles: map[string][]string{"rules:read": {}}}
	delete(e.authz.perms[e.admin], "role:define")
	if _, err := e.svc.Consent(ctx, "guard", "0.1.0", none, e.admin); err != nil {
		t.Fatalf("manifest defaults without role:define: %v", err)
	}
	last := e.perms.syncs[len(e.perms.syncs)-1]
	if len(e.perms.checked) != 1 || last.defs[0].GrantRoles == nil || len(last.defs[0].GrantRoles) != 0 || !slices.Equal(last.defs[1].GrantRoles, []string{"admin"}) {
		t.Fatalf("checked %v, defs %+v", e.perms.checked, last.defs)
	}
	e.perms.mu.Lock()
	e.perms.syncs = nil
	e.perms.mu.Unlock()

	// 0.1.1 declares the same permissions, which the catalog now has.
	if _, err := e.db.Pool.Exec(ctx, `
INSERT INTO permissions (key, module, label, source, plugin_key, status)
SELECT 'plugin.guard:' || k, 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'disabled' FROM unnest(ARRAY['rules:read','rules:manage','stats:read']) k`); err != nil {
		t.Fatal(err)
	}
	upload("0.1.1")
	upgrade := ConsentRequest{Grants: explicitGuardGrants(), RoleKeysForNewPermissions: []string{"admin"}}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.1", upgrade, e.admin); err != nil || len(e.perms.checked) != 1 {
		t.Fatalf("upgrade adding no permission: %v, checked %v", err, e.perms.checked)
	}

	// 0.1.2 adds a permission: with role:define and roles the catalog lets
	// the operator change, the named roles go with it.
	m := pkgtest.Guard("guard", "0.1.2", "sub2api")
	m.UserPermissions = append(m.UserPermissions, manifest.UserPermission{Key: "rules:export", Label: manifest.LocalizedText{"en": "Export"}})
	if _, err := e.svc.Upload(ctx, pkgtest.Build(m, e.root), e.admin, UploadOptions{}); err != nil {
		t.Fatal(err)
	}
	e.authz.perms[e.admin]["role:define"] = true
	named := ConsentRequest{Grants: explicitGuardGrants(), NewPermissionRoles: map[string][]string{"rules:export": {"auditor"}}}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.2", named, e.admin); err != nil {
		t.Fatalf("named role the operator may change: %v", err)
	}
	if len(e.perms.checked) != 2 || !slices.Equal(e.perms.checked[1], []string{"auditor"}) {
		t.Fatalf("checked %v", e.perms.checked)
	}
	last = e.perms.syncs[len(e.perms.syncs)-1]
	if d := last.defs[len(last.defs)-1]; d.Key != "plugin.guard:rules:export" || !slices.Equal(d.GrantRoles, []string{"auditor"}) {
		t.Fatalf("new def %+v", d)
	}
}

// A permission inheriting from an old key the catalog has is a rename: the
// consent hands it no default roles, only the old key's holders (SyncPlugin
// InheritFrom); without the old key (a first install) it gets its defaults.
func TestConsentRenameInheritsOnly(t *testing.T) {
	for _, old := range []bool{false, true} {
		e := newEnv(t)
		ctx := context.Background()
		m := pkgtest.Guard("guard", "0.1.0", "sub2api")
		m.UserPermissions[0].DefaultRoles = []string{"user"}
		m.UserPermissions[0].InheritFrom = []string{"rules:view"}
		if _, err := e.svc.Upload(ctx, pkgtest.Build(m, e.root), e.admin, UploadOptions{}); err != nil {
			t.Fatal(err)
		}
		if old {
			if _, err := e.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status)
VALUES ('plugin.guard:rules:view', 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'disabled')`); err != nil {
				t.Fatal(err)
			}
		}
		want := []string{"user"}
		if old {
			want = []string{}
		}
		// The consent page shows the same roles.
		r, err := e.svc.Review(ctx, "guard", "0.1.0")
		if err != nil || !slices.Equal(r.UserPermissions[0].DefaultRoles, want) || !slices.Equal(r.UserPermissions[1].DefaultRoles, []string{"admin"}) {
			t.Fatalf("old key %v: review %+v, %v", old, r.UserPermissions, err)
		}
		if _, err := e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: explicitGuardGrants()}, e.admin); err != nil {
			t.Fatal(err)
		}
		defs := e.perms.syncs[len(e.perms.syncs)-1].defs
		if !slices.Equal(defs[0].GrantRoles, want) || !slices.Equal(defs[0].InheritFrom, []string{"rules:view"}) || !slices.Equal(defs[1].GrantRoles, []string{"admin"}) {
			t.Fatalf("old key %v: defs %+v", old, defs)
		}
	}
}
