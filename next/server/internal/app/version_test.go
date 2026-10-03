package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

type versionTokenVerifier struct{}

func (versionTokenVerifier) VerifyAccessToken(context.Context, string) (int64, error) { return 1, nil }

func TestSystemVersionReportsServingCoreOnlyAfterAuthentication(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	router := httpapi.NewRouter(engine, versionTokenVerifier{}, nil, nil)
	router.Authed(http.MethodGet, "/system/version", systemVersionHandler("0.1.9", true, "core-b", "boot-b"))
	for _, authenticated := range []bool{false, true} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/system/version", nil)
		req.Header.Set("X-Sub2api-Entry-Node", "forged-entry")
		req.Header.Set("X-Sub2api-Core-Node", "forged-core")
		if authenticated {
			req.Header.Set("Authorization", "Bearer test")
		}
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, req)
		if !authenticated {
			if response.Code != 401 {
				t.Fatal(response.Code)
			}
			continue
		}
		var body struct {
			Data struct {
				Version string `json:"version"`
				Managed bool   `json:"managed"`
				Node    string `json:"core_node_id"`
				Boot    string `json:"core_boot_id"`
			}
		}
		if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if response.Code != 200 || body.Data.Node != "core-b" || body.Data.Boot != "boot-b" || body.Data.Version != "0.1.9" || !body.Data.Managed {
			t.Fatalf("unexpected identity: %s", response.Body)
		}
		if response.Header().Get("X-Sub2api-Entry-Node") != "" {
			t.Fatal("core trusted a client-provided gateway identity")
		}
		if response.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("identity response is cacheable")
		}
	}
}
