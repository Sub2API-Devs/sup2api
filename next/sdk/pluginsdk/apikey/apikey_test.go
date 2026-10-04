package apikey

import (
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestValidator(t *testing.T) {
	v := Validator{Prefixes: []string{"sk-test-", "sk-live-"}, MinLength: 15, Field: "api_key"}
	for _, tc := range []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"  sk-test-abcdef1234567890  ", "sk-test-abcdef1234567890", false},
		{"sk-live-xyz123456789012", "sk-live-xyz123456789012", false},
		{"", "", true},
		{"   ", "", true},
		{"sk-prod-short", "", true},           // wrong prefix
		{"sk-test-abc", "", true},             // too short
		{"sk-test-abc def", "", true},         // whitespace
		{"sk-test-abc\tdef", "", true},        // tab
		{"sk-test-abc\ndef1234567", "", true}, // newline
	} {
		got, err := v.Check(tc.in)
		if (err != nil) != tc.wantErr {
			t.Errorf("Check(%q): err=%v, wantErr=%v", tc.in, err, tc.wantErr)
		}
		if !tc.wantErr && got != tc.want {
			t.Errorf("Check(%q) = %q, want %q", tc.in, got, tc.want)
		}
		if err != nil && err.Field != "api_key" {
			t.Errorf("error field = %q, want api_key", err.Field)
		}
	}
}

func TestBuiltinValidators(t *testing.T) {
	for _, tc := range []struct {
		name string
		v    Validator
		good []string
		bad  []string
	}{
		{"Anthropic", Anthropic, []string{"sk-ant-api03-abcdefgh12345678", "sk-ant-sid01-xyzabcdefgh1234"}, []string{"sk-ant-", "sk-openai-123", "sk ant api03 x"}},
		{"OpenAI", OpenAI, []string{"sk-proj-abcdef123456789012", "sess-xyzabcdefgh123456"}, []string{"sk-", "apikey-123"}},
		{"Gemini", Gemini, []string{"AIzaSyABCDEF1234567890", "AIzaXyzABCDEFGH123456"}, []string{"AIza", "GoogleAPIKey"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			for _, s := range tc.good {
				if _, err := tc.v.Check(s); err != nil {
					t.Errorf("rejected valid key %q: %v", s, err)
				}
			}
			for _, s := range tc.bad {
				if _, err := tc.v.Check(s); err == nil {
					t.Errorf("accepted invalid key %q", s)
				}
			}
		})
	}
}

// Normalization stays in the object each field came from: base_url in
// settings remains a setting (the core's guardedSettings check and the
// console form read it there), and keys the validator does not know pass
// through. The stage 1 refactor once merged everything into the
// credentials and returned "{}" settings.
func TestValidateNormalizesInPlace(t *testing.T) {
	s := Spec{AccountType: "apikey", DefaultBaseURL: "https://api.example.com", StripSuffixes: []string{"/v1"}}
	r := s.Validate(&pluginv1.ValidateCredentialsRequest{AccountType: "apikey",
		CredentialsJson: `{"api_key":"  sk-example-123  ","note":"keep"}`,
		SettingsJson:    `{"base_url":"https://proxy.example.com/v1/","region":"eu"}`})
	if len(r.GetErrors()) != 0 {
		t.Fatal(r.GetErrors())
	}
	if r.GetNormalizedCredentialsJson() != `{"api_key":"sk-example-123","note":"keep"}` ||
		r.GetNormalizedSettingsJson() != `{"base_url":"https://proxy.example.com","region":"eu"}` {
		t.Fatalf("creds=%s settings=%s", r.GetNormalizedCredentialsJson(), r.GetNormalizedSettingsJson())
	}
	// Nothing in settings: "" keeps whatever the core has.
	r = s.Validate(&pluginv1.ValidateCredentialsRequest{AccountType: "apikey", CredentialsJson: `{"api_key":"sk-example-123"}`})
	if r.GetNormalizedSettingsJson() != "" || r.GetNormalizedCredentialsJson() != `{"api_key":"sk-example-123"}` {
		t.Fatalf("creds=%s settings=%q", r.GetNormalizedCredentialsJson(), r.GetNormalizedSettingsJson())
	}
}

func TestNormalizeBaseURL(t *testing.T) {
	strip := []string{"/v1beta", "/v1"}
	for in, want := range map[string]string{
		" https://proxy.example.com/v1beta/ ":   "https://proxy.example.com",
		"https://proxy.example.com/x/v1/v1beta": "https://proxy.example.com/x/v1",
		"https://proxy.example.com/v1":          "https://proxy.example.com",
		"https://proxy.example.com":             "https://proxy.example.com",
	} {
		if got, err := NormalizeBaseURL(in, strip); err != nil || got != want {
			t.Errorf("%q: %q %v, want %q", in, got, err, want)
		}
	}
	for _, in := range []string{"", "ftp://x.example", "https://u:p@x.example", "https://x.example/?", "https://x.example/?a=1", "https://x.example/#f", "/relative"} {
		if _, err := NormalizeBaseURL(in, strip); err == nil {
			t.Errorf("%q accepted", in)
		}
	}
}
