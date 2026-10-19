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

// DefaultModelsForSubscription returns a fresh list; neither UI previews nor
// save hooks may mutate the shared built-in catalog.
func DefaultModelsForSubscription(plan string) []string {
	models := slices.Clone(DefaultModels)
	if plan == "pro" {
		models = slices.DeleteFunc(models, func(m string) bool { return slices.Contains(proUnavailableModels, m) })
	}
	return models
}

// Automatic mode owns the model list on both create and update. An absent
// preference defaults to automatic; explicit false always preserves edits.
func subscriptionModels(in *pluginv1.AccountLifecycleRequest) *pluginv1.AccountPatch {
	properties := in.GetAccount().GetProperties()
	if properties != nil && properties.AutoModels != nil && !properties.GetAutoModels() {
		return nil
	}
	var facts struct {
		SubscriptionType string `json:"subscription_type"`
	}
	if in.GetAccount().GetType() == AccountTypeManaged {
		_ = json.Unmarshal([]byte(in.GetResourceFactsJson()), &facts)
	}
	return &pluginv1.AccountPatch{Models: &pluginv1.ModelList{Ids: DefaultModelsForSubscription(facts.SubscriptionType)}}
}
