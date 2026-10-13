package ccgateway

import (
	"encoding/json"
	"fmt"
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

func TestCLIToolCatalogRouteRequiresReadPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	engine := gin.New()
	auth := ccgRouteAuth{false}
	(&Service{}).RegisterRoutes(httpapi.NewRouter(engine, auth, auth))
	request := httptest.NewRequest("GET", "/api/v1/system/ccgateway/cli/22/catalog", nil)
	request.Header.Set("Authorization", "Bearer fixture")
	out := httptest.NewRecorder()
	engine.ServeHTTP(out, request)
	if out.Code != 403 {
		t.Fatal("catalog read bypassed permissions", out.Code)
	}
}

const cliCatalogFixture = `{"catalog":{"installed_version":"2.1.296","catalog_version":"2.1.296","state":"ready","tool_count":1,"variant_count":2,"checked_at":"2026-10-13T00:00:00Z","synced_at":"2026-10-13T00:00:00Z"},"tools":[{"name":"Read","variants":[{"description":" Read\n保留空格 ","input_schema":{"type":"object","properties":{"n":{"description":" parameter\n","maximum":9007199254740993,"type":"integer"}},"required":["n"],"additionalProperties":false}},{"description":"","input_schema":{"type":"object"}}]}]}`

func TestCLIToolCatalogDecode(t *testing.T) {
	value, err := decodeCLIToolCatalog([]byte(cliCatalogFixture))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(value)
	if err != nil || !strings.Contains(string(raw), "9007199254740993") || value.Tools[0].Variants[0].Description == nil || *value.Tools[0].Variants[0].Description != " Read\n保留空格 " {
		t.Fatal("tool definition changed", string(raw), err)
	}
	for _, bad := range []string{
		strings.Replace(cliCatalogFixture, `"state":"ready"`, `"state":"failed"`, 1),
		strings.Replace(cliCatalogFixture, `"catalog_version":"2.1.296"`, `"catalog_version":"2.1.292"`, 1),
		strings.Replace(cliCatalogFixture, `"tool_count":1`, `"tool_count":2`, 1),
		strings.Replace(cliCatalogFixture, `"variant_count":2`, `"variant_count":1`, 1),
		strings.Replace(cliCatalogFixture, `"name":"Read"`, `"name":"mcp__client__Read"`, 1),
		strings.Replace(cliCatalogFixture, `"description":""`, `"description":null`, 1),
		strings.Replace(cliCatalogFixture, `"input_schema":{"type":"object"}`, `"input_schema":null`, 1),
		strings.Replace(cliCatalogFixture, `"input_schema":{"type":"object"}`, `"input_schema":[]`, 1),
		strings.Replace(cliCatalogFixture, `"input_schema":{"type":"object"}`, `"input_schema":{"type":"string"}`, 1),
		cliCatalogFixture + `{}`,
	} {
		if _, err := decodeCLIToolCatalog([]byte(bad)); err == nil {
			t.Fatal("invalid catalog accepted", bad)
		}
	}
}

func TestCLIToolCatalogProxy(t *testing.T) {
	payload := strings.Replace(cliCatalogFixture, `"description":""`, `"description":"`+strings.Repeat("long description ", 2048)+`"`, 1)
	status, calls := http.StatusOK, 0
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		calls++
		if r.Method != "GET" || !strings.HasSuffix(r.URL.Path, "/admin/cli/catalog") || r.Header.Get("Authorization") != "Bearer controller-secret" || r.Header.Get("X-CCG-Revision") == "" {
			t.Error("wrong catalog forwarding", r.Method, r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(payload))
	})
	id := f.account(true)
	path := fmt.Sprintf("/system/ccgateway/cli/%d/catalog", id)
	f.auth.keys[1] = []string{"settings:read"}
	code, response := f.request(1, "GET", path, "")
	if code != 200 || calls != 1 || len(data(response)["tools"].([]any)) != 1 {
		t.Fatal("read-only catalog proxy failed", code, response, calls)
	}
	for _, method := range []string{"POST", "PUT", "DELETE"} {
		code, _ := f.request(1, method, path, `{"action":"update"}`)
		if code < 400 || calls != 1 {
			t.Fatal("catalog mutation reached Worker", method, code, calls)
		}
	}
	for _, upstream := range []int{404, 503} {
		status, payload = upstream, `{"error":{"type":"api_error","message":"unavailable"}}`
		if code, _ := f.request(1, "GET", path, ""); code < 400 {
			t.Fatal("unsupported or unavailable catalog reported success", upstream)
		}
	}
	status, payload = 200, strings.Repeat("x", (8<<20)+1)
	if code, _ := f.request(1, "GET", path, ""); code != 503 {
		t.Fatal("oversized catalog accepted", code)
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
