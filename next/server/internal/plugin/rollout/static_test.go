package rollout_test

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

// declaredManifest is a runtime "none" package: an account type of the
// built-in openai platform served from its upstream declaration.
func declaredManifest(key, version string) *manifest.Manifest {
	return &manifest.Manifest{
		APIVersion: 1, Key: key, Name: manifest.LocalizedText{"en": "Declared " + key}, Version: version, Publisher: "test",
		Runtime: manifest.RuntimeNone, HostCompat: ">=0.1.0",
		Capabilities: []manifest.Capability{{ID: manifest.CapPlatformAdapter}, {ID: manifest.CapPlatformWebSocket}},
		AccountTypes: []manifest.AccountType{{
			ID: "apikey", Label: manifest.LocalizedText{"en": "API key"},
			Form:      manifest.Form{Mode: "schema", Schema: "forms/apikey.schema.json", UISchema: "forms/apikey.ui.json"},
			Platforms: []manifest.AccountPlatform{{Platform: manifest.PlatformOpenAI}},
			Upstream:  &manifest.Upstream{Preset: "openai"},
		}},
	}
}

// The runtime dispatches a runtime "none" package to a static instance: no
// binary, no process, ready at once, no capability clients, grants read and
// re-read like a plugin process's; and the controller serves it.
func TestRuntimeNoneStaticInstance(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	m := declaredManifest(h.key, "1.0.0")
	registrytest.Install(t, h.db, m, registrytest.Package(t, m, nil, nil), map[string]string{"platform.register": `{}`}, "installed")

	mk := make([]byte, 32)
	cipher, _ := secret.New(mk)
	nd := &registrytest.Node{RDB: h.rdb, ID: "solo", Boot: "boot-solo"}
	nd.Heartbeat(ctx)
	launcher := &registrytest.Launcher{}
	grt, err := grpcruntime.New(grpcruntime.Options{DB: h.db, Redis: h.rdb, Cipher: cipher, Node: nd,
		Launcher: launcher, DataDir: t.TempDir(), HostVersion: "0.1.0"})
	if err != nil {
		t.Fatal(err)
	}
	pkgs := registry.NewPackages(h.db, t.TempDir(), registry.WithSource(registrytest.Source()))
	t.Cleanup(pkgs.Close)
	pkg, err := pkgs.Open(ctx, h.key, "1.0.0")
	if err != nil {
		t.Fatal(err)
	}
	rt := rollout.FromGRPC(grt)
	inst, err := rt.Load(ctx, pkg)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if _, ok := inst.(*grpcruntime.StaticInstance); !ok {
		t.Fatalf("instance = %T, want a static instance", inst)
	}
	if state, msg := inst.State(); state != grpcruntime.StateReady || msg != "" || inst.Restarts() != 0 {
		t.Fatalf("state = %s %q restarts %d", state, msg, inst.Restarts())
	}
	if inst.Platform() != nil || inst.Hook() != nil || inst.App() != nil || inst.HTTP() != nil || inst.Scheduler() != nil {
		t.Fatal("a static instance has no capability clients")
	}
	if launcher.Commands != 0 {
		t.Fatalf("launched %d processes", launcher.Commands)
	}
	if g := inst.Grants(); !g.Has("platform.register") || len(g) != 1 {
		t.Fatalf("grants = %v", g)
	}
	if _, err := h.db.Pool.Exec(ctx, `INSERT INTO plugin_permission_grants (plugin_key, permission, scope, status, plugin_version, manifest_hash)
		VALUES ($1, 'kv', '{}', 'granted', '1.0.0', 'x')`, h.key); err != nil {
		t.Fatal(err)
	}
	if err := inst.Refresh(ctx); err != nil {
		t.Fatal(err)
	}
	if !inst.Grants().Has("kv") {
		t.Fatalf("grants after refresh = %v", inst.Grants())
	}
	if err := inst.MigrateData(ctx, "0.9.0", "1.0.0"); err != nil {
		t.Fatal(err)
	}
	inst.Drain(time.Millisecond)
	inst.Stop()

	// An incompatible host is refused before anything is loaded, as for a
	// plugin process.
	old, err := grpcruntime.New(grpcruntime.Options{DB: h.db, Redis: h.rdb, Cipher: cipher, Node: nd,
		Launcher: launcher, DataDir: t.TempDir(), HostVersion: "0.0.1"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := rollout.FromGRPC(old).Load(ctx, pkg); err == nil {
		t.Fatal("loaded on an incompatible host")
	}

	reg := registry.New()
	ctl, err := rollout.New(rollout.Options{DB: h.db, Node: nd, Bus: registrytest.Bus{RDB: h.rdb}, Packages: pkgs,
		Registry: reg, Runtime: rt, Defaults: h.rec, Perms: h.rec, Events: h.rec,
		ReconcileInterval: 150 * time.Millisecond, LeaseTTL: 8 * time.Second, LeaseRenew: time.Second,
		CoordinatorTick: 100 * time.Millisecond, DrainTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	ctl.Start(ctx)
	t.Cleanup(func() { ctl.Stop(context.Background()) })
	if _, err := ctl.Enable(ctx, h.key, 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "enabled and served", func() bool {
		s, act, _ := h.plugin()
		p, ok := reg.Current().Plugin(h.key)
		return s == "enabled" && act == "1.0.0" && ok && p.Version == "1.0.0"
	})
	if launcher.Commands != 0 {
		t.Fatalf("launched %d processes", launcher.Commands)
	}
}

// A plugin switches between runtimes with an ordinary upgrade: from a plugin
// process to runtime "none" (the core serves the declared account type and
// the process is drained away) and back again (a rollback to the old
// version starts a process once more).
func TestUpgradeBetweenGRPCAndNone(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	h.bin = registrytest.TestPlugin(t)
	registrytest.Install(t, h.db, h.manifest("1.0.0"), h.pkg("1.0.0"), registrytest.DefaultGrants(), "installed")
	t.Cleanup(func() { _ = dbschema.New(h.db, "", nil, false).Drop(context.Background(), h.key) })

	mk := make([]byte, 32)
	cipher, _ := secret.New(mk)
	nd := &registrytest.Node{RDB: h.rdb, ID: "solo", Boot: "boot-solo"}
	nd.Heartbeat(ctx)
	launcher := &registrytest.Launcher{}
	grt, err := grpcruntime.New(grpcruntime.Options{DB: h.db, Redis: h.rdb, Cipher: cipher, Node: nd,
		Launcher: launcher, DataDir: t.TempDir(), DrainTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	pkgs := registry.NewPackages(h.db, t.TempDir(), registry.WithSource(registrytest.Source()))
	t.Cleanup(pkgs.Close)
	reg := registry.New()
	ctl, err := rollout.New(rollout.Options{DB: h.db, Node: nd, Bus: registrytest.Bus{RDB: h.rdb}, Packages: pkgs,
		Registry: reg, Runtime: rollout.FromGRPC(grt),
		Schemas:           dbschema.New(h.db, h.db.Pool.Config().ConnString(), mk, false),
		ReconcileInterval: 200 * time.Millisecond, LeaseTTL: 8 * time.Second, LeaseRenew: time.Second,
		CoordinatorTick: 100 * time.Millisecond, DrainTimeout: time.Second})
	if err != nil {
		t.Fatal(err)
	}
	ctl.Start(ctx)
	t.Cleanup(func() { ctl.Stop(context.Background()) })

	served := func(version string, declared bool) func() bool {
		return func() bool {
			s, act, _ := h.plugin()
			p, _ := reg.Current().Plugin(h.key)
			b, ok := reg.Current().AccountType(h.key, "apikey")
			_, isDeclared := b.Client.(core.DeclaredUpstream)
			return s == "enabled" && act == version && p.Version == version && ok && isDeclared == declared
		}
	}
	if _, err := ctl.Enable(ctx, h.key, 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "1.0.0 served by its process", served("1.0.0", false))
	started := launcher.Commands

	m := declaredManifest(h.key, "2.0.0")
	registrytest.AddVersion(t, h.db, m, registrytest.Package(t, m, nil, nil))
	if _, err := ctl.Upgrade(ctx, h.key, "2.0.0", 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "2.0.0 served by the core", served("2.0.0", true))
	waitFor(t, "1.0.0 released", func() bool {
		refs := pkgs.Cached()
		return len(refs) == 1 && refs[0].Version == "2.0.0"
	})
	if launcher.Commands != started {
		t.Fatalf("runtime none started %d processes", launcher.Commands-started)
	}

	if _, err := ctl.Upgrade(ctx, h.key, "1.0.0", 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "1.0.0 served by a process again", served("1.0.0", false))
	if launcher.Commands == started {
		t.Fatal("the rollback started no process")
	}
}
