package bootstrap

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/config"
)

func TestCaddyConfigBuildsOrderedDataPlaneChain(t *testing.T) {
	document, err := CaddyConfig(config.Config{
		ListenAddress:         ":9999",
		NodeID:                "node-a",
		ControlPlaneTarget:    "unix:///tmp/control.sock",
		ControlPlaneInsecure:  true,
		StartupRequired:       true,
		DialTimeout:           time.Second,
		RequestTimeout:        time.Second,
		GracePeriod:           10 * time.Second,
		LeaseRenewInterval:    7 * time.Second,
		SettlementWALPath:     t.TempDir(),
		SettlementWALMaxBytes: 1 << 20,
	})
	if err != nil {
		t.Fatalf("CaddyConfig: %v", err)
	}

	var decoded map[string]any
	if err := json.Unmarshal(document, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	apps := decoded["apps"].(map[string]any)
	if apps["sup2api"] == nil || apps["http"] == nil {
		t.Fatal("sup2api and http apps must both be configured")
	}
	httpApp := apps["http"].(map[string]any)
	server := httpApp["servers"].(map[string]any)["ai"].(map[string]any)
	if got := server["listen"].([]any)[0]; got != ":9999" {
		t.Fatalf("listen = %v", got)
	}
	routes := server["routes"].([]any)
	if len(routes) < 4 {
		t.Fatalf("routes = %d", len(routes))
	}
	want := []string{"sup2api_request_id", "sup2api_auth", "sup2api_admission", "sup2api_lease", "sup2api_settlement", "sup2api_gateway"}
	var handlers []any
	for _, rawRoute := range routes {
		candidate, _ := rawRoute.(map[string]any)["handle"].([]any)
		if len(candidate) == len(want) && candidate[2].(map[string]any)["handler"] == "sup2api_admission" {
			handlers = candidate
			break
		}
	}
	if handlers == nil {
		t.Fatal("ordered HTTP data-plane route was not found")
	}
	for i, name := range want {
		got := handlers[i].(map[string]any)["handler"]
		if got != name {
			t.Fatalf("handler[%d] = %v, want %s", i, got, name)
		}
	}
	if got := handlers[3].(map[string]any)["renew_interval"]; got != "7s" {
		t.Fatalf("lease renew interval = %v", got)
	}
}
