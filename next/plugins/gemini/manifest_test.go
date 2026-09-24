package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/gemini/internal/gemini"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifest checks manifest.json against the SDK types (no unknown
// fields), the built-in gemini platform and the files it references.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "gemini" || m.Version != "0.1.2" || m.Publisher != "sub2api" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("key/version/publisher = %s %s %s", m.Key, m.Version, m.Publisher)
	}
	if m.Name["en"] == "" || m.Name["zh"] == "" || m.Description["en"] == "" || m.Description["zh"] == "" {
		t.Fatal("name and description need en and zh")
	}
	// The gemini platform is built into the core (ARCHITECTURE 6.6).
	if len(m.Platforms) != 0 || m.Database != nil {
		t.Fatalf("platforms = %+v database = %+v, want none", m.Platforms, m.Database)
	}
	if len(m.AccountTypes) != 1 || m.AccountTypes[0].ID != gemini.AccountTypeAPIKey {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	at := m.AccountTypes[0]
	for _, p := range []string{at.Form.Schema, at.Form.UISchema} {
		mustJSONFile(t, p)
	}
	if len(at.Platforms) != 1 || at.Platforms[0].Platform != gemini.PlatformID {
		t.Fatalf("platforms = %+v, want [gemini]", at.Platforms)
	}
	if ap := at.Platforms[0]; len(ap.RequestFields)+len(ap.PassHeaders)+len(ap.Usage) != 0 {
		t.Fatalf("the account type must not override the built-in platform defaults: %+v", ap)
	}
	if !slices.Contains(at.SensitiveFields, "api_key") {
		t.Fatal("api_key must be sensitive")
	}
	if b := builtin(t); b != nil {
		if got := b.Protocols(); !slices.Equal(got, gemini.Protocols) {
			t.Fatalf("built-in gemini protocols %v, implemented %v", got, gemini.Protocols)
		}
		if !slices.Equal(b.PassHeaders, gemini.ForwardHeaders()) {
			t.Fatalf("forwarded headers %v differ from the built-in passHeaders %v", gemini.ForwardHeaders(), b.PassHeaders)
		}
		// The stream endpoint is fixed to streaming and takes the model
		// from the path, as BuildUpstreamRequest assumes.
		for _, ep := range b.Endpoints {
			if ep.Request.ModelParam != "model" {
				t.Errorf("built-in endpoint %s: modelParam = %q", ep.ID, ep.Request.ModelParam)
			}
			if (ep.Protocol == gemini.ProtocolStreamGenerate) != ep.Request.Stream {
				t.Errorf("built-in endpoint %s: stream = %v", ep.ID, ep.Request.Stream)
			}
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
}

// TestManifestServes runs the plugin with its embedded manifest.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, gemini.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	if h.Info.GetPluginKey() != "gemini" || !slices.Equal(h.Info.GetCapabilities(), []string{manifest.CapPlatformAdapter}) {
		t.Fatalf("info = %v", h.Info)
	}
}

// builtin reads the core's built-in gemini platform when the plugin is
// checked out inside the next/ tree; nil otherwise.
func builtin(t *testing.T) *manifest.Platform {
	t.Helper()
	b, err := os.ReadFile(filepath.FromSlash("../../server/internal/platforms/gemini.json"))
	if os.IsNotExist(err) {
		t.Log("built-in platform definition not found; skipping cross-check")
		return nil
	}
	if err != nil {
		t.Fatal(err)
	}
	var p manifest.Platform
	if err := json.Unmarshal(b, &p); err != nil {
		t.Fatalf("built-in gemini platform: %v", err)
	}
	if p.ID != gemini.PlatformID {
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
