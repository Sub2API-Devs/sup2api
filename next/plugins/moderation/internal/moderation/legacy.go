package moderation

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

// convertLegacyOnce turns the 0.1 single-model setup into a channel, an
// llm_verdict auditor and a published flow, once per installation
// (config_state.legacy_converted, row-locked so only one node does it).
// CONTRACTS §72.12.
func (p *Plugin) convertLegacyOnce(ctx context.Context) {
	if p.legacyDone.Load() || p.host == nil || !p.configured.Load() {
		return
	}
	db, err := p.db(ctx)
	if err != nil {
		return
	}
	c := p.cfg.Load()
	converted := false
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		var done bool
		if err := tx.QueryRow(ctx, `SELECT legacy_converted FROM config_state WHERE id = 1 FOR UPDATE`).Scan(&done); err != nil {
			return err
		}
		if done {
			return nil
		}
		var channels int
		if err := tx.QueryRow(ctx, `SELECT count(*) FROM channels`).Scan(&channels); err != nil {
			return err
		}
		if channels == 0 && c.legacyReady {
			if err := p.convertLegacy(ctx, tx, c); err != nil {
				return err
			}
			converted = true
		}
		_, err := tx.Exec(ctx, `UPDATE config_state SET legacy_converted = true WHERE id = 1`)
		return err
	})
	if err != nil {
		p.log.Warn("moderation: converting the 0.1 settings failed, retrying later", "error", err.Error())
		return
	}
	p.legacyDone.Store(true)
	if converted {
		msg := "moderation: converted the 0.1 settings into channel, auditor and flow"
		if c.OnError == "block" {
			msg += "; on_error=block is no longer supported, moderation errors now always let the request pass"
		}
		p.log.Info(msg, "groups", len(c.GroupIDs), "model_patterns", len(c.ModelPatterns))
		p.configChanged(ctx)
	}
}

func (p *Plugin) convertLegacy(ctx context.Context, tx pgx.Tx, c *config) error {
	now := p.now().UTC()
	var chID int64
	if err := tx.QueryRow(ctx, `INSERT INTO channels (type, protocol, name, base_url, api_key_tail, model, timeout_ms, created_at, updated_at)
		VALUES ('llm', $1, $2, $3, $4, $5, $6, $7, $7) RETURNING id`,
		ProtocolOpenAIChat, "0.1 LLM", c.BaseURL, keyTail(c.APIKey), c.Model, c.TimeoutMs, now).Scan(&chID); err != nil {
		return err
	}
	if c.APIKey != "" {
		enc, err := p.host.SealSecret(ctx, secretContext(chID, "key"), []byte(c.APIKey))
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `UPDATE channels SET api_key_enc = $2 WHERE id = $1`, chID, enc); err != nil {
			return err
		}
	}
	cfg, _ := json.Marshal(AuditorConfig{
		SystemPrompt: c.SystemPrompt, Categories: c.Categories, ToolChoice: c.ToolChoice,
		MaxTurns: c.MaxTurns, Temperature: c.Temperature, MaxTokens: c.MaxTokens,
	})
	var audID int64
	if err := tx.QueryRow(ctx, `INSERT INTO auditors (name, type, channel_id, config, created_at, updated_at)
		VALUES ($1, 'llm_verdict', $2, $3, $4, $4) RETURNING id`, "0.1 LLM 审核", chID, cfg, now).Scan(&audID); err != nil {
		return err
	}
	spec := Spec{
		ModelFilter:    ModelFilter{Type: FilterAll, Models: []string{}},
		SampleRate:     float64(c.SampleRate),
		TotalTimeoutMs: max(c.TimeoutMs, minTotalTimeoutMs),
		Stages:         []Stage{{Auditors: []int64{audID}, Combine: CombineAny}},
	}
	if len(c.ModelPatterns) > 0 {
		spec.ModelFilter = ModelFilter{Type: FilterOnly, Models: c.ModelPatterns}
	}
	raw, _ := json.Marshal(spec)
	var flowID int64
	if err := tx.QueryRow(ctx, `INSERT INTO flows (name, enabled, draft, published, version, published_at, created_at, updated_at)
		VALUES ($1, true, $2, $2, 1, $3, $3, $3) RETURNING id`, "0.1 设置", raw, now).Scan(&flowID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO flow_versions (flow_id, version, spec, published_at) VALUES ($1, 1, $2, $3)`, flowID, raw, now); err != nil {
		return err
	}
	groups := c.GroupIDs
	if len(groups) == 0 {
		groups = []int64{0}
	}
	for _, g := range groups {
		if _, err := tx.Exec(ctx, `INSERT INTO flow_groups (group_id, flow_id) VALUES ($1, $2) ON CONFLICT (group_id) DO NOTHING`, g, flowID); err != nil {
			return err
		}
	}
	return bumpConfig(ctx, tx)
}

// keyTail is the last 4 characters shown for a key.
func keyTail(k string) string {
	r := []rune(k)
	if len(r) <= 4 {
		return ""
	}
	return string(r[len(r)-4:])
}
