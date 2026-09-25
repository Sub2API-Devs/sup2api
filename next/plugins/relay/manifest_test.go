package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/relay/internal/relay"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// TestManifest checks manifest.json against the SDK types (no unknown
// fields), the files it references and the shape of an account-type-only
// plugin (ARCHITECTURE 6.6): no platform, no endpoints, no prices.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "relay" || m.Version != "0.1.2" || m.Publisher != "sub2api" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("identity = %s %s %s", m.Key, m.Version, m.Publisher)
	}
	if m.Name["en"] == "" || m.Name["zh"] == "" || m.Description["en"] == "" || m.Description["zh"] == "" {
		t.Fatal("name and description need en and zh")
	}
	if len(m.Platforms) != 0 || m.Database != nil {
		t.Fatal("relay declares only an account type: no platforms or database")
	}
	if len(m.Capabilities) != 1 || m.Capabilities[0].ID != manifest.CapPlatformAdapter {
		t.Fatalf("capabilities = %v", m.Capabilities)
	}

	if len(m.AccountTypes) != 1 {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	at := m.AccountTypes[0]
	if at.ID != relay.AccountTypeRelayKey || at.Label["en"] == "" || at.Label["zh"] == "" {
		t.Fatalf("account type = %+v", at)
	}
	if !slices.Equal(at.SensitiveFields, []string{"api_key"}) {
		t.Fatalf("sensitiveFields = %v", at.SensitiveFields)
	}
	var schema struct {
		Required   []string       `json:"required"`
		Properties map[string]any `json:"properties"`
	}
	if err := json.Unmarshal(mustJSONFile(t, at.Form.Schema), &schema); err != nil {
		t.Fatal(err)
	}
	mustJSONFile(t, at.Form.UISchema)
	if !slices.Contains(schema.Required, "base_url") || !slices.Contains(schema.Required, "api_key") {
		t.Fatalf("form schema: required %v, properties %v", schema.Required, schema.Properties)
	}
	// Model mapping is a core account field (CONTRACTS §18): neither a
	// settings field nor a form property.
	if slices.Contains(at.SettingsFields, "model_mapping") {
		t.Fatalf("settingsFields = %v: model_mapping must not be a settings field", at.SettingsFields)
	}
	if _, bad := schema.Properties["model_mapping"]; bad {
		t.Fatal("form schema still declares model_mapping")
	}
	if len(at.Platforms) != 1 {
		t.Fatalf("platforms = %+v, want [anthropic]", at.Platforms)
	}
	ap := at.Platforms[0]
	if ap.Platform != relay.PlatformID {
		t.Fatalf("platform = %q, want %q", ap.Platform, relay.PlatformID)
	}
	// relay_key overrides the platform defaults (demo of the override).
	if !slices.Equal(ap.PassHeaders, relay.PassHeaders) {
		t.Errorf("passHeaders = %v, want %v", ap.PassHeaders, relay.PassHeaders)
	}
	if !slices.Equal(ap.RequestFields, []string{"model"}) {
		t.Errorf("requestFields = %v, want [model]", ap.RequestFields)
	}
	if b, err := os.ReadFile(filepath.FromSlash("../../server/internal/platforms/anthropic.json")); err == nil {
		var p manifest.Platform
		if err := json.Unmarshal(b, &p); err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(p.Protocols(), relay.Protocols) {
			t.Fatalf("built-in anthropic protocols %v, implemented %v", p.Protocols(), relay.Protocols)
		}
	}

	perms := map[string]manifest.HostPermission{}
	for _, p := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[p.ID]; !ok {
			t.Errorf("unknown host permission %q", p.ID)
		}
		if p.Reason["en"] == "" || p.Reason["zh"] == "" {
			t.Errorf("host permission %s needs an en and zh reason", p.ID)
		}
		perms[p.ID] = p
	}
	if len(perms) != 2 {
		t.Fatalf("host permissions = %v", m.HostPermissions)
	}
	if _, ok := perms["platform.register"]; !ok {
		t.Fatal("platform.register missing")
	}
	if c, ok := perms["accounts.credentials"]; !ok || c.Scope["types"] != "own" || len(c.Scope) != 1 {
		t.Fatalf("accounts.credentials scope = %v", c.Scope)
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
