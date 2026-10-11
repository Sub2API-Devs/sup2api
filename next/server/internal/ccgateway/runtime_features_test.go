package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRuntimeFeaturesRoutesRequirePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := ccgRouteAuth{false}
	(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	r := httptest.NewRequest("GET", "/api/v1/system/ccgateway/accounts/25/features", nil)
	r.Header.Set("Authorization", "Bearer test")
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, r)
	if w.Code != 403 {
		t.Fatal(w.Code)
	}
	for _, method := range []string{"POST", "PUT"} {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest(method, "/features", nil)
		(&Service{}).serveFeatures(c, context.Background(), accountDesired{Enabled: true})
		if w.Code != 404 {
			t.Fatal("mutation route accepted", method, w.Code)
		}
	}
	// A disabled account returns without touching storage, transport or reconcile.
	w = httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest("GET", "/features", nil)
	(&Service{}).serveFeatures(c, context.Background(), accountDesired{})
	if w.Code != 503 {
		t.Fatal(w.Code)
	}
}

func TestCoreRuntimeExecutionModesDecode(t *testing.T) {
	base := features.RuntimeCapabilities{ProtocolVersion: 1, Build: features.BuildInfo{Version: "fixture", Revision: "fixture"}, Catalog: features.Catalog(), PolicySchemaVersions: []int{1}, Probes: []features.RuntimeProbe{{Name: "cli_version", Status: "observed", Value: "2.1.292"}}, ModelProviderVerification: "not_run"}
	for _, tc := range []struct {
		name    string
		modes   []string
		invalid bool
	}{
		{"older Worker", nil, false},
		{"current Worker", []string{"legacy", "passthrough", "native"}, false},
		{"unknown mode", []string{"direct"}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			base.ExecutionModes = tc.modes
			raw, err := json.Marshal(base)
			require.NoError(t, err)
			doc, err := features.DecodeRuntimeCapabilities(raw)
			if tc.invalid {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			httpapi.OK(c, doc)
			var response struct {
				Data features.RuntimeCapabilities `json:"data"`
			}
			require.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
			assert.Equal(t, tc.modes, response.Data.ExecutionModes)
			assert.Equal(t, "not_run", response.Data.ModelProviderVerification)
			assert.False(t, response.Data.Catalog.RuntimeVerified)
			assert.Equal(t, "2.1.292", cliVersionOf(doc))
		})
	}
}

func TestCoreRequestPolicySchema(t *testing.T) {
	for _, raw := range []string{`{}`, `{"schema_version":1}`} {
		var p RequestPolicy
		if err := json.Unmarshal([]byte(raw), &p); err != nil || p.SchemaVersion != 1 {
			t.Fatal(raw, err)
		}
	}
	for _, raw := range []string{`{"schema_version":null}`, `{"schema_version":0}`, `{"schema_version":2}`, `{"schema_version":"1"}`} {
		var p RequestPolicy
		if json.Unmarshal([]byte(raw), &p) == nil {
			t.Fatal("accepted", raw)
		}
	}
	p := defaultRequestPolicy()
	p.SchemaVersion = 2
	if validateRequestPolicy(p) == nil {
		t.Fatal("future policy sent without a supported contract")
	}
}
