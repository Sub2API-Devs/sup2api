package rollout_test

import (
	"context"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/grpcruntime"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/rollout"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/secret"
)

// TestRealRuntimeSingleNode drives the controller with real plugin processes.
func TestRealRuntimeSingleNode(t *testing.T) {
	h := newHarness(t)
	ctx := context.Background()
	h.bin = registrytest.TestPlugin(t)
	registrytest.Install(t, h.db, h.manifest("1.0.0"), h.pkg("1.0.0"), registrytest.DefaultGrants(), "installed")
	t.Cleanup(func() { _ = dbschema.New(h.db, "", nil, false).Drop(context.Background(), h.key) })

	mk := make([]byte, 32)
	cipher, _ := secret.New(mk)
	nd := &registrytest.Node{RDB: h.rdb, ID: "solo", Boot: "boot-solo"}
	nd.Heartbeat(ctx)
	grt, err := grpcruntime.New(grpcruntime.Options{DB: h.db, Redis: h.rdb, Cipher: cipher, Node: nd,
		Launcher: &registrytest.Launcher{}, DataDir: t.TempDir(), DrainTimeout: 2 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	pkgs := registry.NewPackages(h.db, t.TempDir())
	t.Cleanup(pkgs.Close)
	reg := registry.New()
	ctl, err := rollout.New(rollout.Options{DB: h.db, Node: nd, Bus: registrytest.Bus{RDB: h.rdb}, Packages: pkgs,
		Registry: reg, Runtime: rollout.FromGRPC(grt),
		Schemas:           dbschema.New(h.db, h.db.Pool.Config().ConnString(), mk, false),
		ReconcileInterval: 200 * time.Millisecond, LeaseTTL: 8 * time.Second, LeaseRenew: time.Second,
		CoordinatorTick: 100 * time.Millisecond, DrainTimeout: 2 * time.Second})
	if err != nil {
		t.Fatal(err)
	}
	ctl.Start(ctx)
	t.Cleanup(func() { ctl.Stop(context.Background()) })

	call := func() map[string]string {
		b, ok := reg.Current().Platform("p_" + h.key)
		if !ok {
			return nil
		}
		resp, err := b.Client.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{})
		if err != nil {
			t.Fatalf("platform call: %v", err)
		}
		return resp.GetHeaders()
	}

	if _, err := ctl.Enable(ctx, h.key, 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "enabled", func() bool { s, _, _ := h.plugin(); return s == "enabled" })
	first := call()
	if first == nil || first["x-calls"] != "1" {
		t.Fatalf("first call: %v", first)
	}

	registrytest.AddVersion(t, h.db, h.manifest("2.0.0"), h.pkg("2.0.0"))
	if _, err := ctl.Upgrade(ctx, h.key, "2.0.0", 0); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "upgraded", func() bool {
		s, act, _ := h.plugin()
		p, _ := reg.Current().Plugin(h.key)
		return s == "enabled" && act == "2.0.0" && p.Version == "2.0.0"
	})
	second := call()
	if second["x-pid"] == first["x-pid"] || second["x-calls"] != "2" {
		t.Fatalf("after upgrade: %v (before %v)", second, first)
	}
	// MigrateData ran on the new version (the test plugin records it in KV).
	if v, _ := h.rdb.Get(ctx, "plugin:kv:"+h.key+":t:migrated").Result(); v != "1.0.0->2.0.0" {
		t.Fatalf("migrated = %q", v)
	}

	if _, err := ctl.Disable(ctx, h.key, 0, ""); err != nil {
		t.Fatal(err)
	}
	waitFor(t, "disabled", func() bool {
		_, ok := reg.Current().Platform("p_" + h.key)
		return !ok
	})
}
