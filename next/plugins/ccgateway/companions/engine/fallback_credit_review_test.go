package engine

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCreditDiagnosticsNeverPersistToken(t *testing.T) {
	d := &requestDiagnostic{directory: t.TempDir(), fields: Object{}}
	d.prepareSecrets(parseRequestBody([]byte(`{"model":"fixture"}`)), "fallback-credit-2026-07-01")
	d.appendTrace("before-token.raw", []byte("SECRET_CREDIT_SENTINEL"))
	d.prepareSecrets(parseRequestBody([]byte(`{"stop_details":{"fallback_credit_token":"SECRET_CREDIT_SENTINEL"}}`)))
	d.save("event.json", []byte(`{"stop_details":{"fallback_credit_token":"SECRET_CREDIT_SENTINEL"},"message":"echo SECRET_CREDIT_SENTINEL"}`))
	entries, _ := os.ReadDir(d.directory)
	for _, entry := range entries {
		raw, _ := os.ReadFile(filepath.Join(d.directory, entry.Name()))
		if strings.Contains(string(raw), "SECRET_CREDIT_SENTINEL") {
			t.Fatal("token persisted", entry.Name())
		}
	}
}
