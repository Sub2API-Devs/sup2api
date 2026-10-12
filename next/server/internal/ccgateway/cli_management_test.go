package ccgateway

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

func TestCLIManagementRoutesRequirePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, method := range []string{"GET", "POST", "PUT"} {
		engine := gin.New()
		auth := ccgRouteAuth{false}
		(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
		request := httptest.NewRequest(method, "/api/v1/system/ccgateway/cli/22", strings.NewReader(`{"action":"update"}`))
		request.Header.Set("Authorization", "Bearer fixture")
		out := httptest.NewRecorder()
		engine.ServeHTTP(out, request)
		if out.Code != 403 {
			t.Fatalf("unauthorized %s: %d", method, out.Code)
		}
	}
}

func TestCLIManagementInput(t *testing.T) {
	for _, tc := range []struct {
		method, body string
		valid        bool
	}{
		{http.MethodPut, `{"auto_update":false,"channel":"stable"}`, true},
		{http.MethodPut, `{"auto_update":true,"channel":"latest"}`, true},
		{http.MethodPut, `{"channel":"latest"}`, false},
		{http.MethodPut, `{"auto_update":true,"channel":"stable; cmd"}`, false},
		{http.MethodPut, `{"auto_update":true,"channel":"stable","url":"https://invalid.test"}`, false},
		{http.MethodPost, `{"action":"update"}`, true},
		{http.MethodPost, `{"action":"check"}`, true},
		{http.MethodPost, `{"action":"sync"}`, true},
		{http.MethodPost, `{"action":"update","channel":"stable"}`, false},
		{http.MethodPost, `{"action":"exec"}`, false},
		{http.MethodPost, `{"action":"update"} {}`, false},
	} {
		if _, err := cliManagementBody(tc.method, []byte(tc.body)); (err == nil) != tc.valid {
			t.Errorf("%s %s: %v", tc.method, tc.body, err)
		}
	}
}
