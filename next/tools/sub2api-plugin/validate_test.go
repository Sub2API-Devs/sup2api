package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// The endpoint checks must accept the core's built-in platform definitions
// (same format as manifest platforms), apart from the reserved ids.
func TestValidateAcceptsBuiltinPlatforms(t *testing.T) {
	files, _ := filepath.Glob(filepath.Join("..", "..", "server", "internal", "platforms", "*.json"))
	if len(files) == 0 {
		t.Skip("built-in platform definitions not found")
	}
	m := &manifest.Manifest{HostPermissions: []manifest.HostPermission{{ID: "gateway.endpoint"}, {ID: "platform.register"}}}
	for _, f := range files {
		b, err := os.ReadFile(f)
		if err != nil {
			t.Fatal(err)
		}
		var p manifest.Platform
		if err := json.Unmarshal(b, &p); err != nil {
			t.Fatalf("%s: %v", f, err)
		}
		m.Platforms = append(m.Platforms, p)
	}
	for _, msg := range validateManifest(m) {
		if !strings.Contains(msg, "built into the core") {
			t.Error(msg)
		}
	}
}
