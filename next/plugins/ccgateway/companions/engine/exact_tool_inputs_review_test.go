package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewExactToolInputsKeepDistinctHistoryIdentity(t *testing.T) {
	want := Object{"type": "tool_use", "id": "tool_fixture", "name": "local", "input": Object{"number": json.Number("9007199254740993"), "text": "9007199254740993"}}
	original := fingerprints([]Message{{Role: "assistant", Content: []Object{want}}})
	for _, input := range []Object{
		{"number": json.Number("9007199254740992"), "text": "9007199254740993"},
		{"number": json.Number("9007199254740992"), "text": "9007199254740992"},
		{"number": "9007199254740993", "text": "9007199254740993"},
		{"number": json.Number("9007199254740993"), "text": "9007199254740993", "extra": true},
	} {
		changed, err := jsonCopyObject(want)
		require.NoError(t, err)
		changed["input"] = input
		assert.NotEqual(t, original, fingerprints([]Message{{Role: "assistant", Content: []Object{changed}}}))
	}
}

func TestNativeMCPConnectorAndRawHistoryRefused(t *testing.T) {
	for _, beta := range []string{mcpConnectorBeta, mcpListingBeta} {
		h := http.Header{"Anthropic-Beta": []string{beta}}
		_, err := parsePolicyRequest([]byte(`{"model":"m","max_tokens":64,"mcp_servers":[],"messages":[{"role":"user","content":"q"}]}`), h)
		require.ErrorContains(t, err, "mcp_servers is not supported")
		for _, blocks := range []string{
			`[{"type":"mcp_tool_use","id":"mcptoolu_numeric","name":"remote","server_name":"one","input":{"integer":9007199254740993,"decimal":0.12345678901234567890123456789}},{"type":"mcp_tool_result","tool_use_id":"mcptoolu_numeric","is_error":false,"content":"result"}]`,
			`[{"type":"mcp_tool_listing","mcp_server_name":"one","tools":[{"name":"remote","input_schema":{"type":"object","properties":{"value":{"type":"integer","minimum":9007199254740993}}}}]}]`,
		} {
			_, err := parsePolicyRequest([]byte(`{"model":"m","max_tokens":64,"messages":[{"role":"user","content":"q"},{"role":"assistant","content":`+blocks+`},{"role":"user","content":"next"}]}`), h)
			require.ErrorContains(t, err, "not supported")
		}
	}
}

func TestNativeToolEventRejectsUndeclaredIdentityAndMalformedInput(t *testing.T) {
	r := plannedRequest(t, Object{"tools": []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}}}})
	for _, block := range []Object{
		{"type": "tool_use", "id": "call", "name": "mcp__ccgateway__other", "input": Object{}},
		{"type": "tool_use", "id": "", "name": "mcp__ccgateway__lookup", "input": Object{}},
		{"type": "tool_use", "id": "call", "name": "mcp__ccgateway__lookup", "input": "9007199254740993"},
	} {
		a := &Accumulator{}
		require.NoError(t, a.push(Object{"type": "message_start", "message": Object{"id": "msg", "role": "assistant"}}, r))
		require.Error(t, a.push(Object{"type": "content_block_start", "index": 0, "content_block": block}, r))
		assert.Empty(t, a.Blocks)
	}
}
