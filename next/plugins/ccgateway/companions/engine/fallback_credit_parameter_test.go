package engine

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCreditObjectSecretEchoIsRedacted(t *testing.T) {
	d := detachedDiagnostic(t)
	d.prepareSecrets(parseRequestBody([]byte(`{"fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL","mode":"best_effort"}}`)))
	d.save("safe.json", []byte(`{"echo":"OBJECT_SECRET_SENTINEL","fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL"}}`))
	d.flushLogs()
	raw, err := os.ReadFile(filepath.Join(d.directory, "safe.json"))
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "OBJECT_SECRET_SENTINEL", "object token must not leak into diagnostic echo")
}
