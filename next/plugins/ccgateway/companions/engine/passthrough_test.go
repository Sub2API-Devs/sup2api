package engine

import (
	"runtime"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNativeEnvironmentValidationUsesChildCasing(t *testing.T) {
	base := []string{"ANTHROPIC_BASE_URL=https://primary.invalid", "anthropic_base_url=https://override.invalid"}
	want := "https://primary.invalid"
	if runtime.GOOS == "windows" {
		want = "https://override.invalid"
	}
	require.Equal(t, want, environmentValue(base, "ANTHROPIC_BASE_URL"))
	require.Equal(t, want, environmentValue(envWith(base, nil), "ANTHROPIC_BASE_URL"))
}
