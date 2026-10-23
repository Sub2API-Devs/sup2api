package engine

import (
	"crypto/sha256"
	"encoding/hex"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

// A pinned CLI is asked for its request info once at startup, and a checksum
// the caller verified is not computed again (audit C12).
func TestPinnedCLIIsVerifiedOnce(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	file, err := os.Open(exe)
	require.NoError(t, err)
	h := sha256.New()
	_, err = io.Copy(h, file)
	file.Close()
	require.NoError(t, err)
	sum := hex.EncodeToString(h.Sum(nil))
	log := filepath.Join(t.TempDir(), "runs.log")
	t.Setenv("CCG_TEST_INFO_PEER", log)
	pinned := Options{ExpectedCLIVersion: "2.1.304", ExpectedCLISHA256: sum, ExpectedCLIPatch: "ccgateway-test", RequestMode: "build", CLI: exe}
	runs := func() []string {
		raw, _ := os.ReadFile(log)
		_ = os.Remove(log)
		return strings.Fields(strings.ReplaceAll(string(raw), "\n", " "))
	}

	_, version, info, err := loadPinnedCLI(pinned)
	require.NoError(t, err)
	require.Equal(t, "2.1.304", version)
	require.True(t, info.supports("request_build"))
	require.Equal(t, sum, info.SHA256)
	require.Equal(t, []string{"--version", "--ccgateway-info"}, runs(), "one version and one info run")

	wrong := pinned
	wrong.ExpectedCLISHA256 = strings.Repeat("0", 64)
	_, _, _, err = loadPinnedCLI(wrong)
	require.ErrorContains(t, err, "checksum mismatch")
	runs()
	// The active runtime verified the file: the engine trusts that check.
	wrong.CLIChecksumVerified = true
	_, _, _, err = loadPinnedCLI(wrong)
	require.NoError(t, err)
	require.Equal(t, []string{"--version", "--ccgateway-info"}, runs())

	// The patch and the configured mode are still checked on that one answer.
	other := pinned
	other.ExpectedCLIPatch = "ccgateway-other"
	_, _, _, err = loadPinnedCLI(other)
	require.ErrorContains(t, err, "patch identity mismatch")
	other = pinned
	other.RequestMode = "native"
	_, _, _, err = loadPinnedCLI(other)
	require.Error(t, err)

	// An unpinned CLI is asked once too.
	runs()
	_, _, info, err = loadPinnedCLI(Options{RequestMode: "direct", CLI: exe})
	require.NoError(t, err)
	require.True(t, info.supports("request_direct"))
	require.Equal(t, []string{"--version", "--ccgateway-info"}, runs())
}
