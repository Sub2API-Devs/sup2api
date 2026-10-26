package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDiagnosticSecretsStructuredAndSplitCapture(t *testing.T) {
	d := detachedDiagnostic(t)
	dir := d.directory
	d.prepareSecrets(parseRequestBody([]byte(`{"mcp_servers":[{"authorization_token":"MCP_PRIVATE_SENTINEL"}]}`)))
	d.save("request.body", []byte(`{"authorization_token":"MCP_PRIVATE_SENTINEL","model":"fixture"}`))
	d.save("upstream.body", []byte(`{"error":{"message":"echo MCP_PRIVATE_SENTINEL here"},"number":9007199254740993}`))
	d.appendTrace("upstream.raw", []byte("MCP_PRIVATE_"))
	d.appendTrace("upstream.raw", []byte("SENTINEL"))
	d.trace("fixture", Object{"detail": "MCP_PRIVATE_SENTINEL"})
	recorder := httptest.NewRecorder()
	w := &diagnosticWriter{ResponseWriter: recorder, diagnostic: d}
	w.Write([]byte("MCP_PRIVATE_"))
	w.Write([]byte("SENTINEL"))
	finishLog(d)
	if recorder.Body.String() != "MCP_PRIVATE_SENTINEL" {
		t.Fatal("redaction changed client response")
	}
	entries, _ := os.ReadDir(dir)
	for _, entry := range entries {
		data, _ := os.ReadFile(filepath.Join(dir, entry.Name()))
		if strings.Contains(string(data), "MCP_PRIVATE_") || strings.Contains(string(data), "SENTINEL") {
			t.Fatalf("secret leaked in %s", entry.Name())
		}
	}
	// The credential-safe capture keeps no response at all.
	for _, name := range []string{responseJSONFile, responseBodyFile} {
		if _, err := os.Stat(filepath.Join(dir, name)); !os.IsNotExist(err) {
			t.Fatalf("credential-safe capture kept %s", name)
		}
	}
	metadata, _ := os.ReadFile(filepath.Join(dir, "metadata.json"))
	var record Object
	if json.Unmarshal(metadata, &record) != nil || record["response_capture"] != responseCaptureOmitted {
		t.Fatalf("omitted response not recorded: %s", metadata)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "request.body"))
	if !strings.Contains(string(data), `"model":"fixture"`) || !strings.Contains(string(data), "[REDACTED]") {
		t.Fatal("safe structured fields were not retained")
	}
	data, _ = os.ReadFile(filepath.Join(dir, "upstream.body"))
	if !strings.Contains(string(data), `"number":9007199254740993`) {
		t.Fatal("structured redaction rounded diagnostic evidence")
	}
}

func TestDiagnosticSecretsMalformedRequestNotCaptured(t *testing.T) {
	d := detachedDiagnostic(t)
	raw := []byte(`{"authorization_\u0074oken":"MALFORMED_SECRET"`)
	d.prepareSecrets(parseRequestBody(raw))
	d.save("request.body", raw)
	d.flushLogs()
	data, err := os.ReadFile(filepath.Join(d.directory, "request.body"))
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(data), "MALFORMED_SECRET") {
		t.Fatal("malformed request leaked")
	}
}
