package grpcruntime_test

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

// TestDemoPlugins loads the real anthropic and guard packages built by
// tools/sub2api-plugin/scripts/build-demo.sh for the current platform
// (PLATFORMS=<goos>/<goarch>). Set S2P_DEMO_DIR to the output directory.
func TestDemoPlugins(t *testing.T) {
	dir := os.Getenv("S2P_DEMO_DIR")
	if dir == "" {
		t.Skip("S2P_DEMO_DIR not set")
	}
	e := setup(t, registrytest.DefaultGrants())
	rt := e.runtime(t, nil)
	ctx := context.Background()

	for _, file := range []string{"anthropic-0.1.0.s2plugin", "guard-0.1.0.s2plugin"} {
		data, err := os.ReadFile(filepath.Join(dir, file))
		if err != nil {
			t.Fatal(err)
		}
		probe, err := registry.LoadPackage(t.TempDir(), data, "", "")
		if err != nil {
			t.Fatal(err)
		}
		m := probe.Manifest
		_ = probe.Close()
		grants := map[string]string{}
		for _, hp := range m.HostPermissions {
			scope, _ := json.Marshal(hp.Scope)
			if hp.Scope == nil {
				scope = []byte("{}")
			}
			grants[hp.ID] = string(scope)
		}
		registrytest.Install(t, e.db, m, data, grants, "enabled")
		pkg, err := e.pkgs.Open(ctx, m.Key, m.Version)
		if err != nil {
			t.Fatal(err)
		}
		inst, err := rt.Load(ctx, pkg)
		if err != nil {
			t.Fatalf("load %s: %v", file, err)
		}
		t.Cleanup(inst.Stop)
		switch m.Key {
		case "anthropic":
			resp, err := inst.Platform().BuildTestRequest(ctx, &pluginv1.BuildTestRequestRequest{
				Account: &pluginv1.Account{Id: 1, Platform: "anthropic", Type: "apikey",
					CredentialsJson: `{"api_key":"sk-test"}`, SettingsJson: `{"base_url":"https://api.anthropic.com"}`},
			})
			if err != nil || resp.GetUrl() == "" {
				t.Fatalf("anthropic BuildTestRequest: %v %v", resp, err)
			}
			t.Logf("anthropic test request: %s %s", resp.GetMethod(), resp.GetUrl())
		case "guard":
			resp, err := inst.Hook().OnGatewayRequest(ctx, &pluginv1.GatewayRequestHookRequest{
				Meta: &pluginv1.RequestMeta{Model: "claude"}, Fields: map[string]string{"prompt_text": "hello"}})
			if err != nil {
				t.Fatalf("guard hook: %v", err)
			}
			t.Logf("guard decision: %s", resp.GetDecision())
		}
	}
}
