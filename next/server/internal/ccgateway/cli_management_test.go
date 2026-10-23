package ccgateway

import (
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
		request := httptest.NewRequest(method, "/api/v1/system/ccgateway/cli/22", strings.NewReader(`{"action":"check"}`))
		request.Header.Set("Authorization", "Bearer fixture")
		out := httptest.NewRecorder()
		engine.ServeHTTP(out, request)
		if out.Code != 403 {
			t.Fatalf("unauthorized %s: %d", method, out.Code)
		}
	}
}

// cliViewFixture is the Worker's /admin/cli answer since the managed install
// was retired (CONTRACTS §53.21): the version check fills catalog, no tools
// are counted and nothing is ever updating.
const cliViewFixture = `{"catalog":{"installed_version":"2.1.304","catalog_version":"2.1.304","state":"ready","tool_count":0,"variant_count":0,"checked_at":"2026-10-24T00:00:00Z","synced_at":"2026-10-24T00:00:00Z"},"auto_update":false,"auto_update_mode":"managed","pinned_version":"2.1.304","channel":"stable","latest_version":"","release_checked_at":"0001-01-01T00:00:00Z","updating":false,"update_state":"idle","update_error":""}`

// TestCLIManagementAfterTheManagedInstall: the view of the current Worker is
// read; the tool catalog route is gone; POST only checks the release channel
// or re-reads the installed version, an update never reaches the Worker.
func TestCLIManagementAfterTheManagedInstall(t *testing.T) {
	var calls []string
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, r.Method+" "+r.URL.Path)
		if !strings.HasSuffix(r.URL.Path, "/admin/cli") || r.Header.Get("X-CCG-Revision") == "" {
			t.Error("unexpected Worker call", r.Method, r.URL.Path)
		}
		_, _ = w.Write([]byte(cliViewFixture))
	})
	id := f.account(true)
	path := fmt.Sprintf("/system/ccgateway/cli/%d", id)
	code, out := f.request(1, "GET", path, "")
	if code != 200 || data(out)["updating"] != false || data(out)["catalog"].(map[string]any)["tool_count"] != float64(0) {
		t.Fatal("CLI view", code, out)
	}
	for _, action := range []string{"check", "sync"} {
		if code, out := f.request(1, "POST", path, `{"action":"`+action+`"}`); code != 200 {
			t.Fatal(action, code, out)
		}
	}
	if len(calls) != 3 {
		t.Fatal("calls", calls)
	}
	if code, out := f.request(1, "POST", path, `{"action":"update"}`); code != 400 || len(calls) != 3 {
		t.Fatal("update reached the Worker or was accepted", code, out, calls)
	}
	if code, _ := f.request(1, "GET", path+"/catalog", ""); code != 404 || len(calls) != 3 {
		t.Fatal("the tool catalog route is retired", code, calls)
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
		{http.MethodPost, `{"action":"update"}`, false},
		{http.MethodPost, `{"action":"check"}`, true},
		{http.MethodPost, `{"action":"sync"}`, true},
		{http.MethodPost, `{"action":"check","channel":"stable"}`, false},
		{http.MethodPost, `{"action":"exec"}`, false},
		{http.MethodPost, `{"action":"check"} {}`, false},
	} {
		if _, err := cliManagementBody(tc.method, []byte(tc.body)); (err == nil) != tc.valid {
			t.Errorf("%s %s: %v", tc.method, tc.body, err)
		}
	}
}
