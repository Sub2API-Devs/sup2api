package ccgateway

import (
	"context"
	"slices"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestAutomaticModelsOnCreateAndUpdate(t *testing.T) {
	p := New()
	edited := []string{"claude-fable-5", "claude-opus-5"}
	for _, c := range []struct {
		name, kind, facts string
		models            []string
		auto              *bool
		want              []string // nil: no change
	}{
		{"pro on the built-in list", AccountTypeManaged, `{"subscription_type":"pro"}`, DefaultModels, nil,
			[]string{"claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-5-5", "claude-sonnet-5-5"}},
		{"max keeps every model", AccountTypeManaged, `{"subscription_type":"max"}`, edited, nil, DefaultModels},
		{"unknown subscription", AccountTypeManaged, "", nil, nil, DefaultModels},
		{"pro with the built-in list reordered", AccountTypeManaged, `{"subscription_type":"pro"}`, reversed(DefaultModels), nil,
			[]string{"claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-5-5", "claude-sonnet-5-5"}},
		{"pro automatic overrides a submitted custom list", AccountTypeManaged, `{"subscription_type":"pro"}`, edited, boolValue(true), DefaultModelsForSubscription("pro")},
		{"pro manual preserves even the full built-in list", AccountTypeManaged, `{"subscription_type":"pro"}`, DefaultModels, boolValue(false), nil},
		{"manual custom list", AccountTypeManaged, `{"subscription_type":"pro"}`, edited, boolValue(false), nil},
		{"manual unrestricted", AccountTypeManaged, `{"subscription_type":"pro"}`, nil, boolValue(false), nil},
		{"api key accounts", AccountTypeAPIKey, `{"subscription_type":"pro"}`, edited, nil, DefaultModels},
	} {
		for _, phase := range []string{"before_create", "before_update"} {
			out, err := p.OnAccountLifecycle(context.Background(), &pluginv1.AccountLifecycleRequest{Phase: phase, ResourceFactsJson: c.facts,
				Account: &pluginv1.Account{Type: c.kind, SettingsJson: "{}", Properties: &pluginv1.AccountProperties{Models: slices.Clone(c.models), AutoModels: c.auto}}})
			if err != nil {
				t.Fatalf("%s: %v", c.name, err)
			}
			got := out.GetAccountPatch()
			if c.want == nil {
				if got != nil {
					t.Errorf("%s: unexpected change %v", c.name, got)
				}
				continue
			}
			if got.GetModelMapping() != nil || !slices.Equal(got.GetModels().GetIds(), c.want) {
				t.Errorf("%s: got %v", c.name, got)
			}
		}
	}
	if len(DefaultModels) != 11 {
		t.Fatal("the built-in list was changed by the patch")
	}
}

func boolValue(value bool) *bool { return &value }

func reversed(in []string) []string {
	out := slices.Clone(in)
	slices.Reverse(out)
	return out
}
