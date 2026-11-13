package api

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// GET /market/plugins keeps data as the plugin array and reports the core
// version as a top-level host_version.
func TestMarketPluginsHostVersion(t *testing.T) {
	svc := install.New(install.Deps{}, install.Options{HostVersion: "0.3.1-dev"})
	a := New(Deps{Install: svc})
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	a.RegisterRoutes(httpapi.NewRouter(engine, tokens{}, authz{}))
	h := &harness{t: t, engine: engine}

	code, out := h.do("GET", "/market/plugins", "admin", nil)
	if code != 200 || out["host_version"] != "0.3.1-dev" {
		t.Fatalf("market = %d %v", code, out)
	}
	if list, ok := out["data"].([]any); !ok || len(list) != 0 {
		t.Fatalf("market data = %v", out["data"])
	}
}

func TestResourcesMessage(t *testing.T) {
	running := resourcesMessage(true, install.StatusEnabled)
	if !strings.Contains(running["zh"], "已通知各节点按新限制重启插件实例") || !strings.Contains(running["en"], "restart") {
		t.Fatalf("running = %v", running)
	}
	if m := resourcesMessage(true, install.StatusDisabled); !strings.Contains(m["en"], "enabled") || m["zh"] == "" {
		t.Fatalf("disabled = %v", m)
	}
	if m := resourcesMessage(false, install.StatusEnabled); !strings.Contains(m["en"], "next time") || m["zh"] == "" {
		t.Fatalf("not notified = %v", m)
	}
}

// refusingTokens refuses every step-up proof (shallower than the pass
// tokens embeds), to show which routes ask for one.
type refusingTokens struct {
	tokens
	testutil.StepUpRefused
}

// Code execution and trust roots take a step-up proof (CONTRACTS §80.2):
// installing, consenting and the publishers' writes; rejecting, enabling,
// uninstalling and reading do not.
func TestPluginRoutesStepUp(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	New(Deps{}).RegisterRoutes(httpapi.NewRouter(engine, refusingTokens{}, authz{}))
	h := &harness{t: t, engine: engine}
	for _, tc := range []struct {
		method, path string
		stepUp       bool
	}{
		{"POST", "/plugins/upload", true},
		{"POST", "/plugins/install-from-market", true},
		{"POST", "/plugins/guard/versions/0.1.0/consent", true},
		{"POST", "/publishers", true},
		{"POST", "/publishers/1/keys", true},
		{"POST", "/publishers/1/revoke", true},
		{"POST", "/publisher-keys/k/revoke", true},
		// Not these (no database here: they fail further on, not with 403).
		{"POST", "/plugins/guard/versions/0.1.0/reject", false},
		{"POST", "/plugins/guard/enable", false},
		{"DELETE", "/plugins/guard", false},
		{"GET", "/publishers", false},
	} {
		code, out := h.do(tc.method, tc.path, "admin", nil)
		e, _ := out["error"].(map[string]any)
		if got := code == 403 && e["code"] == "verification_required"; got != tc.stepUp {
			t.Errorf("%s %s: %d %v, step-up wanted %v", tc.method, tc.path, code, out, tc.stepUp)
		}
	}
}
