package engine

import (
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperBudgetRequiresTrustedExecutionAndFinalAdmission(t *testing.T) {
	body := []byte(`{"model":"claude-opus-5-5","max_tokens":128,"messages":[{"role":"user","content":"public"}],"tools":[{"name":"weather","defer_loading":true,"input_schema":{"type":"object"}}],"output_config":{"task_budget":{"type":"tokens","total":20000,"remaining":11000}}}`)
	h := http.Header{}
	h.Set("anthropic-beta", taskBudgetBeta)
	h.Set("X-CCGateway-Request-Policy", `{"tool_search":"true"}`)
	h.Set(helperhistory.Header, "1")
	// A header cannot grant custody; the native request remains ordinary.
	r, err := parsePolicyRequest(body, h)
	if err != nil || r.helperHistory != nil {
		t.Fatal("ordinary native budget request acquired custody", err)
	}
	if _, err := parsePolicyRequestWithHelper(body, h, nil, &helperHistoryExecution{}); err == nil || !strings.Contains(err.Error(), "not authenticated") {
		t.Fatal("unverified execution accepted", err)
	}
	for _, beta := range []string{"", taskBudgetBeta} {
		h.Set("anthropic-beta", beta)
		if r, err := parsePolicyRequestWithHelper(body, h, nil, &helperHistoryExecution{authenticated: true}); err == nil || r != nil || !strings.Contains(err.Error(), "helper history is not supported") {
			t.Fatal("native transport accepted helper custody", err)
		}
	}
}
