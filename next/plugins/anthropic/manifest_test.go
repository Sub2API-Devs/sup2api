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

	// The anthropic platform and its endpoints are built into the core
	// (ARCHITECTURE 6.6): the plugin declares no platform of its own.
	if len(m.Platforms) != 0 {
		t.Fatalf("platforms = %+v, want none (anthropic is built in)", m.Platforms)
	}
	builtin := builtinAnthropic(t)

	// Top-level account types with the platforms they serve.
	if len(m.AccountTypes) != 1 || m.AccountTypes[0].ID != anthropic.AccountTypeAPIKey {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	for _, at := range m.AccountTypes {
		for _, p := range []string{at.Form.Schema, at.Form.UISchema} {
			mustJSONFile(t, p)
		}
		if len(at.Platforms) != 1 || at.Platforms[0].Platform != anthropic.PlatformID {
			t.Fatalf("account type %s platforms = %+v, want [anthropic]", at.ID, at.Platforms)
		}
		// No overrides: the built-in platform defaults apply.
		if ap := at.Platforms[0]; len(ap.RequestFields)+len(ap.PassHeaders)+len(ap.Usage) != 0 {
			t.Fatalf("account type %s overrides the platform defaults: %+v", at.ID, ap)
		}
		if !slices.Contains(at.SensitiveFields, "api_key") {
			t.Fatalf("account type %s: api_key must be sensitive", at.ID)
		}
	}
	if builtin != nil {
		if got := builtin.Protocols(); !slices.Equal(got, anthropic.Protocols) {
			t.Fatalf("built-in anthropic protocols %v, implemented %v", got, anthropic.Protocols)
		}
		for _, h := range anthropic.ForwardHeaders() {
			if !slices.Contains(builtin.PassHeaders, h) {
				t.Errorf("forwarded header %q is not in the built-in platform passHeaders", h)
			}
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
		if perm.Reason["en"] == "" || perm.Reason["zh"] == "" {
			t.Errorf("host permission %s needs an en and zh reason", perm.ID)
		}
		perms[perm.ID] = perm
	}
	if _, ok := perms["platform.register"]; !ok {
		t.Error("account types need host permission platform.register")
	}
	if _, ok := perms["gateway.endpoint"]; ok {
		t.Error("gateway.endpoint is only for plugins that declare platforms")
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
	// The overlay must not bring back the pre-6.6 layouts.
	for _, k := range []string{"platform", "gateway", "platforms"} {
		if _, bad := patch[k]; bad {
			t.Fatalf("0.2.0 patch sets %q; anthropic is a built-in platform", k)
		}
	}
	for _, at := range asSlice(patch["accountTypes"]) {
		if e, ok := at.(map[string]any); ok && e["protocols"] != nil {
			t.Fatal("0.2.0 patch sets accountTypes[].protocols; account types declare platforms")
		}
	}
	for _, pe := range asSlice(patch["pricing"]) {
		if e, ok := pe.(map[string]any); ok && e["platform"] != nil {
			t.Fatal("0.2.0 patch sets pricing[].platform; prices are global per model")
		}
	}
}

// builtinAnthropic reads the core's built-in anthropic platform definition
// when the plugin is checked out inside the next/ tree; nil otherwise.
func builtinAnthropic(t *testing.T) *manifest.Platform {
	t.Helper()
	b, err := os.ReadFile(filepath.FromSlash("../../server/internal/platforms/anthropic.json"))
	if os.IsNotExist(err) {
		t.Log("built-in platform definition not found; skipping cross-check")
		return nil
	}
	if err != nil {
		t.Fatal(err)
	}
	var p manifest.Platform
	if err := json.Unmarshal(b, &p); err != nil {
		t.Fatalf("built-in anthropic platform: %v", err)
	}
	if p.ID != anthropic.PlatformID {
		t.Fatalf("built-in platform id = %q", p.ID)
	}
	return &p
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
