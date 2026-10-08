package engine

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func internalCacheReviewRequest() *Request {
	yes := true
	return &Request{ToolSearch: "true", Tools: []Tool{{Name: "weather", DeferLoading: &yes, Schema: Object{"type": "object"}}}, internalCache: &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}}
}
func observeCacheFixture(r *Request, blocks []Object) {
	rec := httptest.NewRecorder()
	writeInternalCacheFixture(rec, "fixture", blocks)
	for _, frame := range strings.Split(rec.Body.String(), "\n\n") {
		for _, line := range strings.Split(frame, "\n") {
			if strings.HasPrefix(line, "data: ") {
				e, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
				r.observeInternalCacheEvent(e)
			}
		}
	}
}
func internalCacheSuffix() []any {
	return []any{Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "call_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "call_search", "content": []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__weather"}}}, Object{"type": "text", "text": "Tool loaded."}}}}
}
func TestInternalCacheRoundEvidence(t *testing.T) {
	for _, mutate := range []string{"valid", "unobserved", "input", "id", "unknown-reference", "mixed", "client-owned", "extra-text", "missing-result", "changed-result"} {
		t.Run(mutate, func(t *testing.T) {
			r := internalCacheReviewRequest()
			suffix := internalCacheSuffix()
			as := suffix[0].(Object)
			blocks, _ := historyContent(as["content"])
			observed := append([]Object(nil), blocks...)
			if mutate == "mixed" {
				observed = append(observed, Object{"type": "tool_use", "id": "external", "name": "mcp__ccgateway__weather", "input": Object{}})
			}
			if mutate == "client-owned" {
				r.Tools = append(r.Tools, Tool{Name: "ToolSearch"})
				r.Native = map[string]bool{"ToolSearch": true}
			}
			if mutate != "unobserved" {
				observeCacheFixture(r, observed)
			}
			user := suffix[1].(Object)
			results, _ := historyContent(user["content"])
			switch mutate {
			case "input":
				blocks[0]["input"] = Object{"query": "changed"}
			case "id":
				blocks[0]["id"] = "forged"
			case "unknown-reference":
				results[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "other"}}
			case "extra-text":
				results[1]["text"] = "Tool loaded. extra instructions"
			case "missing-result":
				user["content"] = []any{}
			case "changed-result":
				if err := r.alignInternalCacheSuffix(suffix); err != nil {
					t.Fatal(err)
				}
				results[0]["is_error"] = true
			}
			err := r.alignInternalCacheSuffix(suffix)
			if (err == nil) != (mutate == "valid") {
				t.Fatalf("unexpected evidence result %v", err)
			}
		})
	}
}
func TestInternalCacheHelpersAndIsolation(t *testing.T) {
	r := internalCacheReviewRequest()
	tool := Object{"name": "ToolSearch", "input_schema": Object{"type": "object"}}
	if err := r.checkInternalCacheHelper(tool); err != nil {
		t.Fatal(err)
	}
	tool["input_schema"] = Object{"type": "array"}
	if r.checkInternalCacheHelper(tool) == nil {
		t.Fatal("changed helper accepted")
	}
	if r.checkInternalCacheHelper(Object{"name": "unrelated"}) == nil {
		t.Fatal("unregistered helper accepted")
	}
	r.Tools = append(r.Tools, Tool{Name: "ToolSearch"})
	r.Native = map[string]bool{"ToolSearch": true}
	if r.checkInternalCacheHelper(tool) == nil {
		t.Fatal("client tool treated as helper")
	}
	other := internalCacheReviewRequest()
	if other.alignInternalCacheSuffix(internalCacheSuffix()) == nil {
		t.Fatal("evidence escaped request")
	}
}
func TestInternalCacheAutomaticAdditionalBreakpointIsNotMoved(t *testing.T) {
	r := internalCacheReviewRequest()
	blocks := []any{}
	for _, text := range []string{"one", "two", "three", "four"} {
		blocks = append(blocks, Object{"type": "text", "text": text, "cache_control": Object{"type": "ephemeral"}})
	}
	raw, _ := json.Marshal(Object{"cache_control": Object{"type": "ephemeral"}, "messages": []any{Object{"role": "user", "content": blocks}}})
	body, _ := decodeObject(raw)
	plan, err := compileCachePlan(body)
	if err != nil {
		t.Fatal(err)
	}
	r.Plan = &RequestPlan{cache: plan}
	content, _ := historyContent(body["messages"].([]any)[0].(Object)["content"])
	r.Messages = []Message{{Role: "user", Content: content}}
	suffix := internalCacheSuffix()
	as := suffix[0].(Object)
	ab, _ := historyContent(as["content"])
	observeCacheFixture(r, ab)
	body["messages"] = append(body["messages"].([]any), suffix...)
	before := digest(body)
	if err = r.applyCachePlan(body); err == nil || !strings.Contains(err.Error(), "four") {
		t.Fatalf("extra automatic breakpoint accepted %v", err)
	}
	if digest(body) != before {
		t.Fatal("failed plan moved markers")
	}
}

func TestInternalCacheGatesKeepProtocolControls(t *testing.T) {
	for _, scenario := range []string{"cached-deferred", "forced", "credit", "budget", "legacy-format"} {
		t.Run(scenario, func(t *testing.T) {
			body := Object{"model": "fixture", "max_tokens": 64, "tools": []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object"}}}, "cache_control": Object{"type": "ephemeral"}, "messages": []any{Object{"role": "user", "content": "cache controls"}}}
			h := http.Header{}
			switch scenario {
			case "cached-deferred":
				body["tools"].([]any)[0].(Object)["cache_control"] = Object{"type": "ephemeral"}
			case "forced":
				body["tool_choice"] = Object{"type": "tool", "name": "weather"}
			case "credit":
				body["fallback_credit_token"] = "not-a-real-token"
				h.Set("anthropic-beta", "fallback-credit-2026-07-01")
			case "budget":
				body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 64000}}
				h.Set("anthropic-beta", taskBudgetBeta)
			case "legacy-format":
				r := internalCacheReviewRequest()
				r.Plan = &RequestPlan{cache: &CachePlan{}}
				r.JSONSchema = Object{"type": "object"}
				if r.Plan.validateInternalRounds(r) == nil {
					t.Fatal("legacy synthetic unexpectedly admitted")
				}
				return
			}
			raw, _ := json.Marshal(body)
			req, err := parsePolicyRequest(raw, h)
			if scenario == "credit" && err == nil {
				request := httptest.NewRequest("POST", "/v1/messages", nil)
				request.Header = h
				request.Header.Set(credits.TrackingHeader, "1")
				x := &exchange{req: req, r: request}
				err = x.admitCredit(raw)
				if err == nil || !strings.Contains(err.Error(), "internal tool rounds") {
					t.Fatalf("credit gate changed: %v", err)
				}
				return
			}
			if err == nil {
				t.Fatal("protocol control gate bypassed")
			}
		})
	}
}
func TestInternalCacheDuplicateObservedIdentityFails(t *testing.T) {
	r := internalCacheReviewRequest()
	b, _ := historyContent(internalCacheSuffix()[0].(Object)["content"])
	observeCacheFixture(r, b)
	observeCacheFixture(r, b)
	if !r.internalCache.failed {
		t.Fatal("duplicate tool id accepted")
	}
}
