package custom

import (
	"bytes"
	"encoding/json"
	"os"
	"path"
	"slices"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	presets "github.com/Sub2API-Devs/sup2api/next/sdk/platforms/upstream"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
)

// types maps each custom upstream account type to its preset, which is
// also the built-in platform it serves (docs/UPSTREAM-DECLARATIVE.md §5).
var types = map[string]string{
	"custom_openai":    "openai",
	"custom_anthropic": "anthropic",
	"custom_gemini":    "gemini",
}

// TestManifest runs manifest.json through the checks the core runs before
// it installs a package (sdk/manifest/check in tooling mode, which also
// resolves every upstream declaration with the core's engine) and resolves
// each account type to pin the custom upstream contract: one creation
// group, every endpoint of the preset's platform, a required base URL, any
// key, the preset's default body filter and an account layer.
func TestManifest(t *testing.T) {
	m := load(t)
	if m.Key != "custom" || m.Version != "0.1.0" || m.Publisher != "sub2api" || m.Runtime != manifest.RuntimeNone {
		t.Fatalf("identity = %s %s %s %s", m.Key, m.Version, m.Publisher, m.Runtime)
	}
	if len(m.Platforms) != 0 || len(m.AccountTypes) != len(types) {
		t.Fatalf("platforms = %+v accountTypes = %+v, want the %d account types only", m.Platforms, m.AccountTypes, len(types))
	}
	for _, at := range m.AccountTypes {
		t.Run(at.ID, func(t *testing.T) {
			preset := types[at.ID]
			if preset == "" || len(at.Platforms) != 1 || at.Platforms[0].Platform != preset || at.Platforms[0].Endpoints != nil {
				t.Fatalf("platforms = %+v, want every endpoint of %q", at.Platforms, preset)
			}
			if at.CreationGroup != "custom" || at.Label["zh"] == "" || at.AuthMethodLabel["en"] == "" || at.AuthMethodLabel["zh"] == "" {
				t.Fatalf("creationGroup %q label %v authMethodLabel %v", at.CreationGroup, at.Label, at.AuthMethodLabel)
			}
			if !slices.Equal(at.SensitiveFields, []string{"api_key"}) || !slices.Equal(at.SettingsFields, []string{"base_url", "proxy_id", upstream.SettingsField}) {
				t.Fatalf("sensitiveFields %v settingsFields %v", at.SensitiveFields, at.SettingsFields)
			}
			p, err := upstream.Resolve(&at, nil, nil)
			if err != nil {
				t.Fatal(err)
			}
			up, def := p.Upstream(), mustPreset(t, preset)
			if up.Preset != preset || !up.AccountConfig || up.BaseURL.Default != "" || !up.BaseURL.Required || !slices.Equal(up.FilterFields, def.FilterFields) {
				t.Fatalf("resolved upstream = %+v", up)
			}
			// Any key of 8-512 printable characters: no preset prefix rule.
			resp := p.Validate(&pluginv1.ValidateCredentialsRequest{
				AccountType:     at.ID,
				CredentialsJson: `{"api_key":"key-of-any-upstream"}`,
				SettingsJson:    `{"base_url":"https://upstream.example.com/v1"}`,
			})
			if len(resp.GetErrors()) != 0 {
				t.Fatalf("validate = %v", resp.GetErrors())
			}
			layer := json.RawMessage(`{"auth":{"type":"header","name":"api-key","value":"{api_key}"},"headers":{"x-tenant":{"set":"t1"}}}`)
			if _, err := upstream.Resolve(&at, nil, layer); err != nil {
				t.Fatalf("account layer: %v", err)
			}
		})
	}
}

// TestForm: the shared credential form edits the account layer with the
// console's upstream editor.
func TestForm(t *testing.T) {
	var schema struct {
		Required   []string                   `json:"required"`
		Properties map[string]json.RawMessage `json:"properties"`
	}
	var ui struct {
		Upstream struct {
			Widget string `json:"ui:widget"`
		} `json:"upstream"`
	}
	mustJSON(t, "forms/custom.schema.json", &schema)
	mustJSON(t, "forms/custom.ui.json", &ui)
	if !slices.Equal(schema.Required, []string{"base_url", "api_key"}) || len(schema.Properties) != 3 {
		t.Fatalf("schema required %v properties %v", schema.Required, schema.Properties)
	}
	if string(schema.Properties[upstream.SettingsField]) == "" || ui.Upstream.Widget != "upstream-editor" {
		t.Fatalf("upstream property %s widget %q", schema.Properties[upstream.SettingsField], ui.Upstream.Widget)
	}
}

func mustPreset(t *testing.T, name string) manifest.Upstream {
	t.Helper()
	up, ok := presets.Preset(name)
	if !ok {
		t.Fatalf("no preset %q", name)
	}
	return up
}

func mustJSON(t *testing.T, p string, v any) {
	t.Helper()
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(b, v); err != nil {
		t.Fatalf("%s: %v", p, err)
	}
}

// load decodes manifest.json strictly and checks it with the files a
// package carries.
func load(t *testing.T) manifest.Manifest {
	t.Helper()
	raw, err := os.ReadFile("manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var m manifest.Manifest
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	files := map[string][]byte{"manifest.json": raw}
	for _, dir := range []string{"forms", "assets"} {
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			p := path.Join(dir, e.Name())
			if files[p], err = os.ReadFile(p); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := check.Validate(&m, files, check.ValidateOptions{Tooling: true}); err != nil {
		t.Fatal(err)
	}
	return m
}
