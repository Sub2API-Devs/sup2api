package check

import (
	"encoding/json"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// declared is a runtime "none" package whose account type declares
// upstream (the shape of the rewritten openai plugin).
func declared(t *testing.T, upstream string) (*manifest.Manifest, map[string][]byte) {
	t.Helper()
	m := minimal()
	m.Runtime, m.Entry = manifest.RuntimeNone, manifest.Entry{}
	m.HostCompat = ">=" + UpstreamFirstCore + " <0.2.0"
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}, {ID: manifest.CapPlatformWebSocket}}
	m.HostPermissions = []manifest.HostPermission{{ID: "platform.register"}}
	at := manifest.AccountType{
		ID: "apikey", Label: manifest.LocalizedText{"en": "Key"},
		Form:           manifest.Form{Mode: "schema", Schema: "forms/a.json"},
		SettingsFields: []string{"base_url", "upstream"},
		Platforms:      []manifest.AccountPlatform{{Platform: "openai"}},
		Upstream:       &manifest.Upstream{},
	}
	if err := json.Unmarshal([]byte(upstream), at.Upstream); err != nil {
		t.Fatal(err)
	}
	m.AccountTypes = []manifest.AccountType{at}
	return m, map[string][]byte{"forms/a.json": []byte(`{}`)}
}

// hasCode reports whether err holds code on field (codes keeps only the
// last code of a field, and runtime "none" adds codes next to others).
func hasCode(err error, field, code string) bool {
	fields, _ := Fields(err)
	return slices.ContainsFunc(fields, func(f FieldError) bool { return f.Field == field && f.Code == code })
}

// An older core ignores accountTypes[].upstream, so hostCompat must keep it out.
func TestUpstreamCoreFloor(t *testing.T) {
	m, files := declared(t, `{"preset":"openai"}`)
	m.HostCompat = ">=0.1.0 <0.2.0"
	if err := Validate(m, files, ValidateOptions{Tooling: true}); !hasCode(err, "hostCompat", "below_feature_core") {
		t.Fatalf("hostCompat below %s: %v", UpstreamFirstCore, err)
	}
}

func TestUpstreamDeclaration(t *testing.T) {
	for _, tc := range []struct {
		name, upstream string
		field, code    string
	}{
		{"preset only", `{"preset":"openai","filterFields":[]}`, "", ""},
		{"account layer", `{"preset":"openai","accountConfig":true,"baseURL":{"required":true}}`, "", ""},
		{"unknown preset", `{"preset":"mistral"}`, "accountTypes[0].upstream.preset", "unknown"},
		{"route not served", `{"preset":"openai","routes":{"anthropic.messages":{"path":"/v1/messages"}}}`,
			"accountTypes[0].upstream.routes.anthropic.messages", "unknown_protocol"},
		{"route missing", `{"preset":"openai","routes":{"openai.embeddings":null}}`, "accountTypes[0].upstream.routes", "missing_route"},
		{"credential header", `{"preset":"openai","headers":{"x-api-key":{"set":"{api_key}"}}}`,
			"accountTypes[0].upstream.headers.x-api-key", "blocked"},
		{"auth header may be a credential header", `{"preset":"openai","auth":{"name":"api-key","value":"{api_key}"}}`, "", ""},
		{"api_key outside auth", `{"preset":"openai","headers":{"x-key":{"set":"{api_key}"}}}`,
			"accountTypes[0].upstream.headers.x-key", "invalid_template"},
		{"api_key in query", `{"preset":"openai","routes":{"openai.chat":{"path":"/v1/chat/completions?key={api_key}"}}}`, "", ""},
		{"client header in auth", `{"preset":"openai","auth":{"value":"{client_header.user-agent}"}}`,
			"accountTypes[0].upstream.auth.value", "invalid_template"},
		{"client header not received", `{"preset":"openai","headers":{"x-ua":{"set":"{client_header.x-foo}"}}}`,
			"accountTypes[0].upstream.headers.x-ua", "invalid_template"},
		{"client header received", `{"preset":"openai","headers":{"x-ua":{"set":"{client_header.user-agent}"}}}`, "", ""},
		{"undeclared credential field", `{"preset":"openai","headers":{"x-org":{"set":"{credentials.org}"}}}`,
			"accountTypes[0].upstream.headers.x-org", "invalid_template"},
		{"declared credential field", `{"preset":"openai","credentials":{"fields":["org"]},"headers":{"x-org":{"set":"{credentials.org}"}}}`, "", ""},
		{"two write modes", `{"preset":"openai","headers":{"x-a":{"set":"a","default":"b"}}}`, "accountTypes[0].upstream.headers.x-a", "invalid"},
		{"auth type", `{"preset":"openai","auth":{"type":"cookie"}}`, "accountTypes[0].upstream.auth.type", "invalid"},
		{"param override", `{"preset":"openai","paramOverride":{"operations":[{"mode":"set_header","path":"authorization","value":"x"}]}}`,
			"accountTypes[0].upstream.paramOverride", "blocked"},
		{"unknown field", `{"preset":"openai","timeout":5}`, "accountTypes[0].upstream", "invalid"},
		{"extend without process", `{"preset":"openai","extend":true}`, "accountTypes[0].upstream.extend", "unsupported"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			m, files := declared(t, tc.upstream)
			err := Validate(m, files, ValidateOptions{Tooling: true})
			if tc.code == "" {
				if err != nil {
					t.Fatalf("unexpected errors: %v", err)
				}
				return
			}
			if !hasCode(err, tc.field, tc.code) {
				t.Fatalf("errors = %v, want %s on %s", err, tc.code, tc.field)
			}
		})
	}
}

func TestUpstreamAccountConfigNeedsSettingsField(t *testing.T) {
	m, files := declared(t, `{"preset":"openai","accountConfig":true}`)
	m.AccountTypes[0].SettingsFields = []string{"base_url"}
	if err := Validate(m, files, ValidateOptions{Tooling: true}); !hasCode(err, "accountTypes[0].upstream.accountConfig", "invalid") {
		t.Fatalf("errors = %v", err)
	}
}

func TestRuntimeNone(t *testing.T) {
	m, files := declared(t, `{"preset":"openai"}`)
	m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapPlatformExecute})
	m.Routes = []manifest.Route{{Method: "GET", Path: "/x", Scope: "admin"}}
	m.AccountTypes = append(m.AccountTypes, manifest.AccountType{ID: "oauth", Label: manifest.LocalizedText{"en": "OAuth"},
		Form: manifest.Form{Mode: "schema", Schema: "forms/a.json"}, Platforms: []manifest.AccountPlatform{{Platform: "openai"}}})
	files["runtimes/linux-amd64/plugin"] = []byte("bin")
	err := Validate(m, files, ValidateOptions{Tooling: true})
	for field, code := range map[string]string{
		"capabilities[2]":          "needs_runtime",
		"routes":                   "needs_runtime",
		"accountTypes[1].upstream": "needs_runtime",
		"entry":                    "unsupported",
		// The type the plugin implements itself needs the credentials.
		"accountTypes": "missing_host_permission",
	} {
		if !hasCode(err, field, code) {
			t.Errorf("%s: want %q (all: %v)", field, code, err)
		}
	}
	m.Runtime = "wasm"
	if err := Validate(m, files, ValidateOptions{Tooling: true}); !hasCode(err, "runtime", "unsupported") {
		t.Fatalf("errors = %v", err)
	}
}
