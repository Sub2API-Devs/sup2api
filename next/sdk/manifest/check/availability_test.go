package check

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestQuotaAvailabilityManifest(t *testing.T) {
	var at manifest.AccountType
	raw := `{"modelAvailability":true,"quota":{"query":true,"autoRefresh":true,"windows":[{"key":"weekly_scoped","label":{"en":"Weekly scoped"},"shortLabel":{"en":"Week"}},{"key":"session","label":{"en":"Session"}}]}}`
	if err := json.Unmarshal([]byte(raw), &at); err != nil {
		t.Fatal(err)
	}
	if !at.ModelAvailability || !at.Quota.AutoRefresh || at.Quota.Windows[0].Key != "weekly_scoped" {
		t.Fatalf("contract: %+v", at)
	}
	for _, tt := range []struct {
		name, field, code string
		change            func(*manifest.AccountQuota)
	}{
		{"valid", "", "", func(q *manifest.AccountQuota) {}},
		{"refresh requires query", ".autoRefresh", "required", func(q *manifest.AccountQuota) { q.Query = false }},
		{"duplicate", ".windows[1].key", "duplicate", func(q *manifest.AccountQuota) { q.Windows[1].Key = q.Windows[0].Key }},
		{"bad key", ".windows[0].key", "invalid_format", func(q *manifest.AccountQuota) { q.Windows[0].Key = "Bad key" }},
		{"label", ".windows[0].label", "required", func(q *manifest.AccountQuota) { q.Windows[0].Label = nil }},
		{"short label", ".windows[0].shortLabel", "required", func(q *manifest.AccountQuota) { q.Windows[0].ShortLabel = manifest.LocalizedText{"zh": "短"} }},
		{"limit", ".windows", "too_many", func(q *manifest.AccountQuota) {
			q.Windows = make([]manifest.QuotaWindowDefinition, manifest.MaxQuotaHeaders+1)
		}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			var a manifest.AccountType
			_ = json.Unmarshal([]byte(raw), &a)
			tt.change(a.Quota)
			v := &validator{}
			v.quota("accountTypes[0]", a.Quota)
			got := codes(&ValidationError{Fields: v.errs})
			if tt.field == "" {
				if len(got) != 0 {
					t.Fatalf("valid: %v", got)
				}
				return
			}
			if got["accountTypes[0].quota"+tt.field] != tt.code {
				t.Fatalf("errors: %v", got)
			}
		})
	}
}
