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
		if at.CreationGroup != "claude-code" || at.Label["en"] != "Claude Code" || at.Label["zh"] != "Claude Code" {
			t.Fatalf("account type %s must share the Claude Code creation entry", at.ID)
		}
		if at.AuthMethodLabel["en"] == "" || at.AuthMethodLabel["zh"] == "" {
			t.Fatalf("account type %s needs localized authentication labels", at.ID)
		}
	}
	if m.AccountTypes[0].AuthMethodLabel["en"] == m.AccountTypes[1].AuthMethodLabel["en"] {
		t.Fatal("authentication choices must remain distinguishable")
	}
	if len(m.AccountTypes[0].SensitiveFields) != 0 || len(m.AccountTypes[0].SettingsFields) != 0 || len(m.HostPermissions) != 2 {
		t.Fatal("managed adapter must not request connection credentials")
	}
	if len(m.Capabilities) != 1 || m.Capabilities[0].ID != manifest.CapPlatformAdapter {
		t.Fatal("must use core forwarding")
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
		seen := map[string]bool{}
		for _, rule := range u.SSE {
			body := `{"message":{"usage":{"input_tokens":12,"cache_read_input_tokens":3,"cache_creation_input_tokens":2}},"usage":{"output_tokens":7}}`
			for name, want := range map[string]int64{"input_tokens": 12, "output_tokens": 7, "cache_read_tokens": 3, "cache_creation_tokens": 2} {
				if path := rule.Map[name]; path != "" {
					if gjson.Get(body, path).Int() != want {
						t.Fatalf("SSE usage %s", name)
					}
					seen[name] = true
				}
			}
		}
		if len(seen) != 4 {
			t.Fatal("incomplete SSE billing")
		}
		return
	}
	t.Fatal("core anthropic platform missing")
}
