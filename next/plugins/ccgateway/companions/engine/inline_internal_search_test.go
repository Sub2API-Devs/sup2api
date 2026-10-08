package engine

import (
	"encoding/json"
	"testing"
)

func inlineSearchRequest(t *testing.T, extra []any) *Request {
	t.Helper()
	schema := func(k string) Object {
		return Object{"type": "object", "properties": Object{k: Object{"type": "string"}}}
	}
	base := Object{"name": "alpha", "defer_loading": true, "input_schema": schema("old")}
	body := basic()
	body["tools"] = []any{base}
	body["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "alpha"}}, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": Object{"name": "beta", "defer_loading": true, "input_schema": schema("current")}}}}}}
	body["messages"] = append(body["messages"].([]any), extra...)
	raw, _ := json.Marshal(body)
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	h := policyHeaders(p)
	h.Set("anthropic-beta", "inline-tools-2026-09-15")
	r, err := parsePolicyRequest(raw, h)
	if err != nil {
		t.Fatal(err)
	}
	return r
}
func TestInlineInternalSearchScopesCurrentDirectory(t *testing.T) {
	r := inlineSearchRequest(t, nil)
	if len(r.Tools) != 2 || r.InlineTools.Searchable["alpha"] || !r.InlineTools.Searchable["beta"] {
		t.Fatal("history union/searchable scopes conflated")
	}
	reply := sdkMCPReply(Object{"server_name": "ccgateway", "message": Object{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}}, r)
	tools := reply["result"].(Object)["tools"].([]Object)
	if len(tools) != 1 || str(tools[0], "name") != "beta" {
		t.Fatal("withdrawn tool visible in SDK")
	}
	for _, name := range r.enabledTools() {
		if name == "mcp__ccgateway__alpha" {
			t.Fatal("withdrawn tool enabled")
		}
	}
	r.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	suffix := internalCacheSuffix()
	as := suffix[0].(Object)
	b, _ := historyContent(as["content"])
	b[0]["input"] = Object{"query": "select:mcp__ccgateway__alpha"}
	observeCacheFixture(r, b)
	results, _ := historyContent(suffix[1].(Object)["content"])
	results[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__alpha"}}
	if r.alignInternalCacheSuffix(suffix) == nil {
		t.Fatal("withdrawn tool returned by search accepted")
	}
}
func TestInlineInternalSearchReaddedSchemaAndReset(t *testing.T) {
	newer := Object{"name": "alpha", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"new": Object{"type": "string"}}}}
	r := inlineSearchRequest(t, []any{Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "readd"}, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": newer}}}}})
	reply := sdkMCPReply(Object{"server_name": "ccgateway", "message": Object{"method": "tools/list"}}, r)
	tools := reply["result"].(Object)["tools"].([]Object)
	if len(tools) != 1 || str(tools[0], "name") != "alpha" || digest(tools[0]["inputSchema"]) != digest(newer["input_schema"]) {
		t.Fatal("readd exposed old schema")
	}
	// The compiler's reset must not make history-only beta searchable. Production
	// admission still excludes compaction from this narrow internal-search scope.
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "tool_changes": []any{}}}})
	timeline, _, err := r.compileToolTimeline(r.InlineTools.Base)
	if err != nil {
		t.Fatal(err)
	}
	if timeline.Searchable["beta"] || !timeline.Searchable["alpha"] {
		t.Fatal("reset revived history union")
	}
}

func TestInlineInternalSearchExcludesUnprovenIdentities(t *testing.T) {
	for _, name := range []string{"native", "helper", "compaction", "safeguards"} {
		t.Run(name, func(t *testing.T) {
			r := inlineSearchRequest(t, nil)
			switch name {
			case "native":
				r.Native = map[string]bool{"beta": true}
			case "helper":
				r.Tools[0].Name = "ToolSearch"
			case "compaction":
				r.Messages = append(r.Messages, Message{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary"}}})
			case "safeguards":
				r.Plan.fields["safeguards"] = json.RawMessage(`{}`)
			}
			if r.validateInlineInternalSearch() == nil {
				t.Fatal("unproven identity accepted")
			}
		})
	}
}

func TestInlineInternalSearchDiscoveryIsRequestLocal(t *testing.T) {
	r := inlineSearchRequest(t, nil)
	r.internalCache = &internalCacheRounds{discovered: map[string]bool{r.wireName("beta"): true, r.wireName("alpha"): true}}
	if !r.inlineSearchDiscovered("beta") || r.inlineSearchDiscovered("alpha") {
		t.Fatal("withdrawal did not constrain discovery")
	}
	cold := inlineSearchRequest(t, nil)
	if cold.inlineSearchDiscovered("beta") {
		t.Fatal("discovery leaked to another request")
	}
}
