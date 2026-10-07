package engine

import (
	"encoding/json"
	"strings"
	"testing"
)

func webTestBody(kind string) Object {
	tool := Object{"type": kind, "name": serverToolName(kind), "allowed_callers": []any{"direct"}}
	return Object{"model": "claude-opus-5-5", "max_tokens": 256, "messages": []any{Object{"role": "user", "content": "search"}}, "tools": []any{tool}}
}

func webFixture(name string) []Object {
	call := Object{"type": "server_tool_use", "id": "srv_web", "name": name, "input": Object{"query": "fixture"}, "caller": Object{"type": "direct"}}
	var result Object
	if name == "web_search" {
		result = Object{"type": "web_search_tool_result", "tool_use_id": "srv_web", "content": []any{Object{"type": "web_search_result", "url": "https://example.invalid/fixture", "title": "Fixture", "encrypted_content": "opaque_search_source", "page_age": "2026-10-08"}}}
	} else {
		call["input"] = Object{"url": "https://example.invalid/fixture"}
		result = Object{"type": "web_fetch_tool_result", "tool_use_id": "srv_web", "content": Object{"type": "web_fetch_result", "url": "https://example.invalid/fixture", "retrieved_at": "2026-10-08T00:00:00Z", "content": Object{"type": "document", "title": "Fixture", "source": Object{"type": "text", "media_type": "text/plain", "data": "web fixture content"}, "citations": Object{"enabled": true}}}}
	}
	return []Object{call, result, {"type": "text", "text": "WEB_DONE"}}
}

func TestWebToolVersionAndRouting(t *testing.T) {
	for _, kind := range []string{"web_search_20250305", "web_search_20260209", "web_search_20260318", "web_fetch_20250910", "web_fetch_20260209", "web_fetch_20260309", "web_fetch_20260318"} {
		t.Run(kind, func(t *testing.T) {
			body := webTestBody(kind)
			tool := body["tools"].([]any)[0].(map[string]any)
			tool["allowed_domains"] = []any{"example.invalid"}
			tool["max_uses"] = 2
			tool["strict"] = true
			if strings.Contains(kind, "web_search") {
				tool["user_location"] = Object{"type": "approximate", "city": nil, "region": nil, "country": "US", "timezone": nil}
			}
			if strings.Contains(kind, "web_fetch") {
				tool["citations"] = Object{"enabled": true}
				tool["max_content_tokens"] = 1024
			}
			if strings.HasSuffix(kind, "20260318") {
				tool["response_inclusion"] = "full"
			}
			if kind == "web_fetch_20260309" || kind == "web_fetch_20260318" {
				tool["use_cache"] = false
			}
			r, err := parseRequest(mustServerJSON(body))
			if err != nil {
				t.Fatal(err)
			}
			if len(r.Tools) != 0 || len(r.ServerTools) != 1 {
				t.Fatal("server tool registered as client")
			}
			wire := Object{"tools": []any{}}
			if err := r.applyServerSearchTools(wire); err != nil {
				t.Fatal(err)
			}
			if digest(wire["tools"]) != digest(body["tools"]) {
				t.Fatal("version or parameters changed")
			}
			blocks := webFixture(str(tool, "name"))
			body["messages"] = []any{Object{"role": "user", "content": "search"}, Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "continue"}}
			if _, err := parseRequest(mustServerJSON(body)); err != nil {
				t.Fatal("history", err)
			}
		})
	}
}

func TestWebToolValidationAndSourceMapping(t *testing.T) {
	body := webTestBody("web_fetch_20260318")
	tool := body["tools"].([]any)[0].(map[string]any)
	body["tools"] = append(body["tools"].([]any), Object{"name": "links", "input_schema": Object{"type": "object"}})
	tool["url_sources"] = Object{"client_tool_results": Object{"type": "only", "tools": []any{Object{"type": "tool_reference", "name": "links"}}}, "user_input": Object{"type": "none"}}
	r, err := parseRequest(mustServerJSON(body))
	if err != nil {
		t.Fatal(err)
	}
	wire := Object{"tools": []any{Object{"name": "mcp__ccgateway__links"}}}
	if err := r.applyServerSearchTools(wire); err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(wire)
	if !strings.Contains(string(encoded), `"name":"mcp__ccgateway__links","type":"tool_reference"`) {
		t.Fatal("URL source route not translated", string(encoded))
	}
	if digest(r.ServerTools[0]) != digest(tool) {
		t.Fatal("source tool mutated")
	}
	for _, mutate := range []func(Object){
		func(t Object) { delete(t, "allowed_callers") },
		func(t Object) { t["allowed_callers"] = []any{"code_execution_20260120"} },
		func(t Object) { t["allowed_domains"] = []any{"ok"}; t["blocked_domains"] = []any{"bad"} },
		func(t Object) { t["max_uses"] = -1 },
		func(t Object) {
			t["url_sources"] = Object{"client_tool_results": Object{"type": "only", "tools": []any{Object{"type": "tool_reference", "name": "undeclared"}}}}
		},
		func(t Object) { t["type"] = "web_fetch_99999999" },
	} {
		b := webTestBody("web_fetch_20260318")
		mutate(b["tools"].([]any)[0].(map[string]any))
		if _, err := parseRequest(mustServerJSON(b)); err == nil {
			t.Fatal("invalid web definition accepted", b)
		}
	}
}

func TestWebResultErrorsAndPairing(t *testing.T) {
	for _, name := range []string{"web_search", "web_fetch"} {
		blocks := webFixture(name)
		blocks[1]["content"] = Object{"type": serverResultType(name) + "_error", "error_code": "unavailable", "error_message": "opaque error"}
		if err := checkWebResult(blocks[1]); err != nil {
			t.Fatal(err)
		}
		if blocks[1]["content"].(map[string]any)["error_message"] != "opaque error" {
			t.Fatal("error detail lost")
		}
	}
	b := webTestBody("web_fetch_20250910")
	blocks := webFixture("web_fetch")
	blocks[1] = webFixture("web_search")[1]
	b["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "next"}}
	if _, err := parseRequest(mustServerJSON(b)); err == nil {
		t.Fatal("cross-protocol result accepted")
	}
}
