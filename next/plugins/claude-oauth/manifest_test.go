package main

import (
	_ "embed"
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

//go:embed manifest.json
var testManifest []byte

func TestManifestValid(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(testManifest, &m); err != nil {
		t.Fatalf("invalid manifest: %v", err)
	}
	if m.APIVersion != 1 {
		t.Errorf("apiVersion = %d, want 1", m.APIVersion)
	}
	if m.Key != "claude_oauth" {
		t.Errorf("key = %q, want claude_oauth", m.Key)
	}
	if m.Runtime != "grpc" {
		t.Errorf("runtime = %q, want grpc", m.Runtime)
	}
}
