package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// saveNativeComparison is opt-in evidence from the isolated fake-provider
// tests, never from a live Worker. Authentication headers are not retained.
func saveNativeComparison(t *testing.T, version string, input []byte, wires []passthroughWire, response *httptest.ResponseRecorder) {
	t.Helper()
	dir := os.Getenv("CCG_NATIVE_EVIDENCE_DIR")
	if dir == "" {
		return
	}
	requests := make([]Object, 0, len(wires))
	for _, wire := range wires {
		headers := map[string][]string{}
		for name, values := range wire.header {
			if strings.EqualFold(name, "Authorization") || strings.EqualFold(name, "X-Api-Key") || strings.EqualFold(name, "Cookie") {
				continue
			}
			headers[name] = values
		}
		requests = append(requests, Object{"headers": headers, "body": json.RawMessage(wire.raw)})
	}
	evidence := Object{"test": t.Name(), "cli_version": version, "client_body": json.RawMessage(input), "upstream_requests": requests, "response_status": response.Code, "history_mode": response.Header().Get("X-CCGateway-History"), "response_body": response.Body.String()}
	raw, err := json.MarshalIndent(evidence, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	// Each HTTP call gets a separate file, including repeated calls of a subtest.
	dir = filepath.Join(dir, strings.ReplaceAll(t.Name(), "/", "_"))
	if err := os.MkdirAll(dir, 0700); err != nil {
		t.Fatal(err)
	}
	f, err := os.CreateTemp(dir, "comparison-*.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = f.Write(raw); err != nil {
		f.Close()
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}
}
