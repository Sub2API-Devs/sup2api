package ccgateway

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestReviewHelperRequirementDBDirectTransportAndLegacy404(t *testing.T) {
	controlCalls := 0
	f := newRuntimeFixture(t, func(w http.ResponseWriter, r *http.Request) {
		controlCalls++
		if r.Method != "GET" || !strings.HasSuffix(r.URL.Path, "/connection") || r.Header.Get("X-CCG-Revision") == "" {
			t.Error("probe body routed through controller or revision absent")
		}
		json.NewEncoder(w).Encode(accountConnection{IP: "10.52.74.181", Port: 8787, Key: strings.Repeat("k", 32), Revision: r.Header.Get("X-CCG-Revision")})
	})
	id := f.account(true)
	status, body := 200, `{"version":1,"decision":"needs_custody"}`
	closed, workerCalls := 0, 0
	f.s.openAccount = func(_ context.Context, _ Config, target string) (*http.Client, func() error, error) {
		if target != "10.52.74.181:8787" {
			t.Error("wrong account endpoint")
		}
		return &http.Client{Transport: accountTransportFunc(func(r *http.Request) (*http.Response, error) {
			workerCalls++
			raw, _ := io.ReadAll(r.Body)
			if r.URL.Path != wire.RequirementPath || string(raw) != `{"messages":[],"model":"final"}` || r.Header.Get("x-api-key") != strings.Repeat("k", 32) || r.Header.Get("Authorization") != "" || r.Header.Get("X-CCGateway-Request-Policy") == "forged" {
				t.Error("probe changed body/identity/policy")
			}
			return &http.Response{StatusCode: status, Header: http.Header{}, Body: io.NopCloser(strings.NewReader(body)), Request: r}, nil
		})}, func() error { closed++; return nil }, nil
	}
	for _, mode := range []string{"ready", "legacy", "malformed", "failure"} {
		status, body = 200, `{"version":1,"decision":"needs_custody"}`
		switch mode {
		case "legacy":
			status = 404
		case "malformed":
			body = `{"version":1,"decision":"ordinary","decision":"needs_custody"}`
		case "failure":
			status = 503
		}
		req, _ := http.NewRequest("POST", "http://ccgateway.internal/v1/messages", strings.NewReader(`{"messages":[],"model":"final"}`))
		req.Header.Set("Authorization", "Bearer untrusted")
		req.Header.Set("X-CCGateway-Request-Policy", "forged")
		decision, err := f.s.HelperHistoryRequirement(context.Background(), id, req)
		if mode == "ready" && (err != nil || decision != wire.RequirementNeedsCustody) {
			t.Fatal("valid probe", err)
		}
		if mode == "legacy" && (err != nil || decision != wire.RequirementDeferToOrdinary) {
			t.Fatal("legacy 404 promoted or blocked", err)
		}
		if (mode == "malformed" || mode == "failure") && err == nil {
			t.Fatal("failed probe accepted")
		}
	}
	if controlCalls != 4 || workerCalls != 4 || closed != 4 {
		t.Fatal("connection lifecycle changed", controlCalls, workerCalls, closed)
	}
}
