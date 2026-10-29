package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"maps"
	"slices"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/jackc/pgx/v5"
)

// factsJSON is the resource_facts_json of save hooks (CONTRACTS §59): ""
// when the preparation observed nothing.
func factsJSON(f core.AccountPreparationFacts) string {
	if f == (core.AccountPreparationFacts{}) {
		return ""
	}
	raw, _ := json.Marshal(f)
	return string(raw)
}

// patchTarget holds the account fields about to be saved that a plugin's
// account_patch may change. A nil field is not offered to the plugin: its
// change is ignored.
type patchTarget struct {
	Models         *[]string
	Mapping        *map[string]string
	Priority       *int
	Weight         *int
	MaxConcurrency *int
	RPMLimit       *int
	TPMLimit       *int64
	ModelLimits    *[]core.ModelLimit
}

// applyAccountPatch applies the account_patch of a before_create/update answer to
// the fields about to be saved, validated like the caller's own input
// (CONTRACTS §59, §68). It returns the names of the fields the plugin changed.
func applyAccountPatch(ctx context.Context, out *pluginv1.AccountLifecycleResponse, to patchTarget) ([]string, error) {
	patch := out.GetAccountPatch()
	if patch == nil {
		return nil, nil
	}
	var changed []string
	if list := patch.GetModels(); list != nil && to.Models != nil {
		next, fe := normalizeModels(ctx, list.GetIds())
		if len(fe) > 0 {
			return nil, invalidPatch(fe)
		}
		if !slices.Equal(next, *to.Models) {
			*to.Models = next
			changed = append(changed, "models")
		}
	}
	if m := patch.GetModelMapping(); m != nil && to.Mapping != nil {
		next, fe := normalizeMapping(ctx, m.GetEntries())
		if len(fe) > 0 {
			return nil, invalidPatch(fe)
		}
		if !maps.Equal(next, *to.Mapping) {
			*to.Mapping = next
			changed = append(changed, "model_mapping")
		}
	}
	// Scheduling and limits are checked with the caller's own rules.
	var probe input
	if patch.Priority != nil && to.Priority != nil {
		probe.Priority = new(int(patch.GetPriority()))
	}
	if patch.Weight != nil && to.Weight != nil {
		probe.Weight = new(int(patch.GetWeight()))
	}
	if patch.MaxConcurrency != nil && to.MaxConcurrency != nil {
		probe.MaxConcurrency = new(int(patch.GetMaxConcurrency()))
	}
	if patch.RpmLimit != nil && to.RPMLimit != nil {
		probe.RPMLimit = new(int(patch.GetRpmLimit()))
	}
	if patch.TpmLimit != nil && to.TPMLimit != nil {
		probe.TPMLimit = new(patch.GetTpmLimit())
	}
	if list := patch.GetModelLimits(); list != nil && to.ModelLimits != nil {
		probe.ModelLimits = new(coreModelLimits(list.GetItems()))
	}
	if fe := probe.validateScheduling(ctx); len(fe) > 0 {
		return nil, invalidPatch(fe)
	}
	for _, f := range []struct {
		name     string
		from, to *int
	}{
		{"priority", probe.Priority, to.Priority}, {"weight", probe.Weight, to.Weight},
		{"max_concurrency", probe.MaxConcurrency, to.MaxConcurrency}, {"rpm_limit", probe.RPMLimit, to.RPMLimit},
	} {
		if f.from != nil && *f.from != *f.to {
			*f.to = *f.from
			changed = append(changed, f.name)
		}
	}
	if probe.TPMLimit != nil && *probe.TPMLimit != *to.TPMLimit {
		*to.TPMLimit = *probe.TPMLimit
		changed = append(changed, "tpm_limit")
	}
	if probe.ModelLimits != nil && !slices.EqualFunc(*probe.ModelLimits, *to.ModelLimits, sameModelLimit) {
		*to.ModelLimits = *probe.ModelLimits
		changed = append(changed, "model_limits")
	}
	return changed, nil
}

func invalidPatch(fe []core.FieldError) error {
	return core.ErrPluginUnavailable.WithMessage("Plugin returned an invalid account change").
		WithDetails(map[string]any{"fields": fe})
}

// FactsObserved is the ccgateway hook run after an account's runtime was
// observed again (re-authorization, health; CONTRACTS §59). observed holds
// what the runtime reported (the account email); subscriptionChanged says the
// recorded subscription type just changed. The plugin's before_update gets the
// facts: an account whose models are automatic (auto_models not false) gets
// its list again, and any account its read-only extensions. Only what changed
// is written. Failures are logged; the next observation or save retries.
func (s *Service) FactsObserved(ctx context.Context, id int64, observed core.AccountPreparationFacts, subscriptionChanged bool) {
	if err := s.refreshFromFacts(ctx, id, observed, subscriptionChanged); err != nil {
		slog.WarnContext(ctx, "account: refresh from runtime facts", "account", id, "err", err)
	}
}

// refreshFromFacts asks the plugin's before_update for the account under its
// current subscription type and the observed facts, and saves what it changed.
func (s *Service) refreshFromFacts(ctx context.Context, id int64, observed core.AccountPreparationFacts, subscriptionChanged bool) error {
	cur, err := s.loadRow(ctx, s.d.DB.Pool, id, nil, false)
	if err != nil {
		return err
	}
	bt, ok := s.accountType(cur.PluginKey, cur.Type)
	if !ok {
		return nil
	}
	automatic := cur.AutoModels == nil || *cur.AutoModels
	owned := readOnlyExtensionKeys(bt)
	if (!automatic || !subscriptionChanged) && len(owned) == 0 {
		return nil
	}
	snapshot := cur.lifecycleSnapshot()
	facts := core.AccountPreparationFacts{SubscriptionType: valueOr(cur.SubscriptionType, ""), AccountEmail: observed.AccountEmail}
	changedFields := []string{"resource_facts"}
	if subscriptionChanged {
		changedFields = []string{"subscription_type"}
	}
	before, err := s.accountLifecycle(ctx, bt, &pluginv1.AccountLifecycleRequest{
		Phase: "before_update", Account: snapshot,
		ResourceFactsJson: factsJSON(facts), ChangedFields: changedFields,
	})
	if err != nil {
		return err
	}
	models, modelMapping := snapshot.GetProperties().GetModels(), snapshot.GetProperties().GetModelMapping()
	var patched []string
	if automatic {
		// Only the models follow the observed facts here; scheduling stays
		// what the account was saved with.
		if patched, err = applyAccountPatch(ctx, before, patchTarget{Models: &models, Mapping: &modelMapping}); err != nil {
			return err
		}
	}
	settings, extensionsChanged, err := s.applyExtensionsPatch(bt, cur.Settings, before)
	if err != nil {
		return err
	}
	modelsChanged := len(patched) > 0
	if extensionsChanged {
		patched = append(patched, "settings")
	}
	if len(patched) == 0 {
		return nil
	}
	var mapping, settingsJSON *string
	if slices.Contains(patched, "model_mapping") {
		m := mappingJSON(modelMapping)
		mapping = &m
	}
	if extensionsChanged {
		value := string(settings)
		settingsJSON = &value
	}
	saved := false
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		// Only over the row the plugin saw: a concurrent save ran its own
		// before_update, and switching to manual mode wins.
		tag, err := tx.Exec(ctx, `UPDATE accounts SET models = CASE WHEN $5 THEN $3::text[] ELSE models END,
			model_mapping = COALESCE($4::jsonb, model_mapping), settings = COALESCE($6::jsonb, settings), updated_at = clock_timestamp()
			WHERE id = $1 AND updated_at = $2 AND deleted_at IS NULL AND (NOT $5 OR auto_models IS NOT FALSE)`,
			id, cur.UpdatedAt, models, mapping, modelsChanged, settingsJSON)
		if err != nil || tag.RowsAffected() == 0 {
			return err
		}
		saved = true
		if modelsChanged {
			if err := audit.Audit(ctx, tx, 0, "account.models.auto", "account", itoa(id), map[string]any{
				"subscription_type": facts.SubscriptionType, "plugin_changed": slices.DeleteFunc(slices.Clone(patched), func(f string) bool { return f == "settings" }), "models": models,
			}); err != nil {
				return err
			}
		}
		if extensionsChanged {
			// The values are the plugin's facts (an email): only the keys are audited.
			if err := audit.Audit(ctx, tx, 0, "account.extensions.plugin", "account", itoa(id), map[string]any{
				"keys": extensionKeysChanged(cur.Settings, settings, owned),
			}); err != nil {
				return err
			}
		}
		if bt.Type.Lifecycle != nil {
			if err := markLifecyclePending(ctx, tx, id); err != nil {
				return err
			}
		}
		payload := basicPayload(id, cur.PluginKey, cur.Type, cur.Name)
		payload["changed_fields"] = patched
		return s.d.Events.Emit(ctx, tx, core.Event{Type: core.EventAccountUpdated, Payload: payload})
	})
	if err != nil || !saved {
		return err
	}
	s.changed(ctx, id)
	s.kickCCGateway(id, cur.PluginKey, cur.Type)
	return nil
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
