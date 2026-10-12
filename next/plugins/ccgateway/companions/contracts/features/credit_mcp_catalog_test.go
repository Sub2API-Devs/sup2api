package features

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeCatalogSeparatesMCPConnectorFromClientTools(t *testing.T) {
	byID := sourceCatalogFeatures(t)
	// SDK MCP registration for ordinary client tools is not API MCP connector
	// support. Internal ToolSearch and safeguards retain their native subset.
	// Fallback remains partial for Worker-coordinated model attempts, not
	// fallback-credit redemption or replay of fallback history.
	for _, tc := range []struct {
		id, status, scope string
	}{
		{"F-MCP", "unsupported", "api"},
		{"F-TOOLS", "partial", "api"},
		{"F-TOOL-SEARCH", "partial", "api"},
		{"F-SAFEGUARDS", "partial", "cc"},
		{"F-FALLBACK", "partial", "api"},
	} {
		t.Run(tc.id, func(t *testing.T) {
			require.Contains(t, byID, tc.id)
			feature := byID[tc.id]
			assert.Equal(t, tc.status, feature.Status, "catalog must distinguish native tools from rejected server capabilities")
			assert.Equal(t, tc.scope, feature.Scope)
		})
	}
}
