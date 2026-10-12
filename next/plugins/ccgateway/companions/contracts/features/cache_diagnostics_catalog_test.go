package features

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeCatalogQualifiesCacheDiagnosticsAndHistory(t *testing.T) {
	byID := sourceCatalogFeatures(t)
	// These entries cover admitted native requests, not relay-era cache
	// restoration, assistant prefill or nonstreaming zero-token warmup.
	// Local history hits and diagnostics do not establish provider cache hits.
	for _, id := range []string{"F-CACHE", "F-DIAGNOSTICS", "F-MESSAGES", "F-LIMITS"} {
		t.Run(id, func(t *testing.T) {
			require.Contains(t, byID, id)
			feature := byID[id]
			assert.Equal(t, "partial", feature.Status, "native support must retain its admission and provider limits")
			assert.Equal(t, "api", feature.Scope)
		})
	}
}
