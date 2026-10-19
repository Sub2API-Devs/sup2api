package ccgateway

import (
	"context"
	"slices"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestBeforeCreateDropsFableForProAccountsOnTheBuiltInList(t *testing.T) {
	p := New()
	edited := []string{"claude-fable-5", "claude-opus-5"}
	for _, c := range []struct {
		name, kind, facts string
		models            []string
		want              []string // nil: no change
	}{
		{"pro on the built-in list", AccountTypeManaged, `{"subscription_type":"pro"}`, DefaultModels,
			[]string{"claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-5-5", "claude-sonnet-5-5"}},
		{"max keeps every model", AccountTypeManaged, `{"subscription_type":"max"}`, DefaultModels, nil},
		{"unknown subscription", AccountTypeManaged, "", DefaultModels, nil},
		{"pro with the built-in list reordered", AccountTypeManaged, `{"subscription_type":"pro"}`, reversed(DefaultModels),
			[]string{"claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-opus-5-5", "claude-sonnet-5-5"}},
		{"pro with an edited list", AccountTypeManaged, `{"subscription_type":"pro"}`, edited, nil},
		{"pro with every model", AccountTypeManaged, `{"subscription_type":"pro"}`, nil, nil},
		{"api key accounts", AccountTypeAPIKey, `{"subscription_type":"pro"}`, DefaultModels, nil},
	} {
		out, err := p.OnAccountLifecycle(context.Background(), &pluginv1.AccountLifecycleRequest{Phase: "before_create", ResourceFactsJson: c.facts,
			Account: &pluginv1.Account{Type: c.kind, SettingsJson: "{}", Properties: &pluginv1.AccountProperties{Models: slices.Clone(c.models)}}})
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
	if len(DefaultModels) != 11 {
		t.Fatal("the built-in list was changed by the patch")
	}
}

func reversed(in []string) []string {
	out := slices.Clone(in)
	slices.Reverse(out)
	return out
}
