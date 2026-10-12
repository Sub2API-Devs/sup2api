package features

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func sourceCatalogFeatures(t *testing.T) map[string]Feature {
	t.Helper()
	doc := Catalog()
	require.Equal(t, CatalogVersion, doc.CatalogVersion)
	require.False(t, doc.RuntimeVerified, "source declarations do not verify deployment, OAuth refresh or provider entitlement")
	byID := make(map[string]Feature, len(doc.Features))
	for _, feature := range doc.Features {
		byID[feature.ID] = feature
	}
	return byID
}

func TestExecutionCatalogReflectsNativeAdmission(t *testing.T) {
	byID := sourceCatalogFeatures(t)
	// Refused capabilities remain visible as unsupported. Beta mappings and
	// archived relay adapters must not promote them to executable features.
	for _, tc := range []struct {
		id, status, scope string
	}{
		{"F-RELAY-NATIVE", "partial", "cc"},
		{"F-ADD-DIR", "supported", "cc"},
		{"F-STREAM", "partial", "api"},
		{"F-WEB-TOOLS", "partial", "api"},
		{"F-CODE-EXEC", "unsupported", "api"},
		{"F-PTC", "unsupported", "api"},
		{"F-ADVISOR", "unsupported", "api"},
		{"F-CLIENT-TOOLSETS", "unsupported", "api"},
		{"F-COUNT-TOKENS", "unsupported", "api"},
	} {
		t.Run(tc.id, func(t *testing.T) {
			require.Contains(t, byID, tc.id)
			feature := byID[tc.id]
			assert.Equal(t, tc.status, feature.Status)
			assert.Equal(t, tc.scope, feature.Scope)
		})
	}
}

func TestExecutionCatalogKeepsResourceManagementSeparate(t *testing.T) {
	byID := sourceCatalogFeatures(t)
	// Independent management HTTP survives native-only model execution. Its
	// presence does not establish container execution or verified OAuth access.
	for _, tc := range []struct {
		id, endpoint string
	}{
		{"F-FILES", "/v1/files"},
		{"F-SKILLS", "/v1/skills"},
	} {
		t.Run(tc.id, func(t *testing.T) {
			require.Contains(t, byID, tc.id)
			feature := byID[tc.id]
			assert.Equal(t, "partial", feature.Status)
			assert.Equal(t, "api", feature.Scope)
			assert.Contains(t, feature.BodyPaths, tc.endpoint, "keep the public management endpoint discoverable")
			assert.Contains(t, strings.Join(feature.Mechanisms, " "), "HTTP", "describe the management transport without tying the contract to prose")
		})
	}
}
