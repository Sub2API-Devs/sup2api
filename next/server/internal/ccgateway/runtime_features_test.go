package ccgateway

import (
	"context"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
	"net/http/httptest"
	"testing"
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
