package pluginsandbox

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestExecEnvironmentKeepsHandshakeAndDropsCoreSecrets(t *testing.T) {
	got := execEnvironment([]string{
		"PATH=/bin",
		"PLUGIN_PROTOCOL_VERSIONS=1",
		"SUB2API_PLUGIN_MAGIC_COOKIE=cookie",
		"DATABASE_PASSWORD=secret",
		"JWT_SECRET=secret",
		"SUB2API_MASTER_KEY=secret",
	})

	require.ElementsMatch(t, []string{
		"PATH=/bin",
		"PLUGIN_PROTOCOL_VERSIONS=1",
		"SUB2API_PLUGIN_MAGIC_COOKIE=cookie",
	}, got)
}

func TestVerifyBinaryRejectsChangedContent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "plugin")
	require.NoError(t, os.WriteFile(path, []byte("trusted"), 0o700))
	digest := sha256.Sum256([]byte("trusted"))
	want := hex.EncodeToString(digest[:])
	require.NoError(t, verifyBinary(path, want))

	require.NoError(t, os.WriteFile(path, []byte("replaced"), 0o700))
	require.ErrorContains(t, verifyBinary(path, want), "checksum mismatch")
}

func TestParseExecArgsRequiresLandlockWhenConfigured(t *testing.T) {
	_, err := parseExecArgs([]string{
		"--expected-sha256=" + strings.Repeat("0", sha256.Size*2),
		"--require-landlock=true",
		"--landlock=false",
		"--",
		"/plugin",
	})
	require.Error(t, err)
}
