package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestToolMetadataNamespaceAndValues(t *testing.T) {
	body := serverSearchTestBody()
	body["tools"] = body["tools"].([]any)[1:]
	tool := body["tools"].([]any)[0].(map[string]any)
	tool["input_schema"] = Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}
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
	if req.toolHistoryNamespace() == old || req.configKey() == baseline.configKey() {
		t.Fatal("tool metadata not part of plan/history identity")
	}
	require.Len(t, req.Tools, 1)
	got := req.Tools[0].Metadata
	listed := sdkMCPReply(Object{"server_name": req.toolServer(), "message": Object{"id": "list", "method": "tools/list"}}, req)
	tools := listed["result"].(Object)["tools"].([]Object)
	require.Len(t, tools, 1)
	assert.Equal(t, digest(req.Tools[0].Schema), digest(tools[0]["inputSchema"]))
	assert.Contains(t, string(mustServerJSON(tools)), `"const":9007199254740993`)
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
		_, err := parsePolicyRequest(mustServerJSON(body), nil)
		require.ErrorContains(t, err, `server tool "tool_search_tool_regex_20251119"`)
		delete(body, "tool_choice")
		req, err := parseRequest(mustServerJSON(body))
		require.NoError(t, err)
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
