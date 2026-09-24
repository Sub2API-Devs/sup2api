package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// TestManifest checks manifest.json against the SDK types (no unknown
// fields) and that every package path it references exists.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "anthropic" || m.Version != "0.1.0" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("key/version = %s %s", m.Key, m.Version)
	}
	if m.Database == nil || m.Database.Schema != "plg_"+m.Key {
		t.Fatalf("database = %+v", m.Database)
	}
	for _, at := range m.Platform.AccountTypes {
		for _, p := range []string{at.Form.Schema, at.Form.UISchema} {
			mustJSONFile(t, p)
		}
	}
	for _, perm := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[perm.ID]; !ok {
			t.Errorf("unknown host permission %q", perm.ID)
		}
	}
	for _, r := range m.Routes {
		found := false
		for _, up := range m.UserPermissions {
			found = found || up.Key == r.Permission
		}
		if !found {
			t.Errorf("route %s %s uses undeclared permission %q", r.Method, r.Path, r.Permission)
		}
	}
	if _, err := os.Stat(filepath.FromSlash(strings.TrimSuffix(m.Database.Migrations, "/"))); err != nil {
		t.Fatalf("migrations dir: %v", err)
	}
	for _, pe := range m.Pricing {
		if pe.Mode == "per_token" && len(pe.Config) == 0 || pe.Mode == "expression" && pe.Expression == "" {
			t.Errorf("pricing %s incomplete", pe.Model)
		}
	}
	var patch map[string]any
	raw := mustJSONFile(t, "testdata/v0.2.0/manifest.patch.json")
	_ = json.Unmarshal(raw, &patch)
	if patch["version"] != "0.2.0" {
		t.Fatalf("0.2.0 patch version = %v", patch["version"])
	}
}

func mustJSONFile(t *testing.T, p string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.FromSlash(p))
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	if !json.Valid(b) {
		t.Fatalf("%s is not valid JSON", p)
	}
	return b
}
