package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReviewCompletedClientHistoryAlongsideNativeWebSearch(t *testing.T) {
	b := completedHistoryBody("retired_fixture")
	b["tools"] = []any{Object{"type": "web_search_20250305", "name": "web_search"}}
	raw, err := json.Marshal(b)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, policyHeaders(defaultRequestPolicy()))
	require.NoError(t, err)
	want := r.Messages[1].Content[0]
	assert.Equal(t, want, r.wireMessage(r.Messages[1]).Content[0], "native web search must not change completed client identity")
	assert.Empty(t, r.apiResponseToolName(want), "history must not authorize a new tool invocation")
	assert.Empty(t, clientToolName(r, "retired_fixture"))
	assert.Empty(t, r.searchReferenceName("retired_fixture", false), "completed history must not become a searchable tool")
}

func TestReviewCompletedClientHistoryCannotDefineSearchReference(t *testing.T) {
	b := completedHistoryBody("retired_fixture")
	b["tools"] = []any{Object{"name": "current_fixture", "input_schema": Object{"type": "object"}}}
	raw, err := json.Marshal(b)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	// Exercise catalog resolution itself, without declaring an unsupported server search tool.
	assert.Equal(t, "current_fixture", r.searchReferenceName("current_fixture", false))
	assert.Equal(t, "current_fixture", r.searchReferenceName("mcp__ccgateway__current_fixture", true))
	assert.Empty(t, r.searchReferenceName("retired_fixture", false))
	assert.Empty(t, r.searchReferenceName("mcp__ccgateway__retired_fixture", true))
	assert.Empty(t, r.wireSearchReferenceName("retired_fixture"))
}

func TestReviewCompletedClientHistoryCacheDoesNotRename(t *testing.T) {
	for _, name := range []string{"retired_fixture", "bash"} {
		t.Run(name, func(t *testing.T) {
			b := completedHistoryBody(name)
			block := b["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
			block["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
			raw, err := json.Marshal(b)
			require.NoError(t, err)
			r, err := parsePolicyRequest(raw, nil)
			require.NoError(t, err)
			wire := r.wireMessage(r.Messages[1]).Content[0]
			assert.Equal(t, name, str(wire, "name"), "cached completed history must not be renamed")
			assert.Equal(t, digest(block["input"]), digest(wire["input"]), "cached history input must not change")
			changed, err := jsonCopyObject(r.Messages[1].Content[0])
			require.NoError(t, err)
			changed["input"].(Object)["cache_control"] = Object{"fixture": true}
			assert.False(t, r.completedClientHistoryBlock(changed), "cache_control inside opaque tool input must not be normalized away")
		})
	}
}
