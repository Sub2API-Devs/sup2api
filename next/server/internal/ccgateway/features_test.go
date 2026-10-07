package ccgateway

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

func TestFeatureCatalogAuthorizationAndNoRuntimeDependency(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, tc := range []struct {
		name       string
		permission string
		auth       bool
		want       int
	}{
		{"anonymous", "settings:read", false, 401},
		{"unrelated permission", "account:read", true, 403},
		{"manage alone does not grant read", "settings:manage", true, 403},
		{"settings reader", "settings:read", true, 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			engine := gin.New()
			auth := &keyAuth{keys: map[int64][]string{1: {tc.permission}}}
			// Empty service: no database, SSH target, controller or Worker required.
			(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
			req := httptest.NewRequest("GET", "/api/v1/system/ccgateway/features", nil)
			if tc.auth {
				req.Header.Set("Authorization", "Bearer test")
			}
			recorder := httptest.NewRecorder()
			engine.ServeHTTP(recorder, req)
			if recorder.Code != tc.want {
				t.Fatalf("status=%d want=%d", recorder.Code, tc.want)
			}
			if tc.want != 200 {
				return
			}
			if recorder.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("catalog must not be cached as runtime capability")
			}
			var response struct {
				Data features.Document `json:"data"`
			}
			if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
				t.Fatal(err)
			}
			if response.Data.RuntimeVerified || response.Data.CatalogVersion != features.CatalogVersion || response.Data.PolicySchemaVersion != features.PolicySchemaVersion || len(response.Data.Features) == 0 {
				t.Fatalf("invalid catalog: %+v", response.Data)
			}
		})
	}
}
