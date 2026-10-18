package ccgateway

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativePolicyDropsRetiredControlsOnSaveReload(t *testing.T) {
	var cfg Config
	require.NoError(t, json.Unmarshal([]byte(`{"mode":"disabled","request_policy":{"unknown_field":"ignore","unknown_beta":"reject","attachment_source":"both","attachment_sources":{"environment":"gateway"},"environment_fields":{"workingDirectory":"gateway"},"unknown_client_attachment":"ignore","unknown_gateway_attachment":"pass","tool_search":"false","custom_tool_prefix":"client-tools","thinking_disabled_compat":"omit"}}`), &cfg))
	for range 2 {
		saved, err := mergeConfig(cfg, Config{Mode: "disabled"})
		require.NoError(t, err)
		for _, value := range []any{saved, saved.Public(), saved.WorkerRequestPolicy(26)} {
			raw, err := json.Marshal(value)
			require.NoError(t, err)
			for _, field := range []string{"unknown_beta", "attachment_source", "attachment_sources", "environment_fields", "unknown_client_attachment", "unknown_gateway_attachment"} {
				assert.NotContains(t, string(raw), `"`+field+`"`)
			}
		}
		raw, err := json.Marshal(saved)
		require.NoError(t, err)
		require.NoError(t, json.Unmarshal(raw, &cfg))
		policy := cfg.EffectiveRequestPolicy()
		assert.Equal(t, "build", policy.RelayMode)
		assert.Equal(t, "ignore", policy.UnknownField)
		assert.Equal(t, "false", policy.ToolSearch)
		assert.Equal(t, "client-tools", policy.CustomToolPrefix)
		assert.Equal(t, "omit", policy.ThinkingDisabledCompat)
	}
}
