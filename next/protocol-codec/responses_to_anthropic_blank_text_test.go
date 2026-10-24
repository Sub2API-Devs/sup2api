package apicompat

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

// Anthropic rejects an assistant turn reduced to a lone blank text block
// ("text content blocks must contain non-whitespace text"). User turns keep
// theirs: only the emptiness rule applies to them, and dropping user content
// changes the history the upstream sees. This split is decided in exactly one
// place (the role value passed to appendRoleItemAnthropic); these cases fail if
// that decision moves or is applied to both roles.
func TestResponsesToAnthropic_BlankTextRoleSplit(t *testing.T) {
	var req ResponsesRequest
	require.NoError(t, json.Unmarshal([]byte(`{"model":"glm-5.2","input":[
		{"type":"message","role":"user","content":[{"type":"input_text","text":"   "}]},
		{"type":"message","role":"assistant","content":[{"type":"output_text","text":"  "}]},
		{"type":"message","role":"assistant","content":[{"type":"output_text","text":"real answer"}]},
		{"type":"message","role":"user","content":[{"type":"input_text","text":"real question"}]}
	]}`), &req))

	out, err := ResponsesToAnthropicRequest(&req)
	require.NoError(t, err)
	messages := out.Messages

	// The blank assistant turn is dropped; the blank user turn is kept.
	require.Len(t, messages, 3)
	require.Equal(t, "user", messages[0].Role)
	require.Contains(t, string(messages[0].Content), `"   "`, "user 侧仅空白文本必须保留")
	require.Equal(t, "assistant", messages[1].Role)
	require.Contains(t, string(messages[1].Content), "real answer")
	require.Equal(t, "user", messages[2].Role)
	require.Contains(t, string(messages[2].Content), "real question")
}

// An entirely empty user item is still dropped: an empty message is rejected by
// Anthropic whatever the role.
func TestResponsesToAnthropic_EmptyUserContentStillDropped(t *testing.T) {
	var req ResponsesRequest
	require.NoError(t, json.Unmarshal([]byte(`{"model":"glm-5.2","input":[
		{"type":"message","role":"user","content":[{"type":"reasoning_text","text":"no equivalent"}]},
		{"type":"message","role":"user","content":[{"type":"input_text","text":"real question"}]}
	]}`), &req))

	out, err := ResponsesToAnthropicRequest(&req)
	require.NoError(t, err)
	messages := out.Messages
	require.Len(t, messages, 1, "只含未知分片的 user 项被丢弃后应与下一条合并")
	require.Contains(t, string(messages[0].Content), "real question")
	require.NotContains(t, string(messages[0].Content), "no equivalent")
}
