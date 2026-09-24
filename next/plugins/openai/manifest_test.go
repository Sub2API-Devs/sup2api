package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/openai/internal/openai"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifest checks manifest.json against the SDK types (no unknown
// fields), the built-in openai platform and the files it references.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "openai" || m.Version != "0.1.1" || m.Publisher != "sub2api" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("key/version/publisher = %s %s %s", m.Key, m.Version, m.Publisher)
	}
	if m.Name["en"] == "" || m.Name["zh"] == "" || m.Description["en"] == "" || m.Description["zh"] == "" {
		t.Fatal("name and description need en and zh")
	}
	// The openai platform is built into the core (ARCHITECTURE 6.6).
	if len(m.Platforms) != 0 || m.Database != nil {
		t.Fatalf("platforms = %+v database = %+v, want none", m.Platforms, m.Database)
	}
	if len(m.AccountTypes) != 1 || m.AccountTypes[0].ID != openai.AccountTypeAPIKey {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	at := m.AccountTypes[0]
	for _, p := range []string{at.Form.Schema, at.Form.UISchema} {
		mustJSONFile(t, p)
	}
	if len(at.Platforms) != 1 || at.Platforms[0].Platform != openai.PlatformID {
		t.Fatalf("platforms = %+v, want [openai]", at.Platforms)
	}
	if ap := at.Platforms[0]; len(ap.RequestFields)+len(ap.PassHeaders)+len(ap.Usage) != 0 {
		t.Fatalf("the account type must not override the built-in platform defaults: %+v", ap)
	}
	if !slices.Contains(at.SensitiveFields, "api_key") {
		t.Fatal("api_key must be sensitive")
	}
	if b := builtin(t); b != nil {
		if got := b.Protocols(); !slices.Equal(got, openai.Protocols) {
			t.Fatalf("built-in openai protocols %v, implemented %v", got, openai.Protocols)
		}
		if !slices.Equal(b.PassHeaders, openai.ForwardHeaders()) {
			t.Fatalf("forwarded headers %v differ from the built-in passHeaders %v", openai.ForwardHeaders(), b.PassHeaders)
		}
	}

	if len(m.Capabilities) != 1 || m.Capabilities[0].ID != manifest.CapPlatformAdapter {
		t.Fatalf("capabilities = %+v", m.Capabilities)
	}
	perms := map[string]manifest.HostPermission{}
	for _, perm := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[perm.ID]; !ok {
			t.Errorf("unknown host permission %q", perm.ID)
		}
		if perm.Reason["en"] == "" || perm.Reason["zh"] == "" {
			t.Errorf("host permission %s needs an en and zh reason", perm.ID)
		}
		perms[perm.ID] = perm
	}
	if len(perms) != 2 {
		t.Errorf("host permissions = %v, want platform.register and accounts.credentials", perms)
	}
	if _, ok := perms["platform.register"]; !ok {
		t.Error("account types need host permission platform.register")
	}
	if c, ok := perms["accounts.credentials"]; !ok || c.Scope["types"] != "own" || len(c.Scope) != 1 {
		t.Errorf("accounts.credentials scope = %v, want {\"types\":\"own\"}", c.Scope)
	}
	seen := map[string]bool{}
	for _, pe := range m.Pricing {
		if seen[pe.Model] {
			t.Errorf("duplicate pricing %s", pe.Model)
		}
		seen[pe.Model] = true
		if !manifest.ValidModelID(pe.Model) {
			t.Errorf("pricing %s: not a complete model id (no wildcards)", pe.Model)
		}
		if pe.Mode != "per_token" || pe.Config["p"] == nil || pe.Config["c"] == nil {
			t.Errorf("pricing %s incomplete", pe.Model)
		}
	}
	for _, model := range []string{"gpt-5", "gpt-5-2025-08-07", "gpt-4.1", "gpt-4o", "gpt-4o-mini", "o3", "text-embedding-3-small"} {
		if !seen[model] {
			t.Errorf("no default price for %s", model)
		}
	}
}

// TestManifestServes runs the plugin with its embedded manifest.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, openai.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	if h.Info.GetPluginKey() != "openai" || !slices.Equal(h.Info.GetCapabilities(), []string{manifest.CapPlatformAdapter}) {
		t.Fatalf("info = %v", h.Info)
	}
}

// builtin reads the core's built-in openai platform when the plugin is
// checked out inside the next/ tree; nil otherwise.
func builtin(t *testing.T) *manifest.Platform {
	t.Helper()
	b, err := os.ReadFile(filepath.FromSlash("../../server/internal/platforms/openai.json"))
	if os.IsNotExist(err) {
		t.Log("built-in platform definition not found; skipping cross-check")
		return nil
	}
	if err != nil {
		t.Fatal(err)
	}
	var p manifest.Platform
	if err := json.Unmarshal(b, &p); err != nil {
		t.Fatalf("built-in openai platform: %v", err)
	}
	if p.ID != openai.PlatformID {
		t.Fatalf("built-in platform id = %q", p.ID)
	}
	return &p
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
