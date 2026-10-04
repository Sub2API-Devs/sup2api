package apikey

import (
	"testing"
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
		{"sk-prod-short", "", true},          // wrong prefix
		{"sk-test-abc", "", true},            // too short
		{"sk-test-abc def", "", true},        // whitespace
		{"sk-test-abc\tdef", "", true},       // tab
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
