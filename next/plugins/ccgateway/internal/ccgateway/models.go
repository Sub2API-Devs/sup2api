package ccgateway

import (
	"encoding/json"
	"slices"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// DefaultModels is the built-in model list of both account types; the
// manifest's defaultModels must equal it (manifest test).
var DefaultModels = []string{
	"claude-fable-5", "claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6",
	"claude-sonnet-5", "claude-sonnet-4-6", "claude-haiku-4-5-20251001",
	"claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5",
}

// proUnavailableModels are the built-in models a Pro subscription cannot use.
var proUnavailableModels = []string{"claude-fable-5", "claude-fable-5-1"}

// sameModels compares model lists ignoring their order.
func sameModels(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	a, b = slices.Clone(a), slices.Clone(b)
	slices.Sort(a)
	slices.Sort(b)
	return slices.Equal(a, b)
}

// subscriptionModels is the before_create change of a new Claude
// subscription account (CONTRACTS §59): a Pro account still carrying the
// built-in list gets it without the Fable models. Any other subscription,
// an unknown one, or a list the user edited is left alone (nil).
func subscriptionModels(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
	if in.GetAccount().GetType() != AccountTypeManaged || in.GetResourceFactsJson() == "" {
		return nil
	}
	var facts struct {
		SubscriptionType string `json:"subscription_type"`
	}
	if json.Unmarshal([]byte(in.GetResourceFactsJson()), &facts) != nil || facts.SubscriptionType != "pro" {
		return nil
	}
	if !sameModels(in.GetAccount().GetProperties().GetModels(), DefaultModels) {
		return nil
	}
	models := slices.DeleteFunc(slices.Clone(DefaultModels), func(m string) bool { return slices.Contains(proUnavailableModels, m) })
	return &pluginv1.AccountPatch{Models: &pluginv1.ModelList{Ids: models}}
}
