package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Quota declarations of an account type (CONTRACTS §44).
func TestAccountTypeQuota(t *testing.T) {
	m := minimal()
	m.Capabilities = []manifest.Capability{{ID: manifest.CapPlatformAdapter}}
	m.HostPermissions = []manifest.HostPermission{
		{ID: "gateway.endpoint"}, {ID: "platform.register"},
		{ID: "accounts.credentials", Scope: map[string]any{"types": "own"}},
	}
	m.Platforms = []manifest.Platform{validPlatform()}
	m.AccountTypes = []manifest.AccountType{{
		ID: "oauth", Label: manifest.LocalizedText{"en": "OAuth"},
		Form:      manifest.Form{Mode: "schema", Schema: "forms/k.json"},
		Platforms: []manifest.AccountPlatform{{Platform: "video"}},
		Quota: &manifest.AccountQuota{Query: true, Headers: []manifest.QuotaHeader{
			{Key: "5h", Utilization: "anthropic-ratelimit-unified-5h-utilization",
				Reset: "anthropic-ratelimit-unified-5h-reset", Status: "anthropic-ratelimit-unified-5h-status"},
			{Key: "7d_fable", Utilization: "x-fable", UtilizationUnit: "percent", Reset: "x-fable-reset", ResetFormat: "rfc3339"},
		}},
	}}
	files := map[string][]byte{"forms/k.json": []byte(`{}`)}
	if err := Validate(m, files, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("valid quota rejected: %v", codes(err))
	}
	// Query alone is enough.
	m.AccountTypes[0].Quota = &manifest.AccountQuota{Query: true}
	if err := Validate(m, files, ValidateOptions{Tooling: true}); err != nil {
		t.Fatalf("query-only quota rejected: %v", codes(err))
	}
	m.AccountTypes[0].Quota = &manifest.AccountQuota{}
	if got := codes(Validate(m, files, ValidateOptions{Tooling: true})); got["accountTypes[0].quota"] != "required" {
		t.Fatalf("empty quota: codes = %v", got)
	}
	m.AccountTypes[0].Quota = &manifest.AccountQuota{Headers: []manifest.QuotaHeader{
		{Key: "5H", Utilization: "x-u"},
		{Key: "7d", Utilization: "bad header", UtilizationUnit: "fraction"},
		{Key: "7d", Reset: "x-r", ResetFormat: "iso"},
		{Key: "1d"},
		{Key: "2d", Status: "x-s", UtilizationUnit: "ratio", ResetFormat: "unix"},
	}}
	got := codes(Validate(m, files, ValidateOptions{Tooling: true}))
	want := map[string]string{
		"accountTypes[0].quota.headers[0].key":             "invalid_format",
		"accountTypes[0].quota.headers[1].utilization":     "invalid_format",
		"accountTypes[0].quota.headers[1].utilizationUnit": "invalid",
		"accountTypes[0].quota.headers[2].key":             "duplicate",
		"accountTypes[0].quota.headers[2].resetFormat":     "invalid",
		"accountTypes[0].quota.headers[3]":                 "required",
		"accountTypes[0].quota.headers[4].utilizationUnit": "unexpected",
		"accountTypes[0].quota.headers[4].resetFormat":     "unexpected",
	}
	for f, c := range want {
		if got[f] != c {
			t.Errorf("%s = %q, want %q (all: %v)", f, got[f], c, got)
		}
	}
	m.AccountTypes[0].Quota = &manifest.AccountQuota{Headers: make([]manifest.QuotaHeader, manifest.MaxQuotaHeaders+1)}
	for i := range m.AccountTypes[0].Quota.Headers {
		m.AccountTypes[0].Quota.Headers[i] = manifest.QuotaHeader{Key: "w" + string(rune('a'+i)), Status: "x-s"}
	}
	if got := codes(Validate(m, files, ValidateOptions{Tooling: true})); got["accountTypes[0].quota.headers"] != "too_many" {
		t.Fatalf("too many: codes = %v", got)
	}
}
