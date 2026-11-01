// Package pyreftest loads the Python reference vectors in
// testdata/pyref (written by companions/controller/reference_vectors.py).
// Test-only helper.
package pyreftest

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// Dir is the absolute testdata/pyref directory.
func Dir() string {
	_, file, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(file), "..", "..", "testdata", "pyref")
}

// Load decodes testdata/pyref/<name> into v; a missing or empty file fails the test.
func Load(t testing.TB, name string, v any) {
	t.Helper()
	b, err := os.ReadFile(filepath.Join(Dir(), name))
	if err != nil {
		t.Fatalf("reference vectors %s: %v (generate them with reference_vectors.py)", name, err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		t.Fatalf("reference vectors %s: %v", name, err)
	}
}

// Case is the common shape: a name plus fields.
type Case = map[string]any

// Cases loads the "cases" list of a vector file; it fails when it is empty.
func Cases(t testing.TB, name string) []Case {
	t.Helper()
	var doc struct {
		Cases []Case `json:"cases"`
	}
	Load(t, name, &doc)
	if len(doc.Cases) == 0 {
		t.Fatalf("reference vectors %s: no cases", name)
	}
	return doc.Cases
}

// Str is c[key] as a string ("" when absent or not a string).
func Str(c Case, key string) string {
	s, _ := c[key].(string)
	return s
}
