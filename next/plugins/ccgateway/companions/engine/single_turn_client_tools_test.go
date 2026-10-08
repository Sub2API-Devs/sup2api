package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

// TestSingleTurnTextResponse verifies a simple text response without tools.
func TestSingleTurnTextResponse(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Hello"}]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for text-only request, got %s", req.maxTurns())
	}
}

// TestSingleTurnOneClientTool verifies single client tool call handling.
func TestSingleTurnOneClientTool(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Read the file"}],
		"tools": [{"name": "Read", "input_schema": {"type": "object"}}]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	// Client tools should be enabled (with MCP prefix)
	enabled := req.enabledTools()
	if len(enabled) != 1 {
		t.Errorf("expected 1 tool to be enabled, got %d: %v", len(enabled), enabled)
	}
	// Tool names are prefixed with mcp__ccgateway__
	if len(enabled) > 0 && enabled[0] != "mcp__ccgateway__Read" {
		t.Errorf("expected mcp__ccgateway__Read tool to be enabled, got %v", enabled)
	}

	// MaxTurns should be 1 for client-only tools
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for client tools, got %s", req.maxTurns())
	}
}

// TestSingleTurnMultipleClientTools verifies multiple client tools in one response.
func TestSingleTurnMultipleClientTools(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Read five files"}],
		"tools": [
			{"name": "Read", "input_schema": {"type": "object"}},
			{"name": "Bash", "input_schema": {"type": "object"}},
			{"name": "Write", "input_schema": {"type": "object"}},
			{"name": "Edit", "input_schema": {"type": "object"}},
			{"name": "Grep", "input_schema": {"type": "object"}}
		]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	enabled := req.enabledTools()
	if len(enabled) != 5 {
		t.Errorf("expected 5 tools enabled, got %d", len(enabled))
	}

	// Should still be single-turn
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for multiple client tools, got %s", req.maxTurns())
	}
}

// TestSingleTurnWithDeferLoading verifies defer_loading triggers tool search.
func TestSingleTurnWithDeferLoading(t *testing.T) {
	deferTrue := true
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Use a tool"}],
		"tools": [
			{"name": "Tool1", "input_schema": {"type": "object"}, "defer_loading": false},
			{"name": "Tool2", "input_schema": {"type": "object"}, "defer_loading": true}
		]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	// Parse defer_loading into request
	var o map[string]any
	if err := json.Unmarshal([]byte(body), &o); err != nil {
		t.Fatal(err)
	}
	tools, _ := o["tools"].([]any)
	for i, tool := range tools {
		toolObj := tool.(map[string]any)
		if defer_val, exists := toolObj["defer_loading"]; exists {
			if i < len(req.Tools) {
				if defer_bool, ok := defer_val.(bool); ok {
					req.Tools[i].DeferLoading = &defer_bool
				}
			}
		}
	}
	req.Tools[1].DeferLoading = &deferTrue

	// Should enable tool search when defer_loading is present
	if !req.toolSearchEnabled() {
		t.Error("expected toolSearchEnabled=true with defer_loading")
	}

	// MaxTurns should be 4 for tool discovery (3 rounds + 1 answer)
	if req.maxTurns() != "4" {
		t.Errorf("expected maxTurns=4 for tool search, got %s", req.maxTurns())
	}

	// ToolSearch should be in enabled tools
	enabled := req.enabledTools()
	hasToolSearch := false
	for _, tool := range enabled {
		if tool == "ToolSearch" {
			hasToolSearch = true
			break
		}
	}
	if !hasToolSearch {
		t.Error("expected ToolSearch in enabled tools for defer_loading case")
	}
}

// TestSingleTurnStructuredOutput verifies structured output (API format).
func TestSingleTurnStructuredOutput(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Generate JSON"}],
		"output_config": {
			"format": {
				"type": "json_schema",
				"schema": {"type": "object", "properties": {"name": {"type": "string"}}}
			}
		}
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	// APIOutputFormat means provider handles format validation
	if req.structuredOutput() {
		t.Error("expected structuredOutput=false for API format")
	}

	// With APIOutputFormat, should be single-turn (provider handles it)
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for API format output, got %s", req.maxTurns())
	}

	// JSONSchema should be set
	if req.JSONSchema == nil {
		t.Error("expected JSONSchema to be set")
	}

	// APIOutputFormat should be true
	if !req.APIOutputFormat {
		t.Error("expected APIOutputFormat=true")
	}
}

// TestSingleTurnStructuredWithTools verifies API format structured output + tools.
func TestSingleTurnStructuredWithTools(t *testing.T) {
	deferTrue := true
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Read and return JSON"}],
		"tools": [{"name": "Read", "input_schema": {"type": "object"}, "defer_loading": true}],
		"output_config": {
			"format": {
				"type": "json_schema",
				"schema": {"type": "object", "properties": {"result": {"type": "string"}}}
			}
		}
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	req.Tools[0].DeferLoading = &deferTrue

	// APIOutputFormat is set
	if !req.APIOutputFormat {
		t.Error("expected APIOutputFormat=true")
	}

	// structuredOutput() returns false for API format
	if req.structuredOutput() {
		t.Error("expected structuredOutput=false for API format")
	}

	if !req.toolSearchEnabled() {
		t.Error("expected toolSearchEnabled=true")
	}

	// With tool search but API format output, maxTurns should be 4
	// (no need for format validation turn since provider handles it)
	if req.maxTurns() != "4" {
		t.Errorf("expected maxTurns=4 for tool search with API format, got %s", req.maxTurns())
	}
}

// TestForcedLoadedClientCatalog verifies forced loading bypasses tool search.
func TestForcedLoadedClientCatalog(t *testing.T) {
	deferFalse := false
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Use tool"}],
		"tools": [{"name": "MyTool", "input_schema": {"type": "object"}, "defer_loading": false}],
		"tool_choice": {"type": "tool", "name": "MyTool"}
	}`

	var o map[string]any
	if err := json.Unmarshal([]byte(body), &o); err != nil {
		t.Fatal(err)
	}

	plan, err := parseRequestPlan([]byte(body), o)
	if err != nil {
		t.Fatal(err)
	}

	data, _ := json.Marshal(o)
	req, err := parseRequestCreditCandidate(data, nil, nil, false, false)
	if err != nil {
		t.Fatal(err)
	}

	req.Plan = plan
	req.Tools[0].DeferLoading = &deferFalse
	req.ToolSearch = "true"

	// Should recognize forced loaded catalog
	if !req.forcedLoadedClientCatalog() {
		t.Error("expected forcedLoadedClientCatalog=true")
	}

	// Should be single-turn despite tool search policy
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for forced catalog, got %s", req.maxTurns())
	}

	// Should not inject ToolSearch
	enabled := req.enabledTools()
	for _, tool := range enabled {
		if tool == "ToolSearch" {
			t.Error("ToolSearch should not be injected for forced catalog")
		}
	}
}

// TestClientToolNotNative verifies custom tools are not marked as native.
func TestClientToolNotNative(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Use custom tool"}],
		"tools": [{"name": "CustomTool", "input_schema": {"type": "object"}}]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	// Custom tools should not be marked as native CC tools
	if req.Native["CustomTool"] {
		t.Error("CustomTool should not be marked as native")
	}
}

// TestToolRouting verifies tool name mapping configuration.
func TestToolRouting(t *testing.T) {
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Test"}],
		"tools": [
			{"name": "Read", "input_schema": {"type": "object"}, "description": "Read a file"},
			{"name": "CustomTool", "input_schema": {"type": "object"}, "description": "Custom tool"}
		]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	p := &Prepared{Work: "/tmp", SessionID: "test"}
	cfg := newRunConfig(req, p, "/plugin", "/work")

	// Verify tool routing is configured
	if len(cfg.tools) != 2 {
		t.Errorf("expected 2 tools in routing, got %d", len(cfg.tools))
	}

	// Tools are keyed by wire name (with prefix)
	wireName := req.wireName("Read")
	readRoute, ok := cfg.tools[wireName].(Object)
	if !ok || readRoute == nil {
		t.Fatalf("expected Read tool route, got nil or wrong type for %s", wireName)
	}
	if readRoute["client_name"] != "Read" {
		t.Errorf("Read tool routing incorrect: client_name=%v", readRoute["client_name"])
	}

	customWireName := req.wireName("CustomTool")
	customRoute, ok := cfg.tools[customWireName].(Object)
	if !ok || customRoute == nil {
		t.Fatalf("expected CustomTool route, got nil or wrong type for %s", customWireName)
	}
	if customRoute["client_name"] != "CustomTool" {
		t.Errorf("CustomTool routing incorrect: client_name=%v", customRoute["client_name"])
	}

	if str(customRoute, "description") != "Custom tool" {
		t.Errorf("tool description not preserved: got %v", customRoute["description"])
	}
}

// TestMaxTurnsLogic verifies the maxTurns calculation for different scenarios.
func TestMaxTurnsLogic(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		setup    func(*Request)
		expected string
	}{
		{
			name: "plain text no tools",
			body: `{
				"model": "claude-sonnet-4-20250514",
				"max_tokens": 1024,
				"messages": [{"role": "user", "content": "Hello"}]
			}`,
			expected: "1",
		},
		{
			name: "client tools loaded",
			body: `{
				"model": "claude-sonnet-4-20250514",
				"max_tokens": 1024,
				"messages": [{"role": "user", "content": "Read"}],
				"tools": [{"name": "Read", "input_schema": {"type": "object"}}]
			}`,
			expected: "1",
		},
		{
			name: "defer_loading without forced catalog",
			body: `{
				"model": "claude-sonnet-4-20250514",
				"max_tokens": 1024,
				"messages": [{"role": "user", "content": "Search"}],
				"tools": [{"name": "Read", "input_schema": {"type": "object"}, "defer_loading": true}]
			}`,
			setup: func(r *Request) {
				t := true
				r.Tools[0].DeferLoading = &t
				// forcedLoadedClientCatalog() checks if all tools are pre-loaded
				// which is false here
			},
			expected: "4", // ToolSearch enabled
		},
		{
			name: "API format structured output",
			body: `{
				"model": "claude-sonnet-4-20250514",
				"max_tokens": 1024,
				"messages": [{"role": "user", "content": "JSON"}],
				"output_config": {"format": {"type": "json_schema", "schema": {"type": "object"}}}
			}`,
			expected: "1", // API handles format
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := parsePolicyRequest([]byte(tt.body), http.Header{})
			if err != nil {
				t.Fatal(err)
			}
			if tt.setup != nil {
				tt.setup(req)
			}
			got := req.maxTurns()
			if got != tt.expected {
				t.Errorf("maxTurns() = %s, want %s", got, tt.expected)
			}
		})
	}
}


// TestResponseViewIncludesToolSearch verifies responseView adds ToolSearch.
func TestResponseViewIncludesToolSearch(t *testing.T) {
	deferTrue := true
	body := `{
		"model": "claude-sonnet-4-20250514",
		"max_tokens": 1024,
		"messages": [{"role": "user", "content": "Test"}],
		"tools": [{"name": "Tool1", "input_schema": {"type": "object"}, "defer_loading": true}]
	}`
	req, err := parsePolicyRequest([]byte(body), http.Header{})
	if err != nil {
		t.Fatal(err)
	}

	req.Tools[0].DeferLoading = &deferTrue

	view := req.responseView()

	// responseView should include ToolSearch for accumulator validation
	foundToolSearch := false
	for _, tool := range view.Tools {
		if tool.Name == "ToolSearch" {
			foundToolSearch = true
			break
		}
	}

	if !foundToolSearch {
		t.Error("responseView should include ToolSearch for defer_loading case")
	}

	// ToolSearch should be marked as native in the view
	if !view.Native["ToolSearch"] {
		t.Error("ToolSearch should be marked as native in responseView")
	}
}
