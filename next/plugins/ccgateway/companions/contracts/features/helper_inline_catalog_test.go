package features

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeCatalogSeparatesTaskBudgetFromInlineHistory(t *testing.T) {
	byID := sourceCatalogFeatures(t)
	// task_budget can be expressed through native output_config without the
	// removed helper-history service. That does not enable inline tool changes
	// or the API context/compaction protocols owned by the old relay.
	for _, tc := range []struct {
		id, status string
	}{
		{"F-TASK-BUDGET", "partial"},
		{"F-INLINE-TOOLS", "unsupported"},
		{"F-CONTEXT", "unsupported"},
		{"F-COMPACTION", "unsupported"},
	} {
		t.Run(tc.id, func(t *testing.T) {
			require.Contains(t, byID, tc.id)
			feature := byID[tc.id]
			assert.Equal(t, tc.status, feature.Status, "native budget expression must not imply helper or inline history support")
			assert.Equal(t, "api", feature.Scope)
		})
	}
}
