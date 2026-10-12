package engine

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestRelease80NativeRejectsConnectorListingHistory(t *testing.T) {
	for _, variant := range []string{"deferred", "eager", "disabled"} {
		t.Run(variant, func(t *testing.T) {
			body := dynamicMCPFixture()
			def := body["tools"].([]any)[0].(Object)
			if variant == "eager" {
				def["configs"] = Object{"echo": Object{"defer_loading": false}}
			}
			if variant == "disabled" {
				def["configs"] = Object{"echo": Object{"enabled": false, "defer_loading": false}}
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []any{dynamicMCPListing()}}, Object{"role": "user", "content": "continue"})
			_, err := parsePolicyRequest(mustServerJSON(body), nil)
			require.ErrorContains(t, err, "mcp_servers is not supported by this gateway")
		})
	}
}
