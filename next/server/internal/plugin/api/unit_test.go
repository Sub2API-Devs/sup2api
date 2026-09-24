package api

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
)

// GET /market/plugins keeps data as the plugin array and reports the core
// version as a top-level host_version.
func TestMarketPluginsHostVersion(t *testing.T) {
	svc := install.New(install.Deps{}, install.Options{HostVersion: "0.3.1-dev"})
	a := New(Deps{Install: svc})
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	a.RegisterRoutes(httpapi.NewRouter(engine, tokens{}, authz{}, stepUp{}))
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
