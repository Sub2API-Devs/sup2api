package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeResponseMetadataComparison(t *testing.T) {
	want := []Object{{"type": "text", "text": "answer", "citations": []any{Object{"type": "char_location", "document_index": 0, "start_char_index": 0, "end_char_index": 1, "cited_text": "a"}}}}
	row, err := json.Marshal(Object{"type": "assistant", "message": Object{"id": "msg_cmp", "content": []any{Object{"type": "text", "text": "answer"}}}})
	require.NoError(t, err)
	assert.True(t, nativeResponseContentMatches([]json.RawMessage{row}, "msg_cmp", &Request{}, want))
	want[0]["text"] = "different"
	assert.False(t, nativeResponseContentMatches([]json.RawMessage{row}, "msg_cmp", &Request{}, want))
}

func contextRequest(t *testing.T, fields string, beta string) (*Request, error) {
	t.Helper()
	raw := []byte(`{"model":"claude-opus-5-5","max_tokens":64,"messages":[{"role":"user","content":"hello"}]` + fields + `}`)
	h := http.Header{}
	h.Set("anthropic-beta", beta)
	return parsePolicyRequest(raw, h)
}

func TestNativeContextCompactionAdmissionWithoutForwarding(t *testing.T) {
	for _, fields := range []string{
		`,"compaction":null,"context_management":null`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"all"}}]}`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"thinking_turns","value":2}},{"type":"clear_tool_uses_20250919","clear_at_least":null,"clear_tool_inputs":null,"exclude_tools":null}]}`,
		`,"context_management":{"edits":[{"type":"compact_20260112","trigger":null,"instructions":null,"pause_after_compaction":false}]}`,
		`,"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"context_management":{"edits":[{"type":"clear_tool_uses_20250919","exclude_tools":["lookup","old_tool"],"clear_tool_inputs":["lookup"]}]}`,
	} {
		r, err := contextRequest(t, fields, contextBeta+","+thresholdCompactionBeta)
		require.NoError(t, err)
		before := r.Plan.MainRequestFields()
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
			assert.NotContains(t, round, "context_management")
			assert.NotContains(t, round, "compaction")
		}
		assert.Equal(t, before, r.Plan.MainRequestFields())
	}
	for _, fields := range []string{
		`,"context_management":{"edits":null}`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"thinking_turns","value":-0}}]}`,
		`,"context_management":{"edits":[{"type":"clear_tool_uses_20250919","keep":{"type":"tool_uses","value":1e999}}]}`,
		`,"context_management":{"edits":[{"type":"clear_tool_uses_20250919"},{"type":"clear_thinking_20251015"}]}`,
		`,"compaction":{"type":"summarize","instructions":" "}`,
		`,"compaction":{"type":"summarize"},"context_management":{"edits":[]}`,
	} {
		_, err := contextRequest(t, fields, contextBeta+","+signedCompactionBeta)
		require.Error(t, err, fields)
	}
}

func TestNativeContextControlsDoNotOverrideToolSearch(t *testing.T) {
	tools := `,"tools":[{"name":"Read","input_schema":{"type":"object"}},{"name":"Bash","input_schema":{"type":"object"},"defer_loading":true}]`
	for _, edit := range []string{
		`{"type":"clear_thinking_20251015","keep":"all"}`,
		`{"type":"clear_thinking_20251015","keep":{"type":"all"}}`,
		`{"type":"clear_thinking_20251015","keep":{"type":"thinking_turns","value":1}}`,
		`{"type":"compact_20260112"}`,
	} {
		r, err := contextRequest(t, tools+`,"context_management":{"edits":[`+edit+`]}`, contextBeta+","+thresholdCompactionBeta)
		require.NoError(t, err)
		assert.True(t, r.toolSearchEnabled())
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		assert.NotContains(t, cfg.First, "context_management")
		assert.NotContains(t, cfg.Rest, "context_management")
	}
}
