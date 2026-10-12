package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNativeContinuationRefusesPrefillAndServerPause(t *testing.T) {
	for name, tail := range map[string][]Object{
		"prefill":      {{"type": "text", "text": "prefix"}},
		"server-pause": {{"type": "server_tool_use", "id": "srvtoolu_pending", "name": "web_search", "input": Object{"query": "q"}}},
		"mixed-pause":  {{"type": "text", "text": "pending"}, {"type": "server_tool_use", "id": "srvtoolu_pending", "name": "web_search", "input": Object{"query": "q"}}},
	} {
		t.Run(name, func(t *testing.T) {
			body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128,
				"tools":    []any{Object{"type": "web_search_20250305", "name": "web_search"}},
				"messages": []any{Object{"role": "user", "content": "question"}, Object{"role": "assistant", "content": tail}}}
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			_, err = parsePolicyRequest(raw, nil)
			require.ErrorContains(t, err, "assistant prefill")
		})
	}
}
