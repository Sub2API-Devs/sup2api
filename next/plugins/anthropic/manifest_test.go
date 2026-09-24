package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/anthropic/internal/anthropic"
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

	// Platform: endpoint defaults for its protocols (ARCHITECTURE 6.6).
	if m.Platform == nil || m.Platform.ID != "anthropic" || m.Gateway == nil {
		t.Fatalf("platform = %+v", m.Platform)
	}
	var endpointProtocols []string
	for _, ep := range m.Gateway.Endpoints {
		endpointProtocols = append(endpointProtocols, ep.Protocol)
	}
	if !slices.Equal(m.Platform.Protocols, endpointProtocols) || !slices.Equal(m.Platform.Protocols, anthropic.Protocols) {
		t.Fatalf("platform protocols %v, endpoint protocols %v, implemented %v", m.Platform.Protocols, endpointProtocols, anthropic.Protocols)
	}

	// Top-level account types with their native protocols.
	if len(m.AccountTypes) != 1 || m.AccountTypes[0].ID != anthropic.AccountTypeAPIKey {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	for _, at := range m.AccountTypes {
		for _, p := range []string{at.Form.Schema, at.Form.UISchema} {
			mustJSONFile(t, p)
		}
		var protos []string
		for _, ap := range at.Protocols {
			protos = append(protos, ap.Protocol)
		}
		if !slices.Equal(protos, anthropic.Protocols) {
			t.Fatalf("account type %s protocols = %v, want %v", at.ID, protos, anthropic.Protocols)
		}
		if !slices.Contains(at.SensitiveFields, "api_key") {
			t.Fatalf("account type %s: api_key must be sensitive", at.ID)
		}
	}

	caps := map[string]bool{}
	for _, c := range m.Capabilities {
		caps[c.ID] = true
	}
	if !caps[manifest.CapPlatformAdapter] {
		t.Fatal("account types need capability platform.adapter.v1")
	}
	perms := map[string]manifest.HostPermission{}
	for _, perm := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[perm.ID]; !ok {
			t.Errorf("unknown host permission %q", perm.ID)
		}
		perms[perm.ID] = perm
	}
	if _, ok := perms["platform.register"]; !ok {
		t.Error("account types need host permission platform.register")
	}
	if c, ok := perms["accounts.credentials"]; !ok || c.Scope["types"] != "own" || len(c.Scope) != 1 {
		t.Errorf("accounts.credentials scope = %v, want {\"types\":\"own\"}", c.Scope)
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
	// The overlay must not bring back the pre-6.6 layout.
	if p, ok := patch["platform"].(map[string]any); ok {
		if _, bad := p["accountTypes"]; bad {
			t.Fatal("0.2.0 patch sets platform.accountTypes; account types are top-level")
		}
	}
	for _, pe := range asSlice(patch["pricing"]) {
		if e, ok := pe.(map[string]any); ok && e["platform"] != nil {
			t.Fatal("0.2.0 patch sets pricing[].platform; prices are global per model")
		}
	}
}

func asSlice(v any) []any {
	s, _ := v.([]any)
	return s
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
