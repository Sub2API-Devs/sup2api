package apikey

import (
	"encoding/json"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

var spec = Spec{AccountType: "apikey", DefaultBaseURL: "https://api.example.com", StripSuffixes: []string{"/v1beta", "/v1"}}

func TestValidate(t *testing.T) {
	cases := []struct {
		name, typ, creds, settings string
		wantFields                 []string
		wantCreds, wantSets        string
	}{
		{name: "ok minimal", typ: "apikey", creds: `{"api_key":"  sk-abcdefgh  "}`, wantCreds: `{"api_key":"sk-abcdefgh"}`},
		{name: "ok with settings", typ: "apikey", creds: `{"api_key":"sk-abcdefgh"}`,
			settings:  `{"base_url":"https://relay.example.com/v1beta/"}`,
			wantCreds: `{"api_key":"sk-abcdefgh"}`,
			wantSets:  `{"base_url":"https://relay.example.com"}`},
		{name: "all in credentials", typ: "apikey",
			creds:     `{"api_key":"sk-x1234567","base_url":""}`,
			wantCreds: `{"api_key":"sk-x1234567","base_url":"https://api.example.com"}`},
		// Legacy accounts may still carry model_mapping (now a core account
		// field): it is neither validated nor touched.
		{name: "legacy model_mapping ignored", typ: "apikey", creds: `{"api_key":"sk-12345678"}`,
			settings:  `{"model_mapping":{"a":1}}`,
			wantCreds: `{"api_key":"sk-12345678"}`,
			wantSets:  `{"model_mapping":{"a":1}}`},
		{name: "missing key", typ: "apikey", creds: `{}`, wantFields: []string{"api_key"}},
		{name: "key with space", typ: "apikey", creds: `{"api_key":"sk ab 123456"}`, wantFields: []string{"api_key"}},
		{name: "key not string", typ: "apikey", creds: `{"api_key":12345678}`, wantFields: []string{"api_key"}},
		{name: "bad url", typ: "apikey", creds: `{"api_key":"sk-12345678"}`, settings: `{"base_url":"ftp://x"}`, wantFields: []string{"base_url"}},
		{name: "url with query", typ: "apikey", creds: `{"api_key":"sk-12345678"}`, settings: `{"base_url":"https://x.com?a=1"}`, wantFields: []string{"base_url"}},
		{name: "wrong type", typ: "oauth", creds: `{"api_key":"sk-12345678"}`, wantFields: []string{"account_type"}},
		{name: "invalid json", typ: "apikey", creds: `[1]`, wantFields: []string{""}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := spec.Validate(&pluginv1.ValidateCredentialsRequest{AccountType: tc.typ, CredentialsJson: tc.creds, SettingsJson: tc.settings})
			var fields []string
			for _, e := range r.GetErrors() {
				fields = append(fields, e.GetField())
				if !strings.Contains(e.GetMessage(), " / ") {
					t.Errorf("message should be bilingual: %q", e.GetMessage())
				}
			}
			if strings.Join(fields, ",") != strings.Join(tc.wantFields, ",") {
				t.Fatalf("errors = %v, want %v", r.GetErrors(), tc.wantFields)
			}
			if len(tc.wantFields) > 0 {
				return
			}
			assertJSON(t, r.GetNormalizedCredentialsJson(), tc.wantCreds)
			assertJSON(t, r.GetNormalizedSettingsJson(), tc.wantSets)
		})
	}
}

func assertJSON(t *testing.T, got, want string) {
	t.Helper()
	if want == "" {
		if got != "" {
			t.Fatalf("got %s, want empty", got)
		}
		return
	}
	var g, w any
	if err := json.Unmarshal([]byte(got), &g); err != nil {
		t.Fatalf("bad json %q: %v", got, err)
	}
	_ = json.Unmarshal([]byte(want), &w)
	gb, _ := json.Marshal(g)
	wb, _ := json.Marshal(w)
	if string(gb) != string(wb) {
		t.Fatalf("got %s, want %s", gb, wb)
	}
}

func TestFromAccount(t *testing.T) {
	// A legacy model_mapping key in the settings is ignored, not an error.
	cfg, err := spec.FromAccount(&pluginv1.Account{Id: 1, Type: "apikey", CredentialsJson: `{"api_key":"k-1234567"}`,
		SettingsJson: `{"base_url":"http://mock:8080/v1/","model_mapping":{"a":"b"}}`})
	if err != nil || cfg.APIKey != "k-1234567" || cfg.BaseURL != "http://mock:8080" {
		t.Fatalf("cfg = %+v %v", cfg, err)
	}
	cfg, err = spec.FromAccount(&pluginv1.Account{Id: 1, CredentialsJson: `{"api_key":"k-1234567"}`})
	if err != nil || cfg.BaseURL != "https://api.example.com" {
		t.Fatalf("default base url: %+v %v", cfg, err)
	}
	for _, acc := range []*pluginv1.Account{
		{Id: 2, Type: "other", CredentialsJson: `{"api_key":"k-1234567"}`},
		{Id: 3, Type: "apikey", CredentialsJson: `{}`},
		{Id: 4, Type: "apikey", CredentialsJson: `{"api_key":"k-1234567"}`, SettingsJson: `{"base_url":"nope"}`},
	} {
		if _, err := spec.FromAccount(acc); status.Code(err) != codes.FailedPrecondition {
			t.Errorf("account %d: err = %v", acc.GetId(), err)
		}
	}
}

func TestForwardHeaders(t *testing.T) {
	dst := map[string]string{}
	ForwardHeaders(dst, map[string]string{"user-agent": "ua", "cookie": "c", "x-empty": ""}, []string{"user-agent", "x-empty", "missing"})
	if len(dst) != 1 || dst["user-agent"] != "ua" {
		t.Fatalf("dst = %v", dst)
	}
}
