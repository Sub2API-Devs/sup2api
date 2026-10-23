package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestTraceOverflowRetainsPartialArtifactsAndCompletion(t *testing.T) {
	d := &requestDiagnostic{fields: Object{}, directory: t.TempDir()}
	d.save("retained.body", []byte("before overflow"))
	directory := d.directory
	d.bytes = 64 << 20
	d.trace("overflow", Object{"x": "payload"})
	if !d.discarded || d.directory != directory || d.bytes != 64<<20 {
		t.Fatal("trace bypassed storage limit")
	}
	d.artifact("late.json", Object{"must": "not be written"})
	d.trace("later", Object{})
	d.finish()
	retained, err := os.ReadFile(filepath.Join(directory, "retained.body"))
	if err != nil || string(retained) != "before overflow" {
		t.Fatal("overflow destroyed earlier capture", err)
	}
	if _, err := os.Stat(filepath.Join(directory, "late.json")); !os.IsNotExist(err) {
		t.Fatal("capture continued after overflow")
	}
	metadata, err := os.ReadFile(filepath.Join(directory, "metadata.json"))
	var record Object
	if err != nil || json.Unmarshal(metadata, &record) != nil || record["log_status"] != "truncated" || record["event"] != "request_finished" {
		t.Fatalf("partial completion metadata missing: %s, %v", metadata, err)
	}
}
