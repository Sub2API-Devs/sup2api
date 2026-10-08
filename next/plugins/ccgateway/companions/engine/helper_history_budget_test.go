package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperBudgetRequiresTrustedExecutionAndFinalAdmission(t *testing.T) {
	body := []byte(`{"model":"claude-opus-5-5","max_tokens":128,"messages":[{"role":"user","content":"public"}],"tools":[{"name":"weather","defer_loading":true,"input_schema":{"type":"object"}}],"output_config":{"task_budget":{"type":"tokens","total":20000,"remaining":11000}}}`)
	h := http.Header{}
	h.Set("anthropic-beta", taskBudgetBeta)
	h.Set("X-CCGateway-Request-Policy", `{"tool_search":"true"}`)
	h.Set(helperhistory.Header, "1")
	if _, err := parsePolicyRequest(body, h); err == nil {
		t.Fatal("public forged header bypassed budget gate")
	}
	if _, err := parsePolicyRequestWithHelper(body, h, nil, &helperHistoryExecution{}); err == nil {
		t.Fatal("unverified execution accepted")
	}
	x := &helperHistoryExecution{authenticated: true, public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[{"name":"weather","defer_loading":true,"input_schema":{"type":"object"}}]`), imported: helperhistory.Payload{Version: 1}}
	r, err := parsePolicyRequestWithHelper(body, h, nil, x)
	if err != nil {
		t.Fatal(err)
	}
	if err = r.admitHelperHistory(x); err != nil {
		t.Fatal(err)
	}
	x.public = json.RawMessage(`[{"role":"user","content":"different"},{"role":"assistant","content":"extra"}]`)
	if r.admitHelperHistory(x) == nil {
		t.Fatal("budget trust bypassed final history admission")
	}
	h.Del("anthropic-beta")
	if _, err = parsePolicyRequestWithHelper(body, h, nil, x); err == nil {
		t.Fatal("trusted transport bypassed official beta requirement")
	}
}
