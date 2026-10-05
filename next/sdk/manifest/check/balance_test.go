package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Balance declarations of an account type (CONTRACTS §51).
func TestAccountTypeBalance(t *testing.T) {
	m := minimal()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}}
	m.HostPermissions = []manifest.HostPermission{
		{ID: "gateway.endpoint"}, {ID: "platform.register"},
		{ID: "accounts.credentials", Scope: map[string]any{"types": "own"}},
	}
	m.Platforms = []manifest.Platform{validPlatform()}
	m.AccountTypes = []manifest.AccountType{{
		ID:        "oauth",
		Label:     manifest.LocalizedText{"en": "OAuth"},
		Form:      manifest.Form{Mode: "schema", Schema: "forms/k.json"},
		Platforms: []manifest.AccountPlatform{{Platform: "video"}},
		Balance: &manifest.AccountBalance{
			Currency: "USD",
		},
	}}
	files := map[string][]byte{"forms/k.json": []byte(`{}`)}
	if err := Validate(m, files, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("valid balance rejected: %v", codes(err))
	}

	// EUR is also valid.
	m.AccountTypes[0].Balance = &manifest.AccountBalance{Currency: "EUR"}
	if err := Validate(m, files, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("valid EUR balance rejected: %v", codes(err))
	}

	// Missing currency.
	m.AccountTypes[0].Balance = &manifest.AccountBalance{}
	if got := codes(Validate(m, files, ValidateOptions{Tooling: true})); got["accountTypes[0].balance.currency"] != "required" {
		t.Fatalf("missing currency: codes = %v", got)
	}

	// Invalid currency formats.
	testCases := []struct {
		name     string
		currency string
		wantCode string
	}{
		{"lowercase", "usd", "invalid_format"},
		{"too_short", "US", "invalid_format"},
		{"too_long", "USDT", "invalid_format"},
		{"numeric", "123", "invalid_format"},
		{"empty", "", "required"},
	}
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			m.AccountTypes[0].Balance = &manifest.AccountBalance{Currency: tc.currency}
			got := codes(Validate(m, files, ValidateOptions{Tooling: true}))
			if got["accountTypes[0].balance.currency"] != tc.wantCode {
				t.Errorf("currency=%q: got code %q, want %q (all codes: %v)",
					tc.currency, got["accountTypes[0].balance.currency"], tc.wantCode, got)
			}
		})
	}
}

func TestBalanceWithoutAdapter(t *testing.T) {
	m := minimal()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}}
	m.HostPermissions = []manifest.HostPermission{
		{ID: "gateway.endpoint"},
		{ID: "platform.register"},
		{ID: "accounts.credentials", Scope: map[string]any{"types": "own"}},
	}
	m.Platforms = []manifest.Platform{validPlatform()}
	m.AccountTypes = []manifest.AccountType{{
		ID:        "oauth",
		Label:     manifest.LocalizedText{"en": "OAuth"},
		Form:      manifest.Form{Mode: "schema", Schema: "forms/k.json"},
		Platforms: []manifest.AccountPlatform{{Platform: "video"}},
		Balance: &manifest.AccountBalance{
			Currency: "USD",
		},
	}}
	files := map[string][]byte{"forms/k.json": []byte(`{}`)}
	err := Validate(m, files, ValidateOptions{Tooling: true})
	// Balance query is implemented via gRPC (BuildBalanceRequest/ParseBalanceResponse),
	// but accountTypes still require platform.adapter.v1 for account management.
	if err != nil {
		t.Errorf("valid balance declaration rejected: %v", err)
	}
}
