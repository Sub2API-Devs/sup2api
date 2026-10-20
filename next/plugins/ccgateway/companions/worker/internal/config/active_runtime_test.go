package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestMissingActiveRuntimePreservesPinnedEnvironment(t *testing.T) {
	c := &Config{CLIPath: "original", CLIVersion: "2.1.302", CLIPatch: "old", CLISHA256: "original-hash"}
	if err := c.loadActiveRuntime(t.TempDir()); err != nil {
		t.Fatal(err)
	}
	if c.CLIPath != "original" || c.CLIVersion != "2.1.302" {
		t.Fatal("legacy pin changed")
	}
}

func TestActiveRuntimeRejectsEscapesBeforeFileAccess(t *testing.T) {
	root := t.TempDir()
	if err := validateTrustedRuntimePath(root, filepath.Join(root, "..", "outside")); err == nil {
		t.Fatal("accepted path escape")
	}
	// An unverified pointer never silently falls back to environment values.
	if err := os.WriteFile(filepath.Join(root, "active-runtime.json"), []byte(`{"schema_version":1,"manifest":"../../outside","version":"2.1.304","request_mode":"build"}`), 0600); err != nil {
		t.Fatal(err)
	}
	if err := (&Config{}).loadActiveRuntime(root); err == nil {
		t.Fatal("accepted untrusted activation")
	}
}
