//go:build linux

package sandbox

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Landlock grants the plugin's private run directory, never the shared
// temporary directory (go-plugin's sockets no longer live there).
func TestLandlockRulesGrantRunDirNotSharedTemp(t *testing.T) {
	o := &execOptions{Binary: "/opt/p/bin", WorkDir: "/data/p/work", DataDir: "/data/p/work", RunDir: "/data/.run/p-1"}
	shared := filepath.Clean(os.TempDir())
	var sawRun bool
	for _, r := range landlockRules(o) {
		if r.path == "" {
			continue
		}
		p := filepath.Clean(r.path)
		if p == shared || strings.HasPrefix(shared+"/", p+"/") {
			t.Fatalf("rule grants the shared temporary directory: %s", r.path)
		}
		if p == o.RunDir {
			sawRun = r.access&llWrite == llWrite && r.access&llRead == llRead
		}
	}
	if !sawRun {
		t.Fatal("run directory not granted read/write")
	}
}
