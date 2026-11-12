package moderation

import (
	"context"
	"encoding/json"
	"math"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/textutil"
)

// legacySetup is the 0.1 single-model setup (the retired keys base_url …
// model_patterns of the settings), read only by the one-time conversion: an
// installation upgraded from 0.1 straight to a later version still converts
// it. on_error is not read any more (0.10.0): moderation errors always let
// the request pass, which the conversion used to log.
type legacySetup struct {
	BaseURL       string
	APIKey        string
	Model         string
	SystemPrompt  string
	Categories    []Category
	ToolChoice    string
	MaxTurns      int
	Temperature   float64
	MaxTokens     int
	TimeoutMs     int
	SampleRate    int
	GroupIDs      []int64
	ModelPatterns []string
}

// defaultLegacySetup is the schema defaults of the 0.1 keys.
func defaultLegacySetup() legacySetup {
	return legacySetup{ToolChoice: "required", MaxTurns: 3, MaxTokens: 512, TimeoutMs: 10000, SampleRate: 100}
}

// legacySetup reads the 0.1 single-model setup (converted once, §72.12).
func (d decoder) legacySetup() legacySetup {
	s := defaultLegacySetup()
	d.str("base_url", &s.BaseURL)
	s.BaseURL = strings.TrimSpace(s.BaseURL)
	if s.BaseURL != "" && !baseURLRe.MatchString(s.BaseURL) {
		s.BaseURL = ""
	}
	d.str("api_key", &s.APIKey)
	s.APIKey = strings.TrimSpace(s.APIKey)
	d.str("model", &s.Model)
	s.Model = textutil.TruncateRunes(strings.TrimSpace(s.Model), 200)
	d.str("system_prompt", &s.SystemPrompt)
	s.SystemPrompt = textutil.TruncateRunes(s.SystemPrompt, 20000)
	s.Categories = d.legacyCategories()
	d.enum("tool_choice", &s.ToolChoice, "required", "function", "auto")
	d.integer("max_turns", &s.MaxTurns, 1, 5)
	if d.num("temperature", &s.Temperature) {
		s.Temperature = math.Max(0, math.Min(2, s.Temperature))
	}
	d.integer("max_tokens", &s.MaxTokens, 64, 4096)
	d.integer("timeout_ms", &s.TimeoutMs, 1000, 25000)
	d.integer("sample_rate", &s.SampleRate, 1, 100)
	for _, g := range d.strList("group_ids") {
		if id, err := strconv.ParseInt(strings.TrimSpace(g), 10, 64); err == nil && id > 0 {
			s.GroupIDs = append(s.GroupIDs, id)
		}
	}
	for _, p := range d.strList("model_patterns") {
		if p = strings.TrimSpace(p); p != "" {
			s.ModelPatterns = append(s.ModelPatterns, p)
		}
	}
	return s
}

// legacyCategories reads the categories of the 0.1 setup (at most 50,
// invalid and repeated ids dropped).
func (d decoder) legacyCategories() []Category {
	v, ok := d.m["categories"]
	if !ok {
		return nil
	}
	var cats []struct {
		ID          any `json:"id"`
		Description any `json:"description"`
	}
	if json.Unmarshal(v, &cats) != nil {
		return nil
	}
	var out []Category
	seen := map[string]bool{}
	for _, c := range cats {
		id, _ := c.ID.(string)
		desc, _ := c.Description.(string)
		id = strings.TrimSpace(id)
		if !categoryIDRe.MatchString(id) || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, Category{ID: id, Description: textutil.TruncateRunes(strings.TrimSpace(desc), 500)})
		if len(out) == 50 {
			break
		}
	}
	return out
}

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
			if err := p.convertLegacy(ctx, tx, c.legacy); err != nil {
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
		p.log.Info("moderation: converted the 0.1 settings into channel, auditor and flow",
			"groups", len(c.legacy.GroupIDs), "model_patterns", len(c.legacy.ModelPatterns))
		p.configChanged(ctx)
	}
}

func (p *Plugin) convertLegacy(ctx context.Context, tx pgx.Tx, c legacySetup) error {
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
