package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeContextControlsAreCLIOwned(t *testing.T) {
	for _, fields := range []string{
		"",
		`,"context_management":null`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":"all"}]}`,
		`,"compaction":{"type":"summarize"}`,
	} {
		r, err := contextRequest(t, fields, contextBeta+","+signedCompactionBeta)
		require.NoError(t, err)
		cfg, err := r.passthroughBodies()
		require.NoError(t, err)
		for _, round := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
			assert.NotContains(t, round, "context_management")
			assert.NotContains(t, round, "compaction")
			assert.NotContains(t, round, "thinking")
		}
		for _, decision := range r.Plan.FeatureDecisions() {
			if decision["field"] == "context_management" || decision["field"] == "compaction" {
				assert.Equal(t, "cli_owned_not_forwarded", decision["action"])
			}
		}
	}
}
