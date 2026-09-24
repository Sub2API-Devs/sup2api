package install

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// ---------------------------------------------------------------- fakes

type fakeAuthz struct{ perms map[int64]map[string]bool }

func (f *fakeAuthz) Can(_ context.Context, uid int64, p string) (bool, error) {
	return f.perms[uid][p], nil
}
func (f *fakeAuthz) PermissionSet(_ context.Context, uid int64) (core.PermissionSet, error) {
	ks := map[string]struct{}{}
	for k := range f.perms[uid] {
		ks[k] = struct{}{}
	}
	return core.PermissionSet{Keys: ks}, nil
}
func (f *fakeAuthz) IsSensitive(string) bool { return false }

type syncCall struct {
	key   string
	defs  []core.PermissionDef
	roles []string
}

type fakePerms struct {
	mu      sync.Mutex
	syncs   []syncCall
	deleted []string
}

func (f *fakePerms) SyncPlugin(_ context.Context, _ pgx.Tx, key string, defs []core.PermissionDef, roles []string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.syncs = append(f.syncs, syncCall{key, defs, roles})
	return nil
}
func (f *fakePerms) SetPluginActive(context.Context, pgx.Tx, string, bool) error { return nil }
func (f *fakePerms) DeletePlugin(_ context.Context, _ pgx.Tx, key string) error {
	f.deleted = append(f.deleted, key)
	return nil
}

type fakeSticky struct{ calls int }

func (f *fakeSticky) SyncPluginDefaults(context.Context, pgx.Tx, string, []manifest.StickyRule) error {
	f.calls++
	return nil
}

type fakeRollout struct {
	db       *store.DB
	disabled []string
	reasons  []string
	enabled  []string
}

func (f *fakeRollout) Enable(ctx context.Context, key string, _ int64) (*core.Rollout, error) {
	if f.db == nil {
		return nil, errors.New("n/a")
	}
	f.enabled = append(f.enabled, key)
	_, err := f.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'enabled', active_version = (SELECT max(version) FROM plugin_versions WHERE plugin_key = $1 AND consent_status = 'approved') WHERE key = $1`, key)
	return &core.Rollout{ID: 2, PluginKey: key, Action: "enable", Phase: "active"}, err
}
func (f *fakeRollout) Upgrade(context.Context, string, string, int64) (*core.Rollout, error) {
	return nil, errors.New("n/a")
}
func (f *fakeRollout) Disable(ctx context.Context, key string, _ int64, reason string) (*core.Rollout, error) {
	f.disabled = append(f.disabled, key)
	f.reasons = append(f.reasons, reason)
	_, err := f.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'disabled' WHERE key = $1`, key)
	return &core.Rollout{ID: 1, PluginKey: key, Action: "disable", Phase: "active"}, err
}
func (f *fakeRollout) Current(context.Context, string) (*core.Rollout, error) { return nil, nil }
func (f *fakeRollout) Cancel(context.Context, string, int64, int64) error     { return nil }

type fakeSchemas struct{ dropped []string }

func (f *fakeSchemas) Drop(_ context.Context, key string) error {
	f.dropped = append(f.dropped, key)
	return nil
}

type fakeAccounts struct{ purged []string }

func (f *fakeAccounts) PurgePluginAccounts(_ context.Context, key string) (int, error) {
	f.purged = append(f.purged, key)
	return 3, nil
}

type env struct {
	db       *store.DB
	svc      *Service
	perms    *fakePerms
	sticky   *fakeSticky
	rollout  *fakeRollout
	schemas  *fakeSchemas
	accounts *fakeAccounts
	authz    *fakeAuthz
	root     pkgtest.Key
	admin    int64 // all grant rights
	limited  int64 // plugin:install + grant:high only
}

func newEnv(t *testing.T) *env {
	t.Helper()
	db := testutil.DB(t)
	ctx := context.Background()
	e := &env{db: db, perms: &fakePerms{}, sticky: &fakeSticky{}, schemas: &fakeSchemas{},
		accounts: &fakeAccounts{}, root: pkgtest.NewKey("root-1")}
	e.rollout = &fakeRollout{db: db}
	for _, email := range []string{"admin@x", "ops@x"} {
		var id int64
		if err := db.Pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, email).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if e.admin == 0 {
			e.admin = id
		} else {
			e.limited = id
		}
	}
	e.authz = &fakeAuthz{perms: map[int64]map[string]bool{
		e.admin:   {PermGrantHigh: true, PermGrantCritical: true},
		e.limited: {PermGrantHigh: true},
	}}
	ts, err := pkg.NewTrustStore([]string{e.root.ID + "=" + e.root.PubB64()}, false)
	if err != nil {
		t.Fatal(err)
	}
	e.svc = New(Deps{
		DB: db, Trust: ts, Authz: e.authz, Permissions: e.perms,
		Defaults: NewDefaultsApplier(e.perms, e.sticky),
		Rollout:  e.rollout, Schemas: e.schemas, Accounts: e.accounts,
	}, Options{HostVersion: "0.1.0", Plugins: config.PluginConfig{MaxPackageBytes: 10 << 20, MaxMemoryMB: 1024}})
	return e
}

func fieldCode(err error, field string) string {
	var ce *core.Error
	if !errors.As(err, &ce) {
		return ""
	}
	fs, _ := ce.Details["fields"].([]core.FieldError)
	for _, f := range fs {
		if f.Field == field {
			return f.Code
		}
	}
	return ""
}

func explicitGuardGrants() []GrantInput {
	return []GrantInput{
		{Permission: "db.schema"}, {Permission: "gateway.hook"}, {Permission: "events"}, {Permission: "jobs"},
		{Permission: "routes.admin"}, {Permission: "ui.menu"}, {Permission: "ui.native"},
	}
}

// ---------------------------------------------------------------- tests

func TestInstallConsentUpgradeUninstall(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	data := pkgtest.Build(m, e.root)

	r, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{Source: "upload"})
	if err != nil {
		t.Fatalf("upload: %v", err)
	}
	if r.Trust != pkg.TrustOfficial || r.ConsentStatus != ConsentAwaiting || r.Diff != nil || len(r.HostPermissions) != 9 {
		t.Fatalf("review = %+v", r)
	}
	if r.Database == nil || len(r.Database.Migrations) != 1 || r.Database.Migrations[0] != "0001_init.sql" {
		t.Fatalf("database = %+v", r.Database)
	}
	for _, hp := range r.HostPermissions {
		if hp.ID == "ui.native" && hp.Requires != PermGrantCritical {
			t.Fatalf("ui.native requires %q", hp.Requires)
		}
	}
	// Idempotent re-upload.
	if _, err := e.svc.Upload(ctx, data, e.admin, UploadOptions{}); err != nil {
		t.Fatalf("re-upload: %v", err)
	}
	// Same version, different content.
	m2 := pkgtest.Guard("guard", "0.1.0", "sub2api")
	m2.Description = manifest.LocalizedText{"en": "changed"}
	if _, err := e.svc.Upload(ctx, pkgtest.Build(m2, e.root), e.admin, UploadOptions{}); core.AsError(err).Code != "conflict" {
		t.Fatalf("conflicting re-upload: %v", err)
	}
	// Stored review.
	if rr, err := e.svc.Review(ctx, "guard", "0.1.0"); err != nil || rr.PackageSHA256 != r.PackageSHA256 {
		t.Fatalf("review: %v", err)
	}

	// Missing explicit grants.
	_, err = e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{}, e.admin)
	if fieldCode(err, "permission:gateway.hook") != "consent_required" {
		t.Fatalf("consent without grants: %v", err)
	}
	// Scope wider than requested.
	wide := append(explicitGuardGrants()[:2:2], GrantInput{Permission: "events", Scope: map[string]any{"subscribe": []any{"*"}}})
	_, err = e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: wide}, e.admin)
	if fieldCode(err, "permission:events") != "scope_too_wide" {
		t.Fatalf("wide scope: %v", err)
	}
	// Required permission denied.
	_, err = e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: explicitGuardGrants()[1:], Denied: []string{"db.schema"}}, e.admin)
	if fieldCode(err, "permission:db.schema") != "required" {
		t.Fatalf("deny required: %v", err)
	}
	// Operator without plugin:grant:critical.
	_, err = e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: explicitGuardGrants()}, e.limited)
	if core.AsError(err).Code != "permission_denied" {
		t.Fatalf("limited operator: %v", err)
	}

	// Success; net (optional) narrowed then denied is fine: grant with narrower scope.
	grants := append(explicitGuardGrants(), GrantInput{Permission: "net", Scope: map[string]any{"domains": []any{}}})
	res, err := e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: grants, RoleKeysForNewPermissions: []string{"admin"}}, e.admin)
	if err != nil {
		t.Fatalf("consent: %v", err)
	}
	if res.Status != StatusInstalled || res.Upgrade || len(res.Grants) != 9 {
		t.Fatalf("result = %+v", res)
	}
	if len(e.perms.syncs) != 1 || len(e.perms.syncs[0].defs) != 3 || e.perms.syncs[0].roles[0] != "admin" ||
		e.perms.syncs[0].defs[0].Key != "plugin.guard:rules:read" || e.sticky.calls != 1 {
		t.Fatalf("defaults not applied: %+v sticky=%d", e.perms.syncs, e.sticky.calls)
	}
	var status string
	_ = e.db.Pool.QueryRow(ctx, `SELECT status FROM plugins WHERE key = 'guard'`).Scan(&status)
	if status != StatusInstalled {
		t.Fatalf("status = %s", status)
	}
	if _, err := e.svc.Consent(ctx, "guard", "0.1.0", ConsentRequest{Grants: grants}, e.admin); core.AsError(err).Code != "conflict" {
		t.Fatalf("double consent: %v", err)
	}

	// Simulate the runtime enabling 0.1.0.
	if _, err := e.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'enabled', active_version = '0.1.0' WHERE key = 'guard'`); err != nil {
		t.Fatal(err)
	}

	// Upgrade: adds "log", widens events, drops jobs, adds a permission.
	up := pkgtest.Guard("guard", "0.2.0", "sub2api")
	up.HostPermissions = append(up.HostPermissions, manifest.HostPermission{ID: "log"})
	up.Events.Subscribe = append(up.Events.Subscribe, "account.created")
	for i, hp := range up.HostPermissions {
		if hp.ID == "events" {
			up.HostPermissions[i].Scope = map[string]any{"subscribe": []any{"usage.recorded", "account.created"}}
		}
	}
	up.Jobs = nil
	up.Capabilities = []manifest.Capability{{ID: manifest.CapGatewayHook}, {ID: manifest.CapAppEvents}, {ID: manifest.CapHTTPRoutes}}
	kept := up.HostPermissions[:0]
	for _, hp := range up.HostPermissions {
		if hp.ID != "jobs" {
			kept = append(kept, hp)
		}
	}
	up.HostPermissions = kept
	up.UserPermissions = append(up.UserPermissions, manifest.UserPermission{Key: "rules:export", Label: manifest.LocalizedText{"en": "Export"}})
	r2, err := e.svc.Upload(ctx, pkgtest.Build(up, e.root), e.admin, UploadOptions{})
	if err != nil {
		t.Fatalf("upload upgrade: %v", err)
	}
	if r2.Diff == nil || r2.UpgradeFrom != "0.1.0" {
		t.Fatalf("upgrade review = %+v", r2)
	}
	ids := func(items []DiffItem) []string {
		var out []string
		for _, it := range items {
			out = append(out, it.ID)
		}
		return out
	}
	// net was granted narrower than requested, so it shows up as widened too.
	if a, w, rm := ids(r2.Diff.Added), ids(r2.Diff.Widened), ids(r2.Diff.Removed); len(a) != 1 || a[0] != "log" ||
		len(w) != 2 || w[0] != "events" || w[1] != "net" || len(rm) != 1 || rm[0] != "jobs" {
		t.Fatalf("diff added=%v widened=%v removed=%v", a, w, rm)
	}
	// Widened events must be granted explicitly.
	if _, err := e.svc.Consent(ctx, "guard", "0.2.0", ConsentRequest{}, e.admin); fieldCode(err, "permission:events") != "consent_required" {
		t.Fatalf("upgrade consent without events: %v", err)
	}
	// Carried-over grants need no critical right; events is medium.
	res, err = e.svc.Consent(ctx, "guard", "0.2.0", ConsentRequest{Grants: []GrantInput{{Permission: "events"}}, RoleKeysForNewPermissions: []string{"admin"}}, e.limited)
	if err != nil {
		t.Fatalf("upgrade consent: %v", err)
	}
	if !res.Upgrade || res.Status != StatusEnabled {
		t.Fatalf("upgrade result = %+v", res)
	}
	last := e.perms.syncs[len(e.perms.syncs)-1]
	if len(last.defs) != 4 || last.roles[0] != "admin" {
		t.Fatalf("upgrade permission sync = %+v", last)
	}
	var consent string
	_ = e.db.Pool.QueryRow(ctx, `SELECT consent_status FROM plugin_versions WHERE plugin_key = 'guard' AND version = '0.2.0'`).Scan(&consent)
	if consent != ConsentApproved {
		t.Fatalf("consent = %s", consent)
	}
	// A further version whose host permissions are all already granted is
	// approved on upload (net was denied above, so it is dropped here).
	cp := *up
	same := &cp
	same.Version = "0.2.1"
	same.HostPermissions = nil
	for _, hp := range up.HostPermissions {
		if hp.ID != "net" {
			same.HostPermissions = append(same.HostPermissions, hp)
		}
	}
	same.ExternalServices = nil
	r3, err := e.svc.Upload(ctx, pkgtest.Build(same, e.root), e.admin, UploadOptions{})
	if err != nil {
		t.Fatalf("upload same-permission version: %v", err)
	}
	if r3.ConsentStatus != ConsentApproved || len(r3.Diff.Added)+len(r3.Diff.Widened) != 0 {
		t.Fatalf("same-permission upgrade review = %+v diff=%+v", r3.ConsentStatus, r3.Diff)
	}
	// Removed grant stays until activation; ApplyDefaults prunes it.
	g, _ := LoadGrants(ctx, e.db.Pool, "guard")
	if _, ok := g["jobs"]; !ok {
		t.Fatal("jobs grant removed before activation")
	}
	if err := e.db.Tx(ctx, func(tx pgx.Tx) error {
		return NewDefaultsApplier(nil, nil).ApplyDefaults(ctx, tx, up, nil)
	}); err != nil {
		t.Fatal(err)
	}
	g, _ = LoadGrants(ctx, e.db.Pool, "guard")
	if _, ok := g["jobs"]; ok {
		t.Fatal("jobs grant not pruned")
	}

	// Revoke one grant; net was denied by the upgrade consent (not re-approved).
	if g["net"].Status != GrantDenied {
		t.Fatalf("net = %+v", g["net"])
	}
	if err := e.svc.RevokeGrant(ctx, "guard", "log", e.admin); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.RevokeGrant(ctx, "guard", "net", e.admin); core.AsError(err).Code != "not_found" {
		t.Fatalf("revoke denied grant: %v", err)
	}

	// Uninstall refuses during an open rollout.
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO plugin_rollouts (plugin_key, action, phase) VALUES ('guard', 'upgrade', 'preparing')`); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Uninstall(ctx, "guard", UninstallOptions{Purge: true}, e.admin); core.AsError(err).Code != "conflict" {
		t.Fatalf("uninstall during rollout: %v", err)
	}
	if _, err := e.db.Pool.Exec(ctx, `UPDATE plugin_rollouts SET phase = 'cancelled'`); err != nil {
		t.Fatal(err)
	}
	if _, err := e.db.Pool.Exec(ctx, `INSERT INTO plugin_egress_domains (plugin_key, host) VALUES ('guard', 'example.com')`); err != nil {
		t.Fatal(err)
	}
	ures, err := e.svc.Uninstall(ctx, "guard", UninstallOptions{Purge: true, PurgeAccounts: true}, e.admin)
	if err != nil {
		t.Fatalf("uninstall: %v", err)
	}
	if ures.AccountsDeleted != 3 || len(e.accounts.purged) != 1 || e.accounts.purged[0] != "guard" {
		t.Fatalf("account purge: res=%+v purged=%v", ures, e.accounts.purged)
	}
	var purgeAudit int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE action = 'plugin.accounts.purge'
		AND target_id = 'guard' AND (detail->>'accounts_deleted')::int = 3`).Scan(&purgeAudit)
	if purgeAudit != 1 {
		t.Fatalf("account purge audit rows = %d", purgeAudit)
	}
	if len(e.rollout.disabled) != 1 || len(e.schemas.dropped) != 1 || len(e.perms.deleted) != 1 {
		t.Fatalf("uninstall side effects: disabled=%v dropped=%v deleted=%v", e.rollout.disabled, e.schemas.dropped, e.perms.deleted)
	}
	var n int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_versions WHERE plugin_key = 'guard'`).Scan(&n)
	if n != 0 {
		t.Fatalf("versions left: %d", n)
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_egress_domains WHERE plugin_key = 'guard'`).Scan(&n)
	if n != 0 {
		t.Fatalf("egress domains left: %d", n)
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE target_id = 'guard'`).Scan(&n)
	if n < 6 {
		t.Fatalf("audit rows = %d", n)
	}
}

func TestRejectAndCommunityTrust(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	k := pkgtest.NewKey("acme-1")
	pub, err := e.svc.CreatePublisher(ctx, CreatePublisherInput{Name: "acme", TrustLevel: pkg.TrustCommunity,
		Keys: []KeyInput{{KeyID: k.ID, PublicKey: k.PubB64()}}}, e.admin)
	if err != nil || len(pub.Keys) != 1 {
		t.Fatalf("create publisher: %v %+v", err, pub)
	}
	// Community cannot ship native UI / critical permissions.
	if _, err := e.svc.Upload(ctx, pkgtest.Build(pkgtest.Guard("acme_guard", "1.0.0", "acme"), k), e.admin, UploadOptions{}); fieldCode(err, "ui.native") != "trust_insufficient" {
		t.Fatalf("community native ui: %v", err)
	}
	mini := pkgtest.Minimal("acme_tool", "1.0.0", "acme")
	if _, err := e.svc.Upload(ctx, pkgtest.Build(mini, k), e.admin, UploadOptions{}); err != nil {
		t.Fatalf("upload: %v", err)
	}
	// Another publisher cannot take the key over.
	other := pkgtest.Minimal("acme_tool", "1.0.1", "sub2api")
	if _, err := e.svc.Upload(ctx, pkgtest.Build(other, e.root), e.admin, UploadOptions{}); core.AsError(err).Code != "conflict" {
		t.Fatalf("takeover: %v", err)
	}
	if err := e.svc.Reject(ctx, "acme_tool", "1.0.0", e.admin); err != nil {
		t.Fatal(err)
	}
	var n int
	_ = e.db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugins WHERE key = 'acme_tool'`).Scan(&n)
	if n != 0 {
		t.Fatal("rejected new plugin should be removed")
	}
	// Market pinning.
	if _, err := e.svc.Upload(ctx, pkgtest.Build(mini, k), e.admin, UploadOptions{ExpectKey: "other"}); core.AsError(err).Code != "invalid_argument" {
		t.Fatalf("expect key: %v", err)
	}
}

func TestPublisherRevocation(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	k := pkgtest.NewKey("acme-1")
	pub, err := e.svc.CreatePublisher(ctx, CreatePublisherInput{Name: "acme", TrustLevel: pkg.TrustVerified,
		Keys: []KeyInput{{KeyID: k.ID, PublicKey: k.PubB64()}}}, e.admin)
	if err != nil {
		t.Fatal(err)
	}
	k2 := pkgtest.NewKey("acme-2")
	if _, err := e.svc.AddPublisherKey(ctx, pub.ID, KeyInput{KeyID: k2.ID, PublicKey: k2.PubB64()}, e.admin); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"tool_a", "tool_b"} {
		signer := k
		if key == "tool_b" {
			signer = k2
		}
		if _, err := e.svc.Upload(ctx, pkgtest.Build(pkgtest.Minimal(key, "1.0.0", "acme"), signer), e.admin, UploadOptions{}); err != nil {
			t.Fatal(err)
		}
		if _, err := e.svc.Consent(ctx, key, "1.0.0", ConsentRequest{}, e.admin); err != nil {
			t.Fatal(err)
		}
		if _, err := e.db.Pool.Exec(ctx, `UPDATE plugins SET status = 'enabled', active_version = '1.0.0' WHERE key = $1`, key); err != nil {
			t.Fatal(err)
		}
	}
	res, err := e.svc.RevokeKey(ctx, k2.ID, "leaked", e.admin)
	if err != nil || res.RevokedVersions != 1 || len(res.DisabledPlugins) != 1 || res.DisabledPlugins[0] != "tool_b" {
		t.Fatalf("revoke key: %v %+v", err, res)
	}
	res, err = e.svc.RevokePublisher(ctx, pub.ID, "compromised", e.admin)
	if err != nil || res.RevokedVersions != 2 || len(res.DisabledPlugins) != 1 || res.DisabledPlugins[0] != "tool_a" {
		t.Fatalf("revoke publisher: %v %+v", err, res)
	}
	var sig string
	_ = e.db.Pool.QueryRow(ctx, `SELECT signature_status FROM plugin_versions WHERE plugin_key = 'tool_a'`).Scan(&sig)
	if sig != pkg.SigRevoked {
		t.Fatalf("signature_status = %s", sig)
	}
	// Uploads from a revoked publisher are refused.
	if _, err := e.svc.Upload(ctx, pkgtest.Build(pkgtest.Minimal("tool_c", "1.0.0", "acme"), k), e.admin, UploadOptions{}); core.AsError(err).Code != "permission_denied" {
		t.Fatalf("revoked upload: %v", err)
	}
}
