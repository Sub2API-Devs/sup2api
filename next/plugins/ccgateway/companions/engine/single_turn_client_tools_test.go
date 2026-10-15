package engine

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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

	// Deferral no longer authorizes hidden discovery/model rounds.
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for tool search, got %s", req.maxTurns())
	}

	// A tool not declared by the client must not be added to the catalog.
	enabled := req.enabledTools()
	hasToolSearch := false
	for _, tool := range enabled {
		if tool == "ToolSearch" {
			hasToolSearch = true
			break
		}
	}
	if hasToolSearch {
		t.Error("undeclared ToolSearch added for defer_loading")
	}
	require.ErrorContains(t, req.validateSingleTurn(), "client-owned native ToolSearch")
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

	// Native sends the API format raw, without a gateway schema/validation turn.
	assert.Nil(t, req.JSONSchema)
	assert.False(t, req.APIOutputFormat)
	assert.False(t, req.structuredOutput())
	assert.Equal(t, "1", req.maxTurns())
	assert.NotContains(t, req.enabledTools(), "StructuredOutput")
	assert.NotContains(t, cliArgs(req, &Prepared{}, "plugin"), "--json-schema")
	assert.Equal(t, "1", cliEnv(req, false)["CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS"])
	var fields map[string]json.RawMessage
	require.NoError(t, json.Unmarshal([]byte(body), &fields))
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, string(compactRaw(fields["output_config"])), string(round["output_config"]))
	}
}

// TestSingleTurnStructuredWithTools verifies API format structured output + tools.
func TestSingleTurnStructuredWithTools(t *testing.T) {
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

	require.Len(t, req.Tools, 1)
	require.NotNil(t, req.Tools[0].DeferLoading)
	assert.True(t, *req.Tools[0].DeferLoading)
	assert.Nil(t, req.JSONSchema)
	assert.False(t, req.APIOutputFormat)
	assert.False(t, req.structuredOutput())
	assert.NotContains(t, req.enabledTools(), "StructuredOutput")
	assert.NotContains(t, cliArgs(req, &Prepared{}, "plugin"), "--json-schema")
	var fields map[string]json.RawMessage
	require.NoError(t, json.Unmarshal([]byte(body), &fields))
	cfg, err := req.passthroughBodies()
	require.NoError(t, err)
	for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
		assert.Equal(t, string(compactRaw(fields["output_config"])), string(round["output_config"]))
	}

	if !req.toolSearchEnabled() {
		t.Error("expected toolSearchEnabled=true")
	}

	// Provider formatting never authorizes another model call.
	if req.maxTurns() != "1" {
		t.Errorf("expected maxTurns=1 for tool search with API format, got %s", req.maxTurns())
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
			expected: "1", // Tool discovery cannot add a model call.
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

// Only declared client tools may appear in a native response.
func TestResponseViewExcludesUndeclaredToolSearch(t *testing.T) {
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

	// The accumulator must reject helpers the client never declared.
	foundToolSearch := false
	for _, tool := range view.Tools {
		if tool.Name == "ToolSearch" {
			foundToolSearch = true
			break
		}
	}

	if foundToolSearch {
		t.Error("responseView added an undeclared ToolSearch")
	}

	if view.Native["ToolSearch"] {
		t.Error("undeclared ToolSearch marked as native in responseView")
	}
}

func TestSingleTurnAdmissionAndToolOwnership(t *testing.T) {
	for _, tc := range []struct {
		name string
		body string
		beta string
		want string
	}{
		{"hidden search", `{"tools":[{"name":"lookup","defer_loading":true,"input_schema":{"type":"object"}}]}`, "", "client-owned native ToolSearch"},
		{"model fallback", `{"fallbacks":[{"model":"other"}]}`, "server-side-fallback-2026-06-01", "fallbacks"},
		{"hidden web search", `{"tools":[{"type":"web_search_20250305","name":"web_search"}]}`, "", "server web_search"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			fields, err := decodeObject([]byte(tc.body))
			require.NoError(t, err)
			body := basic()
			for key, value := range fields {
				body[key] = value
			}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			req, err := parsePolicyRequest(raw, http.Header{"Anthropic-Beta": []string{tc.beta}})
			require.NoError(t, err)
			require.ErrorContains(t, req.validateSingleTurn(), tc.want)
			gateway := &Gateway{Runner: &Runner{CLI: "must-not-start", Version: "2.1.292"}, Slots: make(chan struct{}, 1)}
			request := httptest.NewRequest(http.MethodPost, "/v1/messages", bytes.NewReader(raw))
			request.Header.Set("Anthropic-Beta", tc.beta)
			response := httptest.NewRecorder()
			gateway.ServeHTTP(response, request)
			assert.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
			assert.Contains(t, response.Body.String(), tc.want)
		})
	}
	req, err := parsePolicyRequest([]byte(`{"model":"m","max_tokens":64,"tools":[{"name":"ToolSearch","input_schema":{"type":"object"}},{"name":"lookup","defer_loading":true,"input_schema":{"type":"object"}}],"messages":[{"role":"user","content":"test"}]}`), nil)
	require.NoError(t, err)
	// Identical client names do not establish ownership of the native tool.
	require.Error(t, req.validateSingleTurn())
	req.Native["ToolSearch"] = true
	require.NoError(t, req.validateSingleTurn())
	assert.False(t, req.bufferedResponse())
	assert.Equal(t, "1", req.maxTurns())
	cfg := newRunConfig(req, &Prepared{}, "plugin", "work")
	assert.Equal(t, "0", cfg.env["CCGATEWAY_TOOL_SEARCH"])
	assert.Equal(t, "true", cfg.env["ENABLE_TOOL_SEARCH"])
	control, err := startModControl(cfg, "http://fixture")
	require.NoError(t, err)
	defer control.Close()
	settings, err := decodeObject(control.config)
	require.NoError(t, err)
	assert.Equal(t, true, settings["single_turn"])
	// Runtime compatibility fallback must re-evaluate the final wire identity.
	delete(req.Native, "ToolSearch")
	require.Error(t, req.validateSingleTurn())
}

func TestRealCLISingleTurnProviderFailure(t *testing.T) {
	for _, tc := range []struct {
		name, message string
		status        int
		maxRequests   int32
	}{
		{"overload", "synthetic overload", 503, 1},
		{"rate_limit", "synthetic rate limit", 429, 1},
		// CLI 2.1.292 can recover a rejected parameter within one turn,
		// outside Mod's turn.step boundary and MAX_RETRIES. This documents
		// that one model turn is not a strict HTTP-attempt budget.
		{"effort_recovery_boundary", "output_config.effort: Extra inputs are not permitted", 400, 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(tc.status)
				kind := "api_error"
				if tc.status == 400 {
					kind = "invalid_request_error"
				}
				if tc.status == 429 {
					kind = "rate_limit_error"
				}
				_ = json.NewEncoder(w).Encode(Object{"type": "error", "error": Object{"type": kind, "message": tc.message}})
			})
			body := `{"model":"claude-sonnet-4-6","max_tokens":64,"output_config":{"effort":"high"},"messages":[{"role":"user","content":"failure fixture"}]}`
			response, err := (&http.Client{Timeout: 25 * time.Second}).Post(endpoint+"/v1/messages", "application/json", strings.NewReader(body))
			require.NoError(t, err)
			defer response.Body.Close()
			_, err = io.Copy(io.Discard, response.Body)
			require.NoError(t, err)
			assert.GreaterOrEqual(t, response.StatusCode, 400)
			assert.GreaterOrEqual(t, calls.Load(), int32(1))
			assert.LessOrEqual(t, calls.Load(), tc.maxRequests)
			t.Logf("provider HTTP attempts=%d; model generation did not start", calls.Load())
		})
	}
}

// A real CLI talks to a gated local provider. Receiving headers or the final
// body is insufficient: the client must consume content before the provider
// is allowed to finish. Each client turn must make exactly one provider call.
func TestRealCLISingleTurnIncrementalHandoff(t *testing.T) {
	for _, nativeSearch := range []bool{false, true} {
		t.Run(fmt.Sprintf("native_search=%v", nativeSearch), func(t *testing.T) {
			textGate, inputGate := make(chan struct{}), make(chan struct{})
			var releaseText, releaseInput sync.Once
			defer releaseText.Do(func() { close(textGate) })
			defer releaseInput.Do(func() { close(inputGate) })
			var calls atomic.Int32
			name, wire, input := "lookup", "mcp__ccgateway__lookup", `{"query":"fixture"}`
			if nativeSearch {
				name, wire, input = "ToolSearch", "ToolSearch", `{"query":"select:fixture_deferred","max_results":5}`
			}
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, err := io.ReadAll(r.Body)
				if err != nil {
					t.Error(err)
					return
				}
				body, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					return
				}
				n := calls.Add(1)
				if n > 1 {
					if n != 2 || !bytes.Contains(raw, []byte("CLIENT_RESULT")) {
						t.Errorf("unsolicited model request %d", n)
					}
					generationFixtureEvents(w, str(body, "model"), "end_turn", "after client", false)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				send := func(event Object) {
					data, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
					w.(http.Flusher).Flush()
				}
				send(Object{"type": "message_start", "message": Object{"id": "msg_single_turn", "type": "message", "role": "assistant", "model": body["model"], "content": []any{}, "stop_reason": nil, "usage": Object{"input_tokens": 2, "output_tokens": 0}}})
				send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
				send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "before tool"}})
				select {
				case <-textGate:
				case <-r.Context().Done():
					return
				}
				send(Object{"type": "content_block_stop", "index": 0})
				send(Object{"type": "content_block_start", "index": 1, "content_block": Object{"type": "tool_use", "id": "toolu_single_turn", "name": wire, "input": Object{}}})
				send(Object{"type": "content_block_delta", "index": 1, "delta": Object{"type": "input_json_delta", "partial_json": input[:9]}})
				select {
				case <-inputGate:
				case <-r.Context().Done():
					return
				}
				send(Object{"type": "content_block_delta", "index": 1, "delta": Object{"type": "input_json_delta", "partial_json": input[9:]}})
				send(Object{"type": "content_block_stop", "index": 1})
				send(Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 9}})
				send(Object{"type": "message_stop"})
			})
			tool := Object{"name": name, "input_schema": Object{"type": "object", "properties": Object{"query": Object{"type": "string"}}}}
			if nativeSearch {
				tool["input_schema"] = verifiedNativeToolCatalogues["2.1.292"]["ToolSearch"][0].Schema
			}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": true, "messages": []any{Object{"role": "user", "content": "single turn fixture"}}, "tools": []any{tool}}
			if nativeSearch {
				body["tools"] = append(body["tools"].([]any), Object{"name": "fixture_deferred", "defer_loading": true, "input_schema": Object{"type": "object"}})
			}
			post := func() *http.Response {
				t.Helper()
				raw, err := json.Marshal(body)
				require.NoError(t, err)
				request, err := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				require.NoError(t, err)
				request.Header.Set("Content-Type", "application/json")
				request.Header.Set("Anthropic-Beta", "advanced-tool-use-2025-11-20,fine-grained-tool-streaming-2025-05-14")
				response, err := (&http.Client{Timeout: 25 * time.Second}).Do(request)
				require.NoError(t, err)
				if response.StatusCode != http.StatusOK {
					data, _ := io.ReadAll(response.Body)
					response.Body.Close()
					t.Fatalf("HTTP %d: %s", response.StatusCode, data)
				}
				return response
			}
			response := post()
			defer response.Body.Close()
			scanner := bufio.NewScanner(response.Body)
			var receivedInput strings.Builder
			starts, stops, texts := 0, 0, 0
			for scanner.Scan() {
				data, ok := strings.CutPrefix(scanner.Text(), "data: ")
				if !ok {
					continue
				}
				event, err := decodeObject([]byte(data))
				require.NoError(t, err)
				switch str(event, "type") {
				case "error":
					t.Fatalf("stream error: %s", data)
				case "message_start":
					starts++
				case "message_stop":
					stops++
				case "content_block_start":
					block, _ := event["content_block"].(Object)
					if str(block, "type") == "tool_use" {
						assert.Equal(t, name, str(block, "name"))
					}
				case "content_block_delta":
					delta, _ := event["delta"].(Object)
					switch str(delta, "type") {
					case "text_delta":
						texts++
						assert.Equal(t, "before tool", str(delta, "text"))
						releaseText.Do(func() { close(textGate) })
					case "input_json_delta":
						receivedInput.WriteString(str(delta, "partial_json"))
						if str(delta, "partial_json") != "" {
							releaseInput.Do(func() { close(inputGate) })
						}
					}
				}
			}
			require.NoError(t, scanner.Err())
			assert.Equal(t, 1, starts)
			assert.Equal(t, 1, stops)
			assert.Positive(t, texts)
			assert.JSONEq(t, input, receivedInput.String())
			require.Equal(t, int32(1), calls.Load(), "Worker continued before receiving the client's tool_result")
			args, err := decodeObject([]byte(input))
			require.NoError(t, err)
			body["stream"] = false
			body["messages"] = append(body["messages"].([]any),
				Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "before tool"}, Object{"type": "tool_use", "id": "toolu_single_turn", "name": name, "input": args}}},
				Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_single_turn", "content": "CLIENT_RESULT"}}},
			)
			next := post()
			defer next.Body.Close()
			raw, err := io.ReadAll(next.Body)
			require.NoError(t, err)
			require.Contains(t, string(raw), "after client")
			require.Equal(t, int32(2), calls.Load(), "two client requests must produce exactly two model requests")
			t.Log("text and input deltas arrived before provider completion; two client turns produced two model requests")
		})
	}
}
