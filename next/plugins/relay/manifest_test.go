package main

import (
	"bytes"
	"encoding/json"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/relay/internal/relay"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
)

// TestManifestPassesCoreChecks runs manifest.json through the very checks the
// server runs before it installs a plugin: sdk/manifest/check holds the one
// implementation of those rules, and server/internal/plugin/pkg only wraps it
// (CONTRACTS §13). Tooling mode drops the three checks that need an
// installing host or a finished build - hostCompat against a host version,
// the runtime binaries and the native UI entry - and nothing else, so a
// manifest that passes here installs.
func TestManifestPassesCoreChecks(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	fields, _ := check.Fields(check.Validate(&m, packageFiles(t), check.ValidateOptions{Tooling: true}))
	for _, f := range fields {
		t.Errorf("%s: %s (%s)", f.Field, f.Message, f.Code)
	}
}

// packageFiles is what `sub2api-plugin pack` would put in the package, minus
// the built artifacts: every file of the plugin directory, keyed by its slash
// path, so the checks that resolve manifest paths (form schemas, migrations,
// icon) see the real tree.
func packageFiles(t *testing.T) map[string][]byte {
	t.Helper()
	files := map[string][]byte{}
	err := filepath.WalkDir(".", func(p string, d fs.DirEntry, err error) error {
		switch {
		case err != nil:
			return err
		case p == ".":
			return nil
		case strings.HasPrefix(d.Name(), "."):
			if d.IsDir() {
				return filepath.SkipDir
			}
			return nil
		case d.IsDir() || !d.Type().IsRegular() || strings.HasSuffix(p, ".go"):
			return nil
		}
		b, err := os.ReadFile(p)
		if err != nil {
			return err
		}
		files[filepath.ToSlash(p)] = b
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return files
}

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
	if m.Key != "relay" || m.Version != "0.2.0" || m.Publisher != "sub2api" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("identity = %s %s %s", m.Key, m.Version, m.Publisher)
	}
	if m.Name["en"] == "" || m.Name["zh"] == "" || m.Description["en"] == "" || m.Description["zh"] == "" {
		t.Fatal("name and description need en and zh")
	}
	if len(m.Platforms) != 0 || m.Database != nil {
		t.Fatal("relay declares only an account type: no platforms or database")
	}
	if len(m.Capabilities) != 2 || m.Capabilities[0].ID != manifest.CapPlatformAdapter || m.Capabilities[1].ID != manifest.CapPlatformExecute {
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
	// The account type serves the core's built-in anthropic platform: it must
	// implement exactly its protocols.
	for _, p := range platforms.Builtin() {
		if p.ID != relay.PlatformID {
			continue
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
