package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeRejectsCompletedToolsetHistory(t *testing.T) {
	// Unlike ordinary completed client history, a removed typed toolset still
	// requires transport identity that native Claude Code cannot express.
	body := completedHistoryBody("screenshot")
	messages := body["messages"].([]any)
	call := messages[1].(Object)["content"].([]any)[0].(Object)
	result := messages[2].(Object)["content"].([]any)[0].(Object)
	call["toolset_name"] = "browser"
	result["toolset_name"] = "browser"
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.ErrorContains(t, err, "tool_use.toolset_name is not supported by this gateway")
	assert.Nil(t, r)
}
