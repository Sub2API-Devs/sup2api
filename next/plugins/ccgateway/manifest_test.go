package main

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/tidwall/gjson"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

func TestQuotaReleaseHostCompatibility(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	for version, want := range map[string]bool{"0.1.115": false, "0.1.123": false, "0.1.124": true, "0.1.124-dev": true, "0.2.0": false} {
		got, err := check.HostCompatible(m.HostCompat, version)
		if err != nil || got != want {
			t.Fatalf("host %s: compatible=%v want=%v err=%v", version, got, want, err)
		}
	}
}

func TestManifestAndUsageContract(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	files := map[string][]byte{}
	icon, err := os.ReadFile(m.Icon)
	if err != nil {
		t.Fatal(err)
	}
	files[m.Icon] = icon
	if err := filepath.WalkDir("forms", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			b, e := os.ReadFile(path)
			if e != nil {
				return e
			}
			files[filepath.ToSlash(path)] = b
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	fields, _ := check.Fields(check.Validate(&m, files, check.ValidateOptions{Tooling: true}))
	for _, f := range fields {
		t.Errorf("%s: %s (%s)", f.Field, f.Message, f.Code)
	}
	if m.Key != "ccgateway" || len(m.AccountTypes) != 2 || m.AccountTypes[1].ID != "apikey" || m.AccountTypes[0].ID != "managed" {
		t.Fatal("invalid managed identity")
	}
	for _, at := range m.AccountTypes {
		if len(at.Platforms) != 1 || at.Platforms[0].Platform != "anthropic" || len(at.Platforms[0].Endpoints) != 1 || !at.Platforms[0].SupportsEndpoint("messages") || at.Platforms[0].SupportsEndpoint("count_tokens") || at.Platforms[0].SupportsEndpoint("chat_completions") {
			t.Fatalf("account type %s must explicitly declare only Anthropic Messages", at.ID)
		}
		if at.CreationGroup != "claude-code" || at.Label["en"] != "Claude Code" || at.Label["zh"] != "Claude Code" {
			t.Fatalf("account type %s must share the Claude Code creation entry", at.ID)
		}
		if at.AuthMethodLabel["en"] == "" || at.AuthMethodLabel["zh"] == "" {
			t.Fatalf("account type %s needs localized authentication labels", at.ID)
		}
	}
	managed := m.AccountTypes[0]
	if !managed.ModelAvailability || managed.Quota == nil || !managed.Quota.Query || !managed.Quota.AutoRefresh || len(managed.Quota.Windows) != 4 {
		t.Fatal("managed accounts require quota refresh and model availability")
	}
	for _, window := range managed.Quota.Windows {
		if window.Label["en"] == "" || window.Label["zh"] == "" || window.ShortLabel["en"] == "" || window.ShortLabel["zh"] == "" {
			t.Fatalf("quota window %s requires localized labels", window.Key)
		}
	}
	if m.AccountTypes[1].Quota != nil || m.AccountTypes[1].ModelAvailability {
		t.Fatal("API key accounts must not depend on subscription snapshots")
	}
	if m.AccountTypes[0].AuthMethodLabel["en"] == m.AccountTypes[1].AuthMethodLabel["en"] {
		t.Fatal("authentication choices must remain distinguishable")
	}
	if len(m.AccountTypes[0].SensitiveFields) != 0 || len(m.AccountTypes[0].SettingsFields) != 0 || len(m.HostPermissions) != 2 {
		t.Fatal("managed adapter must not request connection credentials")
	}
	if len(m.Capabilities) != 2 || m.Capabilities[0].ID != manifest.CapPlatformAdapter || m.Capabilities[1].ID != manifest.CapAccountLifecycle {
		t.Fatal("must use core forwarding and account lifecycle callbacks")
	}
	if m.AccountTypes[0].Lifecycle == nil || !m.AccountTypes[0].Lifecycle.Preparation || !m.AccountTypes[0].Lifecycle.Required || len(m.AccountTypes[0].ExtensionsSchema) == 0 {
		t.Fatal("managed accounts require preparation and declared extensions")
	}
	// Actual sidecar response shapes must match the inherited core billing rules.
	for _, p := range platforms.Builtin() {
		if p.ID != "anthropic" {
			continue
		}
		u := p.Usage
		jsonBody := `{"model":"claude-test","usage":{"input_tokens":12,"output_tokens":7,"cache_read_input_tokens":3,"cache_creation_input_tokens":2}}`
		for name, want := range map[string]int64{"input_tokens": 12, "output_tokens": 7, "cache_read_tokens": 3, "cache_creation_tokens": 2} {
			if gjson.Get(jsonBody, u.JSON.Map[name]).Int() != want {
				t.Fatalf("JSON usage %s does not match core rule", name)
			}
		}
		actual := map[string]int64{}
		for _, event := range []struct{ name, body string }{
			{"message_start", `{"message":{"usage":{"input_tokens":12,"cache_read_input_tokens":3,"cache_creation_input_tokens":2}}}`},
			{"message_delta", `{"usage":{"input_tokens":20,"output_tokens":7,"cache_read_input_tokens":6,"cache_creation_input_tokens":4}}`},
			{"message_delta", `{"usage":{"output_tokens":8}}`},
		} {
			for _, rule := range u.SSE {
				if rule.Event != "" && rule.Event != event.name {
					continue
				}
				for name, path := range rule.Map {
					if value := gjson.Get(event.body, path); value.Exists() {
						actual[name] = value.Int()
					}
				}
			}
		}
		for name, want := range map[string]int64{"input_tokens": 20, "output_tokens": 8, "cache_read_tokens": 6, "cache_creation_tokens": 4} {
			if actual[name] != want {
				t.Fatalf("SSE cumulative %s=%d, want %d", name, actual[name], want)
			}
		}
		return
	}
	t.Fatal("core anthropic platform missing")
}
