package engine

import (
	"net/http"
	"testing"
)

func TestToolMetadataNamespaceAndValues(t *testing.T) {
	body := serverSearchTestBody()
	body["tools"] = body["tools"].([]any)[1:]
	tool := body["tools"].([]any)[0].(map[string]any)
	delete(tool, "defer_loading")
	baseline, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	old := baseline.toolHistoryNamespace()
	tool["strict"] = false
	tool["eager_input_streaming"] = nil
	tool["input_examples"] = []any{}
	tool["allowed_callers"] = []any{"direct"}
	tool["type"] = "custom"
	req, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if !req.HasMainRequestFeatures() || req.toolHistoryNamespace() == old || req.configKey() == baseline.configKey() {
		t.Fatal("tool metadata not part of plan/history identity")
	}
	wire := Object{"tools": []any{Object{"name": "mcp__ccgateway__weather", "input_schema": Object{"type": "object"}}}}
	if err := req.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	got := wire["tools"].([]any)[0].(map[string]any)
	for _, key := range []string{"strict", "eager_input_streaming", "input_examples", "allowed_callers", "type"} {
		value, exists := got[key]
		if !exists || digest(value) != digest(tool[key]) {
			t.Fatalf("metadata %s changed", key)
		}
	}
	body["temperature"] = 0.2
	sampling, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if sampling.toolHistoryNamespace() != req.toolHistoryNamespace() {
		t.Fatal("sampling changed tool namespace")
	}
	tool["strict"] = true
	changed, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if changed.toolHistoryNamespace() == req.toolHistoryNamespace() {
		t.Fatal("changed metadata resumed old namespace")
	}
}

func TestToolMetadataRejectUnsupportedSemantics(t *testing.T) {
	for _, tc := range []struct {
		key   string
		value any
	}{{"strict", nil}, {"strict", "true"}, {"eager_input_streaming", 1}, {"input_examples", []any{"text"}}, {"allowed_callers", []any{"code_execution_20260120"}}, {"allowed_callers", []any{}}, {"type", "not_custom"}} {
		body := serverSearchTestBody()
		body["tools"] = body["tools"].([]any)[1:]
		body["tools"].([]any)[0].(map[string]any)[tc.key] = tc.value
		if _, err := parsePolicyRequest(mustServerJSON(body), http.Header{}); err == nil {
			t.Fatalf("invalid metadata accepted: %s=%v", tc.key, tc.value)
		}
	}
}

func TestServerSearchOnlyForcedAndDuplicateID(t *testing.T) {
	for _, choice := range []Object{{"type": "any"}, {"type": "tool", "name": "tool_search_tool_regex"}} {
		body := serverSearchTestBody()
		body["tools"] = body["tools"].([]any)[:1]
		body["tool_choice"] = choice
		req, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
		if err != nil {
			t.Fatal(err)
		}
		wire := Object{}
		if err := req.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		if digest(wire["tool_choice"]) != digest(choice) {
			t.Fatal("server-only choice changed")
		}
		acc := &Accumulator{}
		if err := acc.start(Object{"message": Object{"id": "msg", "role": "assistant"}}); err != nil {
			t.Fatal(err)
		}
		block := Object{"type": "server_tool_use", "id": "srv1", "name": "tool_search_tool_regex", "input": Object{"pattern": "x"}}
		if err := acc.blockStart(Object{"index": 0, "content_block": block}, req); err != nil {
			t.Fatal(err)
		}
		if err := acc.blockStop(Object{"index": 0}); err != nil {
			t.Fatal(err)
		}
		if err := acc.blockStart(Object{"index": 1, "content_block": block}, req); err == nil {
			t.Fatal("duplicate server ID accepted")
		}
	}
}
