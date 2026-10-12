package engine

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNativeCheckpointProbeSkipsIdleButRetriesPartialWrites(t *testing.T) {
	path := filepath.Join(t.TempDir(), "native.jsonl")
	probe := nativeCheckpointProbe{}
	if probe.changed(path) {
		t.Fatal("missing file considered ready")
	}
	if err := os.WriteFile(path, []byte(`{"type":"assistant"`), 0600); err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) || probe.changed(path) {
		t.Fatal("idle transcript reread")
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.WriteString("}\n")
	f.Close()
	if err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) || probe.changed(path) {
		t.Fatal("completed partial write not retried")
	}
	stamp := time.Now().Add(time.Second)
	if err := os.Chtimes(path, stamp, stamp); err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) {
		t.Fatal("same-size write metadata change not retried")
	}
}
