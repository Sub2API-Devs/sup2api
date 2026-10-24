package ccgateway

import (
	"encoding/json"
	"net/http/httptest"
	"slices"
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
			// The catalog is pinned by value: a feature that disappears (or a
			// version that changes) has to change this test too, so the
			// endpoint can never silently lose an entry.
			if response.Data.RuntimeVerified {
				t.Fatal("a catalog is not runtime evidence")
			}
			if response.Data.CatalogVersion != "2026-10-20.request-attachments-v1" || response.Data.PolicySchemaVersion != 1 {
				t.Fatalf("catalog identity: %+v", response.Data)
			}
			ids := []string{}
			for _, f := range response.Data.Features {
				ids = append(ids, f.ID)
			}
			if !slices.Equal(ids, []string{"F-REQUEST-MODES", "F-BUILD-ATTACHMENTS"}) {
				t.Fatalf("catalog features: %v", ids)
			}
			if response.Data.Features[1].Status != "supported" || len(response.Data.Features[1].Mechanisms) == 0 {
				t.Fatalf("build attachments entry lost its content: %+v", response.Data.Features[1])
			}
		})
	}
}
