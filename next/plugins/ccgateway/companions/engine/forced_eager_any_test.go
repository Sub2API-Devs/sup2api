package engine

import (
	"encoding/json"
	"testing"
)

func TestForcedEagerAnyCatalogPartition(t *testing.T) {
	input := basic()
	input["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
	input["tool_choice"] = json.RawMessage(`{"type":"any","disable_parallel_tool_use":true}`)
	r := reviewParseForcedMixed(t, input)
	if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" {
		t.Fatal("any scope not bounded")
	}
	for _, name := range r.enabledTools() {
		if name == "ToolSearch" || name == "DeferredToolPlaceholder" {
			t.Fatal("CLI whitelist includes helper")
		}
	}
	schema := r.Tools[0].Schema
	body := Object{"tools": []any{Object{"name": "mcp__ccgateway__chosen", "input_schema": schema}, Object{"name": "ToolSearch"}, Object{"name": "DeferredToolPlaceholder"}}}
	if err := r.verifyForcedLoadedCatalog(body); err != nil {
		t.Fatal(err)
	}
	actual, _ := historyContent(body["tools"])
	if len(actual) != 1 || str(actual[0], "name") != "mcp__ccgateway__chosen" || actual[0]["defer_loading"] != false {
		t.Fatal("provider any can select helper")
	}
	cfg, err := r.passthroughBodies()
	if err != nil {
		t.Fatal(err)
	}
	if string(cfg.First["tool_choice"]) != `{"type":"any","disable_parallel_tool_use":true}` || cfg.Rest["tool_choice"] != nil {
		t.Fatal("any contract changed")
	}
	for _, extra := range []Object{{"name": "unexpected"}, {"name": "mcp__ccgateway__chosen", "input_schema": schema}} {
		bad := Object{"tools": []any{Object{"name": "mcp__ccgateway__chosen", "input_schema": schema}, extra}}
		if err := r.verifyForcedLoadedCatalog(bad); err == nil {
			t.Fatal("injected/duplicate provider tool accepted")
		}
	}
	for _, value := range []*bool{nil, func() *bool { b := true; return &b }()} {
		r.Tools[0].DeferLoading = value
		if r.forcedLoadedClientCatalog() {
			t.Fatal("deferred any admitted")
		}
	}
}
