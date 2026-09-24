package billing

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// SyncPluginDefaults implements core.PriceCatalog: it upserts the plugin's
// default prices (source=plugin_default) inside the caller's transaction,
// deletes defaults the plugin no longer declares and records expression
// history. Admin prices are never touched. Enabled/note of existing rows are
// kept so that an administrator's "disable" survives upgrades.
func (s *Service) SyncPluginDefaults(ctx context.Context, tx pgx.Tx, pluginKey, platform string, entries []manifest.PricingEntry) error {
	var platforms, patterns []string
	for i, e := range entries {
		pf := e.Platform
		if pf == "" {
			pf = platform
		}
		if pf == "" {
			pf = "*"
		}
		if e.Model == "" {
			return core.ErrInvalidArgument.WithMessage(fmt.Sprintf("pricing[%d]: model is required", i))
		}
		cfg := json.RawMessage("{}")
		if e.Config != nil {
			b, err := json.Marshal(e.Config)
			if err != nil {
				return err
			}
			cfg = b
		}
		src, err := expressionFor(e.Mode, cfg, e.Expression)
		if err != nil {
			return core.ErrInvalidArgument.WithMessage(fmt.Sprintf("pricing[%d] (%s): %v", i, e.Model, err))
		}
		prog, err := expr.Compile(src)
		if err != nil {
			return core.ErrInvalidArgument.WithMessage(fmt.Sprintf("pricing[%d] (%s): %v", i, e.Model, err))
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO model_prices (platform, model_pattern, mode, config, expression, expr_version, expr_hash, source, plugin_key)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'plugin_default', $8)
			ON CONFLICT (platform, model_pattern, source) DO UPDATE SET
				mode = EXCLUDED.mode, config = EXCLUDED.config, expression = EXCLUDED.expression,
				expr_version = EXCLUDED.expr_version, expr_hash = EXCLUDED.expr_hash,
				plugin_key = EXCLUDED.plugin_key, updated_by = NULL, updated_at = now()`,
			pf, e.Model, e.Mode, cfg, src, prog.Version(), prog.Hash(), pluginKey)
		if err != nil {
			return fmt.Errorf("upsert default price %s/%s: %w", pf, e.Model, err)
		}
		if err := recordHistory(ctx, tx, prog); err != nil {
			return err
		}
		platforms = append(platforms, pf)
		patterns = append(patterns, e.Model)
	}
	_, err := tx.Exec(ctx, `
		DELETE FROM model_prices
		WHERE source = 'plugin_default' AND plugin_key = $1
		  AND (platform, model_pattern) NOT IN (SELECT * FROM unnest($2::text[], $3::text[]))`,
		pluginKey, platforms, patterns)
	if err != nil {
		return fmt.Errorf("delete stale default prices: %w", err)
	}
	s.changedAfterCommit(ctx, "prices")
	return nil
}

// expressionFor returns the stored expression for a price: generated from
// config for per_request/per_token, the given source for expression mode
// (or generated from its visual config when no source is given).
func expressionFor(mode string, config json.RawMessage, expression string) (string, error) {
	switch mode {
	case expr.ModePerRequest, expr.ModePerToken:
		return expr.Generate(mode, config)
	case expr.ModeExpression:
		if expression != "" {
			return expression, nil
		}
		return expr.Generate(mode, config)
	}
	return "", fmt.Errorf("unknown mode %q", mode)
}

func recordHistory(ctx context.Context, q store.Querier, p *expr.Program) error {
	_, err := q.Exec(ctx, `
		INSERT INTO model_price_history (expr_hash, expression, expr_version) VALUES ($1, $2, $3)
		ON CONFLICT (expr_hash) DO NOTHING`, p.Hash(), p.Expression(), p.Version())
	return err
}
