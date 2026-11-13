package install

import (
	"context"
	"slices"
	"testing"

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
	// An empty override names no role: nothing to check.
	none := ConsentRequest{Grants: explicitGuardGrants(), NewPermissionRoles: map[string][]string{"rules:read": {}}}
	delete(e.authz.perms[e.admin], "role:define")
	if _, err := e.svc.Consent(ctx, "guard", "0.1.0", none, e.admin); err != nil {
		t.Fatalf("manifest defaults without role:define: %v", err)
	}
	last := e.perms.syncs[len(e.perms.syncs)-1]
	if len(e.perms.checked) != 1 || last.defs[0].GrantRoles == nil || len(last.defs[0].GrantRoles) != 0 || !slices.Equal(last.defs[1].GrantRoles, []string{"admin"}) {
		t.Fatalf("checked %v, defs %+v", e.perms.checked, last.defs)
	}

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
}
