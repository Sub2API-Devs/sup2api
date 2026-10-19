package account

import (
	"context"
	"encoding/json"
	"maps"
	"slices"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// factsJSON is the resource_facts_json of before_create (CONTRACTS §59): ""
// when the preparation observed nothing.
func factsJSON(f core.AccountPreparationFacts) string {
	if f == (core.AccountPreparationFacts{}) {
		return ""
	}
	raw, _ := json.Marshal(f)
	return string(raw)
}

// applyAccountPatch applies the account_patch of a before_create answer to
// the models and mapping about to be saved, validated like the caller's own
// input. It returns the names of the fields the plugin changed.
func applyAccountPatch(ctx context.Context, out *pluginv1.AccountLifecycleResponse, models *[]string, mapping *map[string]string) ([]string, error) {
	patch := out.GetAccountPatch()
	if patch == nil {
		return nil, nil
	}
	var changed []string
	if list := patch.GetModels(); list != nil {
		next, fe := normalizeModels(ctx, list.GetIds())
		if len(fe) > 0 {
			return nil, invalidPatch(fe)
		}
		if !slices.Equal(next, *models) {
			*models = next
			changed = append(changed, "models")
		}
	}
	if m := patch.GetModelMapping(); m != nil {
		next, fe := normalizeMapping(ctx, m.GetEntries())
		if len(fe) > 0 {
			return nil, invalidPatch(fe)
		}
		if !maps.Equal(next, *mapping) {
			*mapping = next
			changed = append(changed, "model_mapping")
		}
	}
	return changed, nil
}

func invalidPatch(fe []core.FieldError) error {
	return core.ErrPluginUnavailable.WithMessage("Plugin returned an invalid account change").
		WithDetails(map[string]any{"fields": fe})
}

// createAudit is the account.create audit detail: the subscription type the
// preparation observed and the fields the plugin changed, when any.
func createAudit(name string, bt core.AccountTypeBinding, facts core.AccountPreparationFacts, patched []string) map[string]any {
	detail := map[string]any{"name": name, "plugin_key": bt.Plugin.Key, "type": bt.Type.ID}
	if facts.SubscriptionType != "" {
		detail["subscription_type"] = facts.SubscriptionType
	}
	if len(patched) > 0 {
		detail["plugin_changed"] = patched
	}
	return detail
}
