package install

import (
	"context"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// roleGrantsEnv installs guard 0.1.0 with every host permission and gives the catalog its three
// permissions (the fake SyncPlugin writes none), rules:manage held by the
// custom role auditor; the built-in roles exist.
func roleGrantsEnv(t *testing.T) (*env, context.Context) {
	t.Helper()
	e := newEnv(t)
	ctx := context.Background()
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	if _, err := e.svc.Upload(ctx, pkgtest.Build(m, e.root), e.admin, UploadOptions{}); err != nil {
		t.Fatal(err)
	}
	// Every host permission granted, so that an upgrade requesting the
	// same ones is carried over.
	var all ConsentRequest
	for _, hp := range m.HostPermissions {
		all.Grants = append(all.Grants, GrantInput{Permission: hp.ID})
	}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.0", all, e.admin); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `
INSERT INTO roles (key, name, builtin) VALUES ('admin', '{}', true), ('operator', '{}', true), ('supplier', '{}', true), ('user', '{}', true), ('auditor', '{}', false)
ON CONFLICT (key) DO NOTHING;
INSERT INTO permissions (key, module, label, source, plugin_key, status)
SELECT 'plugin.guard:' || k, 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'disabled' FROM unnest(ARRAY['rules:read','rules:manage','stats:read']) k;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = 'auditor' AND p.key = 'plugin.guard:rules:manage'`); err != nil {
		t.Fatal(err)
	}
	return e, ctx
}

// guardWith is guard at version with ups added to its permissions.
func guardWith(version string, ups ...manifest.UserPermission) *manifest.Manifest {
	m := pkgtest.Guard("guard", version, "sub2api")
	m.UserPermissions = append(m.UserPermissions, ups...)
	return m
}

func newPerm(key string, sensitive bool, roles ...string) manifest.UserPermission {
	return manifest.UserPermission{Key: key, Label: manifest.LocalizedText{"en": key}, Sensitive: sensitive, DefaultRoles: roles}
}

func autoAudits(t *testing.T, e *env, ctx context.Context) int {
	t.Helper()
	var n int
	if err := e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = $1 AND target_id = 'guard'`, AuditConsentAuto).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// An upgrade requesting no new host permission is carried over only when
// every role grant of the permissions it creates is of a non-sensitive
// permission to admin, operator or supplier; a sensitive one, one to user
// or one to a custom role (through inheritFrom) leaves it awaiting consent
// with the review saying why. The carried-over one is audited.
func TestUpgradeRoleGrantsNeedConsent(t *testing.T) {
	e, ctx := roleGrantsEnv(t)
	inherit := newPerm("rules:edit", false, "admin")
	inherit.InheritFrom = []string{"rules:manage"}
	for _, tc := range []struct {
		version string
		up      manifest.UserPermission
		want    string
		grants  []RoleGrant
	}{
		{"0.1.1", newPerm("rules:export", true, "admin"), ConsentAwaiting,
			[]RoleGrant{{Permission: "plugin.guard:rules:export", Role: "admin", Sensitive: true, Via: "default", NeedsConsent: true}}},
		{"0.1.2", newPerm("rules:export", false, "admin", "user"), ConsentAwaiting,
			[]RoleGrant{{Permission: "plugin.guard:rules:export", Role: "admin", Via: "default"}, {Permission: "plugin.guard:rules:export", Role: "user", Via: "default", NeedsConsent: true}}},
		{"0.1.3", inherit, ConsentAwaiting,
			// A rename: no default roles, only the old key's holders.
			[]RoleGrant{{Permission: "plugin.guard:rules:edit", Role: "auditor", Via: "inherit", NeedsConsent: true}}},
		{"0.1.4", newPerm("rules:export", false, "admin", "operator", "supplier"), ConsentApproved,
			[]RoleGrant{{Permission: "plugin.guard:rules:export", Role: "admin", Via: "default"}, {Permission: "plugin.guard:rules:export", Role: "operator", Via: "default"}, {Permission: "plugin.guard:rules:export", Role: "supplier", Via: "default"}}},
	} {
		r, err := e.svc.Upload(ctx, pkgtest.Build(guardWith(tc.version, tc.up), e.root), e.admin, UploadOptions{})
		if err != nil {
			t.Fatalf("%s: %v", tc.version, err)
		}
		if r.ConsentStatus != tc.want || r.RoleGrantsNeedConsent != (tc.want == ConsentAwaiting) || !slices.Equal(r.NewRoleGrants, tc.grants) {
			t.Fatalf("%s: status %s, need %v, grants %+v", tc.version, r.ConsentStatus, r.RoleGrantsNeedConsent, r.NewRoleGrants)
		}
		if rr, err := e.svc.Review(ctx, "guard", tc.version); err != nil || !slices.Equal(rr.NewRoleGrants, tc.grants) {
			t.Fatalf("%s: stored review %+v, %v", tc.version, rr, err)
		}
	}
	// Only the carried-over one is audited as an automatic consent, with
	// its grants and nothing pending.
	var detail string
	if err := e.db.Pool.QueryRow(ctx, `SELECT detail::text FROM audit_logs WHERE action = $1 AND target_id = 'guard' AND user_id = $2`, AuditConsentAuto, e.admin).Scan(&detail); err != nil {
		t.Fatal(err)
	}
	if n := autoAudits(t, e, ctx); n != 1 {
		t.Fatalf("%d automatic consent audits", n)
	}
	for _, want := range []string{`"version": "0.1.4"`, `"pending": []`, `"review_required": false`, `"role": "supplier"`} {
		if !strings.Contains(detail, want) {
			t.Fatalf("audit %s lacks %s", detail, want)
		}
	}
	// An operator consenting gives the grants as usual.
	if _, err := e.svc.Consent(ctx, "guard", "0.1.2", ConsentRequest{Grants: explicitGuardGrants()}, e.admin); err != nil {
		t.Fatal(err)
	}
	last := e.perms.syncs[len(e.perms.syncs)-1].defs
	if d := last[len(last)-1]; d.Key != "plugin.guard:rules:export" || !slices.Equal(d.GrantRoles, []string{"admin", "user"}) {
		t.Fatalf("consented def %+v", d)
	}
}

// A built-in plugin's upgrade is approved by the system (node readiness
// needs it), but the grants that need consent are withheld: the rest are
// made, the withheld ones listed for review until someone entitled confirms
// (granting them) or rejects them.
func TestBuiltinUpgradeWithholdsRoleGrants(t *testing.T) {
	e, ctx := roleGrantsEnv(t)
	inherit := newPerm("rules:edit", false, "admin")
	inherit.InheritFrom = []string{"rules:manage"}
	dir := t.TempDir()
	m := guardWith("0.1.1", newPerm("rules:export", true, "admin"), newPerm("rules:view", false, "admin", "user"), inherit)
	if err := os.WriteFile(filepath.Join(dir, "guard-0.1.1.s2plugin"), pkgtest.Build(m, e.root), 0o644); err != nil {
		t.Fatal(err)
	}
	_ = e.svc.EnsureBuiltin(ctx, dir, testLogger(t)) // the fake rollout cannot upgrade
	var consent string
	if err := e.db.Pool.QueryRow(ctx, `SELECT consent_status FROM plugin_versions WHERE plugin_key = 'guard' AND version = '0.1.1'`).Scan(&consent); err != nil || consent != ConsentApproved {
		t.Fatalf("consent %s, %v", consent, err)
	}
	defs := e.perms.syncs[len(e.perms.syncs)-1].defs
	got := map[string][]string{}
	for _, d := range defs {
		got[d.Key] = d.GrantRoles
		if d.InheritFrom != nil {
			t.Fatalf("a new permission still inherits (grants are by name, as planned): %+v", d)
		}
	}
	if !slices.Equal(got["plugin.guard:rules:export"], []string{}) || !slices.Equal(got["plugin.guard:rules:view"], []string{"admin"}) ||
		!slices.Equal(got["plugin.guard:rules:edit"], []string{}) {
		t.Fatalf("synced grants %v", got)
	}
	if n := autoAudits(t, e, ctx); n != 1 {
		t.Fatalf("%d automatic consent audits", n)
	}

	// The catalog now has the new permissions (the real SyncPlugin would
	// have created them).
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status, sensitive)
SELECT 'plugin.guard:' || k, 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'active', k = 'rules:export' FROM unnest(ARRAY['rules:export','rules:view','rules:edit']) k`); err != nil {
		t.Fatal(err)
	}
	pending, err := PendingRoleGrants(ctx, e.db.Pool, "guard", "")
	if err != nil {
		t.Fatal(err)
	}
	want := []RoleGrant{
		{Version: "0.1.1", Permission: "plugin.guard:rules:edit", Role: "auditor", Via: "inherit", NeedsConsent: true},
		{Version: "0.1.1", Permission: "plugin.guard:rules:export", Role: "admin", Sensitive: true, Via: "default", NeedsConsent: true},
		{Version: "0.1.1", Permission: "plugin.guard:rules:view", Role: "user", Via: "default", NeedsConsent: true},
	}
	if !slices.Equal(pending, want) {
		t.Fatalf("pending %+v", pending)
	}

	// Confirming needs what naming the roles on the consent page needs.
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.1", true, e.limited); core.AsError(err).Details["permission"] != "role:define" {
		t.Fatalf("confirm without role:define: %v", err)
	}
	e.authz.perms[e.admin]["role:define"] = true
	e.perms.denyRoles = core.ErrPermissionDenied.WithMessage("only the super admin can change built-in roles")
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.1", true, e.admin); core.AsError(err).Code != "permission_denied" || len(e.perms.granted) != 0 {
		t.Fatalf("confirm a role the operator may not change: %v, granted %v", err, e.perms.granted)
	}
	if !slices.Equal(e.perms.checked[len(e.perms.checked)-1], []string{"admin", "auditor", "user"}) {
		t.Fatalf("checked %v", e.perms.checked)
	}
	e.perms.denyRoles = nil
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.0", true, e.admin); core.AsError(err).Code != "not_found" {
		t.Fatalf("a version with nothing to review: %v", err)
	}
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.1", true, e.admin); err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(e.perms.granted, []string{"plugin.guard:rules:edit=auditor", "plugin.guard:rules:export=admin", "plugin.guard:rules:view=user"}) {
		t.Fatalf("granted %v", e.perms.granted)
	}
	if pending, err := PendingRoleGrants(ctx, e.db.Pool, "guard", ""); err != nil || len(pending) != 0 {
		t.Fatalf("after confirm: %+v, %v", pending, err)
	}

	// The next built-in upgrade withholds again; rejecting grants nothing
	// and clears the list.
	m = guardWith("0.1.2", newPerm("rules:export", true, "admin"), newPerm("rules:view", false, "admin", "user"), inherit, newPerm("stats:export", false, "user"))
	if err := os.WriteFile(filepath.Join(dir, "guard-0.1.2.s2plugin"), pkgtest.Build(m, e.root), 0o644); err != nil {
		t.Fatal(err)
	}
	_ = e.svc.EnsureBuiltin(ctx, dir, testLogger(t))
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status)
VALUES ('plugin.guard:stats:export', 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'active')`); err != nil {
		t.Fatal(err)
	}
	if pending, err := PendingRoleGrants(ctx, e.db.Pool, "guard", ""); err != nil || len(pending) != 1 || pending[0].Role != "user" || pending[0].Version != "0.1.2" {
		t.Fatalf("second upgrade pending %+v, %v", pending, err)
	}
	// Rejecting needs the same rights.
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.2", false, e.limited); core.AsError(err).Details["permission"] != "role:define" {
		t.Fatalf("reject without role:define: %v", err)
	}
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.2", false, e.admin); err != nil {
		t.Fatal(err)
	}
	if pending, err := PendingRoleGrants(ctx, e.db.Pool, "guard", ""); err != nil || len(pending) != 0 || len(e.perms.granted) != 3 {
		t.Fatalf("after reject: %+v, granted %v, %v", pending, e.perms.granted, err)
	}
}

// Two built-in upgrades withholding the same grant list it once (under the
// earlier version); rejecting it there rejects it for both, while a grant
// only the later one withheld stays listed. A later upgrade withholding it
// again after the reject lists it again.
func TestRejectWithheldGrantAcrossVersions(t *testing.T) {
	e, ctx := roleGrantsEnv(t)
	e.authz.perms[e.admin]["role:define"] = true
	dir := t.TempDir()
	upgrade := func(version string, ups ...manifest.UserPermission) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(dir, "guard-"+version+".s2plugin"), pkgtest.Build(guardWith(version, ups...), e.root), 0o644); err != nil {
			t.Fatal(err)
		}
		_ = e.svc.EnsureBuiltin(ctx, dir, testLogger(t)) // the fake rollout cannot upgrade
	}
	pending := func() []RoleGrant {
		t.Helper()
		gs, err := PendingRoleGrants(ctx, e.db.Pool, "guard", "")
		if err != nil {
			t.Fatal(err)
		}
		return gs
	}
	upgrade("0.1.1", newPerm("rules:view", false, "admin", "user"))
	upgrade("0.1.2", newPerm("rules:view", false, "admin", "user"), newPerm("stats:export", false, "user"))
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status)
SELECT 'plugin.guard:' || k, 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'active' FROM unnest(ARRAY['rules:view','stats:export']) k`); err != nil {
		t.Fatal(err)
	}
	want := []RoleGrant{
		{Version: "0.1.1", Permission: "plugin.guard:rules:view", Role: "user", Via: "default", NeedsConsent: true},
		{Version: "0.1.2", Permission: "plugin.guard:stats:export", Role: "user", Via: "default", NeedsConsent: true},
	}
	if got := pending(); !slices.Equal(got, want) {
		t.Fatalf("pending %+v", got)
	}
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.1", false, e.admin); err != nil {
		t.Fatal(err)
	}
	if got := pending(); !slices.Equal(got, want[1:]) {
		t.Fatalf("after rejecting 0.1.1: %+v", got)
	}
	if _, err := e.svc.ReviewRoleGrants(ctx, "guard", "0.1.2", false, e.admin); err != nil {
		t.Fatal(err)
	}
	if got := pending(); len(got) != 0 || len(e.perms.granted) != 0 {
		t.Fatalf("after rejecting 0.1.2: %+v, granted %v", got, e.perms.granted)
	}
	// rules:view new again (gone from the catalog meanwhile): 0.1.3
	// withholds it after the reject, so it is listed again.
	if _, err := e.db.Pool.Exec(ctx, `DELETE FROM permissions WHERE key = 'plugin.guard:rules:view'`); err != nil {
		t.Fatal(err)
	}
	upgrade("0.1.3", newPerm("rules:view", false, "admin", "user"), newPerm("stats:export", false, "user"))
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO permissions (key, module, label, source, plugin_key, status)
VALUES ('plugin.guard:rules:view', 'plugin.guard', '{"en":"x"}', 'plugin', 'guard', 'active')`); err != nil {
		t.Fatal(err)
	}
	if got := pending(); len(got) != 1 || got[0].Version != "0.1.3" || got[0].Permission != "plugin.guard:rules:view" {
		t.Fatalf("withheld again by 0.1.3: %+v", got)
	}
}
