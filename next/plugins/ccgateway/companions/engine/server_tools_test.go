package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func serverSearchTestBody() Object {
	return Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "search"}}, "tools": []any{Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}, Object{"name": "weather", "description": "exact description", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}}, "defer_loading": true}}}
}

func TestServerSearchPlanAndReferenceIsolation(t *testing.T) {
	body := serverSearchTestBody()
	raw, _ := json.Marshal(body)
	headers := http.Header{}
	headers.Set("X-CCGateway-Request-Policy", `{"tool_search":"true"}`)
	req, err := parsePolicyRequest(raw, headers)
	if err != nil {
		t.Fatal(err)
	}
	if !req.HasMainRequestFeatures() || req.toolSearchEnabled() || len(req.Tools) != 1 || len(req.ServerTools) != 1 {
		t.Fatal("API search not isolated from CLI search")
	}
	wire := Object{"tools": []any{Object{"name": "mcp__ccgateway__weather", "description": "CLI augmented", "input_schema": Object{"type": "object"}}}}
	if err := req.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	tool := wire["tools"].([]any)[0].(map[string]any)
	if tool["defer_loading"] != true || tool["description"] != "exact description" || digest(tool["input_schema"]) != digest(req.Tools[0].Schema) {
		t.Fatal("client search catalog not restored")
	}
	result := Object{"type": "tool_search_tool_result", "tool_use_id": "srv1", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "weather"}}}}
	before := digest(result)
	mapped, err := mapSearchReferences(result, req.wireName)
	if err != nil {
		t.Fatal(err)
	}
	if digest(result) != before || !strings.Contains(string(mustServerJSON(mapped)), "mcp__ccgateway__weather") {
		t.Fatal("reference mapping mutated history or failed")
	}
	if _, err := mapSearchReferences(mapped, func(string) string { return "" }); err == nil {
		t.Fatal("unknown reference accepted")
	}
}

func mustServerJSON(v any) []byte { data, _ := json.Marshal(v); return data }

func TestServerSearchAdmissionFailures(t *testing.T) {
	for _, tc := range []struct {
		name   string
		mutate func(Object)
	}{
		{"other server", func(b Object) { b["tools"].([]any)[0].(map[string]any)["type"] = "web_search_20250305" }},
		{"wrong canonical name", func(b Object) { b["tools"].([]any)[0].(map[string]any)["name"] = "renamed_search" }},
		{"deferred search", func(b Object) { b["tools"].([]any)[0].(map[string]any)["defer_loading"] = true }},
		{"deferred cache", func(b Object) { b["tools"].([]any)[1].(map[string]any)["cache_control"] = Object{"type": "ephemeral"} }},
		{"orphan result", func(b Object) {
			b["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_search_tool_result", "tool_use_id": "srv1", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{}}}}}, Object{"role": "user", "content": "next"}}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := serverSearchTestBody()
			tc.mutate(body)
			if _, err := parseRequest(mustServerJSON(body)); err == nil {
				t.Fatal("invalid server search accepted")
			}
		})
	}
}

func TestServerSearchErrorResultPreserved(t *testing.T) {
	result := Object{"type": "tool_search_tool_result", "tool_use_id": "srv1", "content": Object{"type": "tool_search_tool_result_error", "error_code": "invalid_tool_input", "error_message": "invalid regex"}}
	if err := checkServerSearchBlock(result, "assistant"); err != nil {
		t.Fatal(err)
	}
	mapped, err := mapSearchReferences(result, func(string) string { return "" })
	if err != nil || digest(mapped) != digest(result) {
		t.Fatal("server search execution error lost")
	}
}

func TestServerSearchToolChoiceAndMCPNames(t *testing.T) {
	for _, choice := range []Object{{"type": "none"}, {"type": "auto"}, {"type": "tool", "name": "tool_search_tool_regex"}, {"type": "tool", "name": "mcp__client__weather"}} {
		body := serverSearchTestBody()
		body["tools"].([]any)[1].(map[string]any)["name"] = "mcp__client__weather"
		body["tools"].([]any)[1].(map[string]any)["defer_loading"] = false
		body["tool_choice"] = choice
		req, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
		if err != nil {
			t.Fatal(err)
		}
		wire := Object{"tools": []any{Object{"name": "mcp__client__weather", "input_schema": Object{"type": "object"}}}}
		if req.NoTools {
			wire["tools"] = []any{}
		}
		if err := req.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		if digest(wire["tool_choice"]) != digest(choice) {
			t.Fatalf("tool choice changed: %v", wire["tool_choice"])
		}
		if wire["tools"].([]any)[0].(map[string]any)["defer_loading"] != false {
			t.Fatal("explicit defer false lost")
		}
	}
}
