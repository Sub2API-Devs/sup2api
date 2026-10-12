package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func completedHistoryBody(name string) Object {
	b := basic()
	b["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "old", "name": name, "input": Object{"n": json.Number("9007199254740993")}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "old", "content": "done"}}}, Object{"role": "assistant", "content": "completed"}, Object{"role": "user", "content": "next"}}
	return b
}
func TestCompletedClientHistoryDoesNotAuthorizeExecution(t *testing.T) {
	for _, name := range []string{"bash", "retired_fixture", "ToolSearch"} {
		t.Run(name, func(t *testing.T) {
			body := completedHistoryBody(name)
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			r, err := parsePolicyRequest(raw, nil)
			require.NoError(t, err)
			old := r.Messages[1].Content[0]
			wire := r.wireMessage(r.Messages[1]).Content[0]
			assert.Equal(t, old, wire, "history must not be rewritten")
			assert.Empty(t, r.Tools)
			assert.Empty(t, r.enabledTools())
			assert.Empty(t, clientToolName(r, name))
			assert.Empty(t, r.apiResponseToolName(old), "history must not grant execution")
			r.ToolSearch = "true"
			assert.False(t, internalHistoryAssistant(r, Object{"content": []Object{wire}}), "history must not be consumed as a helper")
			changed, err := jsonCopyObject(old)
			require.NoError(t, err)
			changed["input"] = Object{}
			assert.False(t, r.completedClientHistoryBlock(changed), "identity must not accept changed input")
		})
	}
}
func TestCompletedClientHistoryPendingAndCurrentCatalog(t *testing.T) {
	body := completedHistoryBody("bash")
	body["messages"] = body["messages"].([]any)[:2]
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	_, err = parsePolicyRequest(raw, nil)
	require.Error(t, err, "pending undeclared history must not be admitted")
	body = completedHistoryBody("fixture")
	body["tools"] = []any{Object{"name": "fixture", "input_schema": Object{"type": "object"}}}
	raw, err = json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	assert.Empty(t, r.completedClientHistory, "current catalog must not be bypassed")
	assert.Equal(t, "mcp__ccgateway__fixture", str(r.wireMessage(r.Messages[1]).Content[0], "name"))
}

func TestCompletedClientHistoryPairingAndSnapshotScope(t *testing.T) {
	for _, mode := range []string{"duplicate", "wrong-result", "reordered"} {
		t.Run(mode, func(t *testing.T) {
			b := completedHistoryBody("bash")
			ms := b["messages"].([]any)
			switch mode {
			case "duplicate":
				ms[1].(Object)["content"] = append(ms[1].(Object)["content"].([]any), ms[1].(Object)["content"].([]any)[0])
			case "wrong-result":
				ms[2].(Object)["content"].([]any)[0].(Object)["tool_use_id"] = "other"
			case "reordered":
				ms[1], ms[2] = ms[2], ms[1]
			}
			raw, err := json.Marshal(b)
			require.NoError(t, err)
			_, err = parsePolicyRequest(raw, nil)
			require.Error(t, err, "invalid history pairing must be rejected")
		})
	}
	raw, err := json.Marshal(completedHistoryBody("bash"))
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	original := r.toolHistoryNamespace()
	r.completedClientHistory["another"] = "fingerprint"
	assert.Equal(t, original, r.toolHistoryNamespace(), "growing history must not invalidate configuration key")
	r.completedClientHistory = nil
	assert.NotEqual(t, original, r.toolHistoryNamespace(), "legacy renamed snapshot must be isolated")
	r, err = parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	r.CustomToolPrefix = "different"
	r.NoTools = true
	assert.Equal(t, "bash", str(r.wireMessage(r.Messages[1]).Content[0], "name"))
	assert.Empty(t, r.enabledTools(), "configuration must not change history execution authority")
}

func TestCompletedClientHistoryExplicitDirect(t *testing.T) {
	b := completedHistoryBody("screenshot")
	call := b["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
	call["caller"] = Object{"type": "direct"}
	raw, err := json.Marshal(b)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	assert.Equal(t, digest(call), digest(r.wireMessage(r.Messages[1]).Content[0]), "explicit direct caller fields must not change")
	call["caller"].(Object)["tool_id"] = "server_parent"
	raw, err = json.Marshal(b)
	require.NoError(t, err)
	_, err = parsePolicyRequest(raw, nil)
	require.Error(t, err, "direct caller must not smuggle a server parent")
}
