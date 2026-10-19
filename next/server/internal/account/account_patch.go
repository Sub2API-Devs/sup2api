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

// applyAccountPatch applies the account_patch of a before_create/update answer to
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

// SubscriptionChanged is the ccgateway hook run after an account's recorded
// subscription type changed (CONTRACTS §59): an account whose models are
// automatic (auto_models not false) gets the plugin's list again. Failures
// are logged; the next save or subscription change recomputes it.
func (s *Service) SubscriptionChanged(ctx context.Context, id int64) {
	if err := s.refreshAutoModels(ctx, id); err != nil {
		slog.WarnContext(ctx, "account: recompute automatic models", "account", id, "err", err)
	}
}

// refreshAutoModels asks the plugin's before_update for the account's models
// under its current subscription type and saves what it changed.
func (s *Service) refreshAutoModels(ctx context.Context, id int64) error {
	cur, err := s.loadRow(ctx, s.d.DB.Pool, id, nil, false)
	if err != nil {
		return err
	}
	if cur.AutoModels != nil && !*cur.AutoModels {
		return nil
	}
	bt, ok := s.accountType(cur.PluginKey, cur.Type)
	if !ok {
		return nil
	}
	snapshot := cur.lifecycleSnapshot()
	facts := core.AccountPreparationFacts{SubscriptionType: valueOr(cur.SubscriptionType, "")}
	before, err := s.accountLifecycle(ctx, bt, &pluginv1.AccountLifecycleRequest{
		Phase: "before_update", Account: snapshot,
		ResourceFactsJson: factsJSON(facts), ChangedFields: []string{"subscription_type"},
	})
	if err != nil {
		return err
	}
	models, modelMapping := snapshot.GetProperties().GetModels(), snapshot.GetProperties().GetModelMapping()
	patched, err := applyAccountPatch(ctx, before, &models, &modelMapping)
	if err != nil || len(patched) == 0 {
		return err
	}
	var mapping *string
	if slices.Contains(patched, "model_mapping") {
		m := mappingJSON(modelMapping)
		mapping = &m
	}
	saved := false
	err = s.d.DB.Tx(ctx, func(tx pgx.Tx) error {
		// Only over the row the plugin saw: a concurrent save ran its own
		// before_update, and switching to manual mode wins.
		tag, err := tx.Exec(ctx, `UPDATE accounts SET models = $3::text[], model_mapping = COALESCE($4::jsonb, model_mapping), updated_at = clock_timestamp()
			WHERE id = $1 AND updated_at = $2 AND deleted_at IS NULL AND auto_models IS NOT FALSE`, id, cur.UpdatedAt, models, mapping)
		if err != nil || tag.RowsAffected() == 0 {
			return err
		}
		saved = true
		if err := audit.Audit(ctx, tx, 0, "account.models.auto", "account", itoa(id), map[string]any{
			"subscription_type": facts.SubscriptionType, "plugin_changed": patched, "models": models,
		}); err != nil {
			return err
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
