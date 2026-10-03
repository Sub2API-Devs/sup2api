package volcengine

import (
	"context"
	"encoding/json"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

func TestAssetEndpointSelection(t *testing.T) {
	credentials := `{"api_key":"test-api-key","access_key":"` + testAK + `","secret_key":"` + testSK + `"}`
	for _, tc := range []struct{ name, kind, settings, want string }{
		{"official default", AccountTypeAPIKey, `{}`, DefaultAssetBaseURL},
		{"relay disabled without endpoint", AccountTypeRelay, `{"base_url":"https://relay.example"}`, ""},
		{"relay relative", AccountTypeRelay, `{"base_url":"https://relay.example","asset_endpoint":"/api/support/v1/asset"}`, "https://relay.example/api/support/v1/asset"},
		{"relay explicit root", AccountTypeRelay, `{"base_url":"https://relay.example","asset_endpoint":"/"}`, "https://relay.example"},
		{"relay absolute override", AccountTypeRelay, `{"base_url":"https://relay.example","asset_endpoint":"https://assets.example/custom","asset_base_url":"https://old.example"}`, "https://assets.example/custom"},
		{"legacy explicit preserved", AccountTypeRelay, `{"base_url":"https://relay.example","asset_base_url":"https://old.example/api/asset"}`, "https://old.example/api/asset"},
		{"official cannot bypass guard with relay field", AccountTypeAPIKey, `{"asset_endpoint":"https://untrusted.example"}`, DefaultAssetBaseURL},
	} {
		t.Run(tc.name, func(t *testing.T) {
			cfg, err := AssetConfigOf(&pluginsdk.AccountCredentials{AccountSummary: pluginsdk.AccountSummary{ID: 1, Type: tc.kind, SettingsJSON: tc.settings}, CredentialsJSON: credentials})
			if err != nil {
				t.Fatal(err)
			}
			if tc.want == "" {
				if cfg != nil {
					t.Fatal("unconfigured relay enabled asset library")
				}
				return
			}
			if cfg == nil || cfg.BaseURL != tc.want {
				t.Fatalf("endpoint: %+v want %s", cfg, tc.want)
			}
		})
	}
	if !AssetEnabled(`{"asset_endpoint":"/api/support/v1/asset"}`) {
		t.Fatal("new endpoint omitted from settings indicator")
	}
}

func TestAssetEndpointValidation(t *testing.T) {
	for _, tc := range []struct{ name, kind, creds, settings, field string }{
		{"relative needs keys", AccountTypeRelay, `{"api_key":"test-api-key"}`, `{"base_url":"https://relay.example","asset_endpoint":"/assets"}`, FieldAccessKey},
		{"type", AccountTypeRelay, `{"api_key":"test-api-key"}`, `{"base_url":"https://relay.example","asset_endpoint":42}`, FieldAssetEndpoint},
		{"protocol relative", AccountTypeRelay, `{"api_key":"test-api-key"}`, `{"base_url":"https://relay.example","asset_endpoint":"//other.example/path"}`, FieldAssetEndpoint},
		{"official relay endpoint refused", AccountTypeAPIKey, `{"api_key":"test-api-key"}`, `{"asset_endpoint":"https://other.example"}`, FieldAssetEndpoint},
	} {
		t.Run(tc.name, func(t *testing.T) {
			res, err := New().ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: tc.kind, CredentialsJson: tc.creds, SettingsJson: tc.settings})
			if err != nil {
				t.Fatal(err)
			}
			for _, e := range res.Errors {
				if e.Field == tc.field {
					return
				}
			}
			t.Fatalf("missing %s validation: %+v", tc.field, res.Errors)
		})
	}
	creds := `{"api_key":"test-api-key","access_key":"` + testAK + `","secret_key":"` + testSK + `"}`
	res, err := New().ValidateCredentials(context.Background(), &pluginv1.ValidateCredentialsRequest{AccountType: AccountTypeRelay, CredentialsJson: creds, SettingsJson: `{"base_url":"https://relay.example","asset_endpoint":" /api/support/v1/asset "}`})
	if err != nil || len(res.GetErrors()) != 0 {
		t.Fatalf("valid endpoint rejected: %v %+v", err, res)
	}
	var settings map[string]any
	if err := json.Unmarshal([]byte(res.NormalizedSettingsJson), &settings); err != nil {
		t.Fatal(err)
	}
	if settings[FieldAssetEndpoint] != "/api/support/v1/asset" {
		t.Fatal("endpoint not normalized")
	}
}

func TestAssetEndpointSignsExactConfiguredPath(t *testing.T) {
	f := newFakeArk(t)
	api := newArkAPI(f.dialer())
	defer api.close()
	cfg := f.config()
	cfg.BaseURL = f.srv.URL + "/api/support/v1/asset"
	if _, err := api.call(context.Background(), cfg, ActionListAssets, map[string]any{}); err != nil {
		t.Fatal(err)
	}
	c := f.last(t)
	if c.Path != "/api/support/v1/asset" {
		t.Fatalf("changed configured endpoint: %s", c.Path)
	}
	if c.Query.Get("Action") != ActionListAssets || c.Query.Get("Version") != AssetAPIVersion {
		t.Fatalf("bad query: %v", c.Query)
	}
	verifySignature(t, c, testAK, testSK, DefaultAssetRegion, AssetServiceName)
}
