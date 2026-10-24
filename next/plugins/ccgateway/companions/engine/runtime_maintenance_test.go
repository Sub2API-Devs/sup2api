package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func TestRuntimeMaintenanceDoesNotInterruptActiveRequests(t *testing.T) {
	r := &Runtime{admin: &authManager{key: "admin"}, requests: 1, life: context.Background(), Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) })}
	call := func(body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/admin/runtime", bytes.NewBufferString(body))
		req.Header.Set("Authorization", "Bearer admin")
		out := httptest.NewRecorder()
		r.serveRuntimeMaintenance(out, req)
		return out
	}
	require.Equal(t, 409, call(`{"action":"pause"}`).Code)
	require.Empty(t, r.runtimeLease)
	r.requests = 0
	out := call(`{"action":"pause"}`)
	require.Equal(t, 200, out.Code)
	var reply map[string]any
	require.NoError(t, json.Unmarshal(out.Body.Bytes(), &reply))
	lease := reply["lease"].(string)
	require.Len(t, lease, 48)
	request := httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString("{}"))
	blocked := httptest.NewRecorder()
	r.ServeHTTP(blocked, request)
	require.Equal(t, 503, blocked.Code)
	r.runtimeLeaseExpires = time.Now().Add(-time.Minute)
	blocked = httptest.NewRecorder()
	r.ServeHTTP(blocked, request)
	require.Equal(t, 503, blocked.Code, "expiry must not reopen admission while deployment may still be switching")
	require.Equal(t, 409, call(`{"action":"validate","lease":"`+lease+`"}`).Code)
	statusRequest := httptest.NewRequest("GET", "/admin/runtime", nil)
	statusRequest.Header.Set("Authorization", "Bearer admin")
	status := httptest.NewRecorder()
	r.serveRuntimeMaintenance(status, statusRequest)
	require.Equal(t, 200, status.Code)
	require.Contains(t, status.Body.String(), lease, "authenticated recovery can recover a lost token")
	require.Contains(t, status.Body.String(), `"expired":true`)
	require.Equal(t, 409, call(`{"action":"resume","lease":"wrong"}`).Code)
	require.Equal(t, 200, call(`{"action":"resume","lease":"`+lease+`"}`).Code)
	require.Empty(t, r.runtimeLease)
	require.Zero(t, r.requests)
}

func TestNativeBootstrapNeverServesModelRequests(t *testing.T) {
	g := &Gateway{MaintenanceOnly: true, Runner: &Runner{}, CLIInfo: cliRequestInfo{Capabilities: []string{"request_build", "request_direct", features.BuildContentPreservationCapability}}}
	r := &Runtime{maintenanceOnly: true, gateway: g, cli: newCLICheck("2.1.304", nil), life: context.Background(), Handler: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { t.Fatal("business handler must not run") })}
	out := httptest.NewRecorder()
	r.ServeHTTP(out, httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString(`{}`)))
	require.Equal(t, 409, out.Code)
	// Neither health answer offers what the CLI could do.
	require.Empty(t, r.Facts().Capabilities)
	require.Empty(t, r.Facts().ExecutionModes)
}
