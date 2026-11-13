package rollout_test

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/authz"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
)

// The permission catalog across a plugin's life, with the real catalog and
// defaults applier: keys start disabled and turn active at enable; a key
// registered at consent for an upgrade which then fails stays (active, the
// plugin still runs) until the next activation syncs the catalog again.
func TestPermissionCatalogFollowsRollouts(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	az := authz.New(authz.Deps{DB: h.db})
	if err := az.SyncCore(ctx); err != nil {
		t.Fatal(err)
	}
	status := func(local string) string {
		t.Helper()
		var s string
		err := h.db.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT status FROM permissions WHERE key = $1), '')`,
			manifest.PermissionKey(h.key, local)).Scan(&s)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	version := func(v string, perms ...string) (*manifest.Manifest, []byte) {
		m := h.manifest(v)
		m.UserPermissions = nil
		for _, p := range perms {
			m.UserPermissions = append(m.UserPermissions, manifest.UserPermission{Key: p})
		}
		return m, registrytest.Package(t, m, h.bin, map[string][]byte{"migrations/0001.sql": []byte(`CREATE TABLE a (id int);`)})
	}
	defaults := install.NewDefaultsApplier(az)
	sync := func(ms ...*manifest.Manifest) {
		t.Helper()
		var defs []core.PermissionDef
		for _, m := range ms {
			defs = append(defs, install.PermissionDefs(m)...)
		}
		if err := h.db.Tx(ctx, func(tx pgx.Tx) error { return az.SyncPlugin(ctx, tx, h.key, defs, nil) }); err != nil {
			t.Fatal(err)
		}
	}
	upgrade := func(n *node, v, wantPhase string) {
		t.Helper()
		r, err := n.ctl.Upgrade(ctx, h.key, v, 0)
		if err != nil {
			t.Fatal(err)
		}
		waitFor(t, "upgrade to "+v+" is "+wantPhase, func() bool {
			phase, _, _ := h.rolloutRow(r.ID)
			return phase == wantPhase
		})
	}

	m1, p1 := version("1.0.0", "rules:read")
	registrytest.Install(t, h.db, m1, p1, map[string]string{"db.schema": "{}"}, "installed")
	t.Cleanup(func() { _ = dbschema.New(h.db, "", nil, false).Drop(context.Background(), h.key) })
	// Consent of the first version: the plugin does not run yet.
	sync(m1)
	if got := status("rules:read"); got != "disabled" {
		t.Fatalf("after install: rules:read %q", got)
	}

	n := h.node("node-a", "boot-a", func(o *rollout.Options) { o.Defaults, o.Perms = defaults, az })
	if _, err := n.ctl.Enable(ctx, h.key, 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "enable completes", func() bool { s, act, _ := h.plugin(); return s == "enabled" && act == "1.0.0" })
	if got := status("rules:read"); got != "active" {
		t.Fatalf("after enable: rules:read %q", got)
	}

	// Consent of 2.0.0 registers its new key next to the running ones; no
	// node can start it, so the upgrade fails and the key is left behind.
	m2, p2 := version("2.0.0", "rules:read", "audit:read")
	registrytest.AddVersion(t, h.db, m2, p2)
	sync(m1, m2)
	n.rt.mu.Lock()
	n.rt.fail["2.0.0"] = true
	n.rt.mu.Unlock()
	upgrade(n, "2.0.0", rollout.PhaseFailed)
	if s, act, _ := h.plugin(); s != "enabled" || act != "1.0.0" {
		t.Fatalf("after failed upgrade: %s %s", s, act)
	}
	if got := status("audit:read"); got != "active" {
		t.Fatalf("after failed upgrade: audit:read %q, want it kept", got)
	}

	// The next activation syncs the catalog with the version which runs.
	m3, p3 := version("3.0.0", "rules:read")
	registrytest.AddVersion(t, h.db, m3, p3)
	upgrade(n, "3.0.0", rollout.PhaseActive)
	if a, r := status("audit:read"), status("rules:read"); a != "" || r != "active" {
		t.Fatalf("after the next activation: audit:read %q, rules:read %q", a, r)
	}
}
