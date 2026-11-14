package install

import (
	"slices"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// An upgrade whose new permission goes to a built-in role with consent (a
// sensitive one to admin) is approved on the consent page only by someone
// who may change that role (the real CanGrantToRoles: built-in roles are the
// super admin's alone), the rule confirming withheld grants follows: a
// non-super admin with role:define is refused and the version stays
// awaiting consent, the super admin approves it and the grant is made.
func TestUpgradeConsentNeedsRightsOverTheRoles(t *testing.T) {
	e, ctx := roleGrantsEnv(t)
	cat := authz.New(authz.Deps{DB: e.db})
	if err := cat.Start(ctx); err != nil {
		t.Fatal(err)
	}
	e.perms.canGrant = cat.CanGrantToRoles
	for id, role := range map[int64]string{e.admin: authz.RoleSuperAdmin, e.limited: authz.RoleAdmin} {
		if err := e.db.Tx(ctx, func(tx pgx.Tx) error {
			_, err := cat.SetUserRoles(ctx, tx, 0, id, []string{role})
			return err
		}); err != nil {
			t.Fatal(err)
		}
		e.authz.perms[id]["role:define"] = true
	}
	r, err := e.svc.Upload(ctx, pkgtest.Build(guardWith("0.1.1", newPerm("rules:export", true, "admin")), e.root), e.admin, UploadOptions{})
	if err != nil || r.ConsentStatus != ConsentAwaiting || !r.RoleGrantsNeedConsent {
		t.Fatalf("upload: %+v, %v", r, err)
	}
	consent := ConsentRequest{Grants: explicitGuardGrants()}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.1", consent, e.limited); core.AsError(err).Code != "permission_denied" {
		t.Fatalf("non-super admin consent: %v", err)
	}
	var status string
	if err := e.db.Pool.QueryRow(ctx, `SELECT consent_status FROM plugin_versions WHERE plugin_key = 'guard' AND version = '0.1.1'`).Scan(&status); err != nil || status != ConsentAwaiting {
		t.Fatalf("after the refused consent: %s, %v", status, err)
	}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.1", consent, e.admin); err != nil {
		t.Fatalf("super admin consent: %v", err)
	}
	defs := e.perms.syncs[len(e.perms.syncs)-1].defs
	if i := slices.IndexFunc(defs, func(d core.PermissionDef) bool { return d.Key == "plugin.guard:rules:export" }); i < 0 || !slices.Equal(defs[i].GrantRoles, []string{"admin"}) {
		t.Fatalf("synced defs %+v", defs)
	}
}
