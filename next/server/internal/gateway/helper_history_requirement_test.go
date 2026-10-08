package gateway

import (
	"bytes"
	"context"
	"errors"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"io"
	"net/http"
	"testing"
)

func TestHelperRequirementOrdinaryPreservesHistoryAndResources(t *testing.T) {
	for _, decision := range []string{wire.RequirementOrdinary, wire.RequirementDeferToOrdinary} {
		t.Run(decision, func(t *testing.T) {
			raw := []byte(`{"model":"final-model","messages":[{"role":"user","content":"old"},{"role":"assistant","content":"done"},{"role":"user","content":"next"}],"output_config":{"task_budget":{"type":"tokens","total":20000}}}`)
			g := &Gateway{}
			g.d.EnableHelperHistory = true
			g.helperRequirement = func(_ context.Context, id int64, req *http.Request) (string, error) {
				got, _ := io.ReadAll(req.Body)
				if id != 22 || !bytes.Equal(got, raw) || req.Header.Get("Anthropic-Beta") != "fixture" {
					t.Fatal("probe changed final request")
				}
				return decision, nil
			}
			g.helperRuntime = func(context.Context, int64, string) (string, core.ResourceBinding, error) {
				t.Fatal("ordinary probe acquired issuer")
				return "", core.ResourceBinding{}, nil
			}
			c := &call{g: g, helperHistory: &helperHistoryRequest{prefixes: []string{"old"}, lookup: core.HelperHistoryLookup{State: core.HelperHistoryUnknown}}, resourceAccess: &modelResourceAccess{}}
			req, _ := http.NewRequest("POST", "http://ccgateway.internal/v1/messages", bytes.NewReader(raw))
			req.Header.Set("Anthropic-Beta", "fixture")
			if err := c.wrapHelperHistoryRequest(context.Background(), req, &core.Account{PluginKey: "ccgateway", ID: 22}, &typeRoute{}, raw); err != nil {
				t.Fatal(err)
			}
			got, _ := io.ReadAll(req.Body)
			if !bytes.Equal(got, raw) || c.helperWasDispatched() || wire.Enabled(req.Header) {
				t.Fatal("ordinary request modified or dispatched custody")
			}
		})
	}
}

func TestHelperRequirementOversizeUnknownDefersWithoutProbe(t *testing.T) {
	g := &Gateway{}
	g.d.EnableHelperHistory = true
	g.helperRequirement = func(context.Context, int64, *http.Request) (string, error) {
		t.Fatal("oversize request probed")
		return "", nil
	}
	g.helperRuntime = func(context.Context, int64, string) (string, core.ResourceBinding, error) {
		t.Fatal("oversize request acquired issuer")
		return "", core.ResourceBinding{}, nil
	}
	c := &call{g: g, helperHistory: &helperHistoryRequest{lookup: core.HelperHistoryLookup{State: core.HelperHistoryUnknown}}}
	raw := bytes.Repeat([]byte(" "), wire.MaxPayloadBytes+1)
	req, _ := http.NewRequest("POST", "http://ccgateway.internal/v1/messages", bytes.NewReader(raw))
	if err := c.wrapHelperHistoryRequest(context.Background(), req, &core.Account{PluginKey: "ccgateway", ID: 22}, &typeRoute{}, raw); err != nil {
		t.Fatal(err)
	}
	if c.helperWasDispatched() || wire.Enabled(req.Header) {
		t.Fatal("oversize acquired custody")
	}
}

func TestHelperRequirementFailureCannotBecomeEligibilityOrOrdinary(t *testing.T) {
	for _, mode := range []string{"timeout", "invalid-decision"} {
		t.Run(mode, func(t *testing.T) {
			g := &Gateway{}
			g.d.EnableHelperHistory = true
			g.helperRequirement = func(context.Context, int64, *http.Request) (string, error) {
				if mode == "timeout" {
					return "", context.DeadlineExceeded
				}
				return "unsupported", nil
			}
			c := &call{g: g, helperHistory: &helperHistoryRequest{lookup: core.HelperHistoryLookup{State: core.HelperHistoryUnknown}}}
			req, _ := http.NewRequest("POST", "http://ccgateway.internal/v1/messages", nil)
			err := c.wrapHelperHistoryRequest(context.Background(), req, &core.Account{PluginKey: "ccgateway", ID: 22}, &typeRoute{}, []byte(`{}`))
			var eligibility *resourceEligibilityError
			if err == nil || errors.As(err, &eligibility) || c.helperWasDispatched() {
				t.Fatal("probe failure downgraded or dispatched")
			}
		})
	}
}
