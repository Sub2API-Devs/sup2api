package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Rule is a model price of a group, or of a segment in a group, as the API
// reads and writes it (CONTRACTS §97).
type Rule struct {
	Kind string `json:"kind"`
	// Multiplier (kind multiplier), a decimal: the list price is the global
	// price times it, and follows the global price when that changes.
	Multiplier *string `json:"multiplier,omitempty"`
	// Mode and Config (kind custom): a price of its own in the mode of the
	// global price, per_token (p, c, cr, cc, cc1h) or per_request (price).
	Mode   string              `json:"mode,omitempty"`
	Config map[string]*float64 `json:"config,omitempty"`
	// Inactive marks a custom price in another mode than the global price has
	// now: it is skipped and the next level prices the model. Output only.
	Inactive bool `json:"inactive,omitempty"`
}

// storedRule is a price_rules row: the rule and, of a custom price, the
// expression generated from its config when it was saved.
type storedRule struct {
	Rule
	scale       decimal.Decimal // Multiplier, as a number
	expression  string
	exprHash    string
	exprVersion int
}

// setScale makes n the multiplier of the rule.
func (r *storedRule) setScale(n decimal.Decimal) {
	text := n.String()
	r.scale, r.Multiplier = n, &text
}

// inactive reports whether the rule does not apply over a global price of
// mode: a custom price keeps the mode it was saved in.
func (r *storedRule) inactive(mode string) bool {
	return r.Kind == core.PriceRuleCustom && r.Mode != mode
}

// view returns the rule as the API shows it over the global price base
// (nil = the model has none).
func (r *storedRule) view(base *PriceDef) *Rule {
	if r == nil {
		return nil
	}
	out := r.Rule
	out.Inactive = base != nil && r.inactive(base.Mode)
	return &out
}

// price returns the list price the rule makes of the global one, with where
// the rule is from: a multiplier leaves the expression and sets Scale; a
// custom price puts its own expression in and keeps the global one as Base.
// ID and VideoOnly are always the global price's. A nil rule is the global
// price as it is, its Source left empty (core.PriceRule.Source).
func (r *storedRule) price(global core.PriceRule, source string) *core.PriceRule {
	if r == nil {
		return &global
	}
	global.Source = source
	if r.Kind == core.PriceRuleMultiplier {
		scale := r.scale
		global.Scale = &scale
		return &global
	}
	global.Base = &core.PriceBase{Expression: global.Expression, ExprHash: global.ExprHash}
	global.Mode, global.Expression, global.ExprHash, global.ExprVersion = r.Mode, r.expression, r.exprHash, r.exprVersion
	return &global
}

// ruleLevels are the rules on one model in one group: that of a segment and
// the group's own.
type ruleLevels struct{ segment, group *storedRule }

// applied returns the first rule that applies over a global price of mode,
// the segment's before the group's, and where the list price then comes from.
// It is the one place the levels are ordered.
func (l ruleLevels) applied(mode string) (*storedRule, string) {
	switch {
	case l.segment != nil && !l.segment.inactive(mode):
		return l.segment, core.PriceSourceSegment
	case l.group != nil && !l.group.inactive(mode):
		return l.group, core.PriceSourceGroup
	}
	return nil, core.PriceSourceGlobal
}

// ruleSet is price rules by what they are on; SegmentID 0 is the group's own
// rule on the model.
type ruleSet map[core.PriceQuery]*storedRule

// levels returns the rules that may price q.
func (rs ruleSet) levels(q core.PriceQuery) ruleLevels {
	l := ruleLevels{group: rs[core.PriceQuery{Model: q.Model, GroupID: q.GroupID}]}
	if q.SegmentID != 0 {
		l.segment = rs[q]
	}
	return l
}

// rulesFor selects the rules that may price the models of a group ($1) for a
// segment ($2): the segment's own and the group's.
const rulesFor = ` WHERE group_id = $1 AND COALESCE(segment_id, $2) = $2`

// loadRules reads the price rules cond selects.
func loadRules(ctx context.Context, q store.Querier, cond string, args ...any) (ruleSet, error) {
	rows, err := q.Query(ctx, `SELECT group_id, COALESCE(segment_id, 0), model, kind, multiplier, COALESCE(mode, ''),
		config, expression, expr_hash FROM price_rules`+cond, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := ruleSet{}
	for rows.Next() {
		var on core.PriceQuery
		var multiplier decimal.NullDecimal
		r := &storedRule{}
		if err := rows.Scan(&on.GroupID, &on.SegmentID, &on.Model, &r.Kind, &multiplier, &r.Mode,
			&r.Config, &r.expression, &r.exprHash); err != nil {
			return nil, err
		}
		if multiplier.Valid {
			r.setScale(multiplier.Decimal)
		}
		if prog, err := expr.CompileCached(r.expression); err == nil {
			r.exprVersion = prog.Version()
		}
		out[on] = r
	}
	return out, rows.Err()
}

// customPrices are the prices a custom rule may set per mode; the first
// required of them must be set. The console checks a rule by the same table
// before it saves.
var customPrices = map[string]struct {
	keys     []string
	required int
}{
	expr.ModePerRequest: {[]string{"price"}, 1},
	expr.ModePerToken:   {tokenPriceKeys, 2},
}

// checkRule validates a rule over the global price of its model (nil = the
// model has none) and returns it as it is stored. The error says why it
// cannot be saved.
func checkRule(ctx context.Context, in Rule, base *PriceDef) (*storedRule, error) {
	if base == nil {
		return nil, errors.New(core.Text(ctx, "the model has no global price", "该模型没有全局价格"))
	}
	switch in.Kind {
	case core.PriceRuleMultiplier:
		scale, ok := core.ParseRate(deref(in.Multiplier))
		if !ok {
			return nil, errors.New(core.Text(ctx, "multiplier must be 0 or more and below 1000000, with at most 4 decimals",
				"倍数必须不小于 0、小于 1000000，最多 4 位小数"))
		}
		r := &storedRule{Rule: Rule{Kind: in.Kind}}
		r.setScale(scale)
		return r, nil
	case core.PriceRuleCustom:
		return checkCustom(ctx, in, base.Mode)
	}
	return nil, errors.New(core.Text(ctx, "rule must be a multiplier or a custom price", "规则必须是倍数或自定义价"))
}

// checkCustom validates a custom price over a global price of mode and
// generates its expression. Only the prices of the mode are kept.
func checkCustom(ctx context.Context, in Rule, mode string) (*storedRule, error) {
	prices, ok := customPrices[mode]
	if !ok {
		return nil, errors.New(core.Text(ctx, "an expression price takes a multiplier only", "表达式计费的模型只能用倍数规则"))
	}
	if in.Mode != mode {
		return nil, fmt.Errorf(core.Text(ctx, "a custom price is %s, as the global price", "自定义价的计费方式须与全局价相同：%s"), mode)
	}
	config := make(map[string]*float64, len(prices.keys))
	for _, key := range prices.keys {
		if v := in.Config[key]; v != nil && *v < 0 {
			return nil, errors.New(core.Text(ctx, "prices must be non-negative numbers", "价格必须为非负数"))
		}
		config[key] = in.Config[key]
	}
	for _, key := range prices.keys[:prices.required] {
		if config[key] == nil {
			return nil, fmt.Errorf(core.Text(ctx, "%s required", "%s 必填"), strings.Join(prices.keys[:prices.required], ", "))
		}
	}
	raw, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}
	src, err := expr.Generate(mode, raw)
	if err != nil {
		return nil, err
	}
	prog, err := expr.CompileCached(src)
	if err != nil {
		return nil, err
	}
	return &storedRule{Rule: Rule{Kind: in.Kind, Mode: mode, Config: config},
		expression: src, exprHash: prog.Hash(), exprVersion: prog.Version()}, nil
}

// saveRule stores the rule on on, replacing the one there. The expression of
// a custom price also goes to model_price_history, as a global price's does:
// a settlement retry reads it back by expr_hash on any node.
func saveRule(ctx context.Context, tx pgx.Tx, on core.PriceQuery, r *storedRule, updatedBy int64) error {
	if r.Kind == core.PriceRuleCustom {
		prog, err := expr.CompileCached(r.expression)
		if err != nil {
			return err
		}
		if err := recordHistory(ctx, tx, prog); err != nil {
			return err
		}
	}
	target := `(group_id, model) WHERE segment_id IS NULL`
	if on.SegmentID != 0 {
		target = `(group_id, segment_id, model) WHERE segment_id IS NOT NULL`
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO price_rules (group_id, segment_id, model, kind, multiplier, mode, config, expression, expr_hash, updated_by)
		VALUES ($1, $2, $3, $4, $5::numeric, NULLIF($6, ''), $7, $8, $9, $10)
		ON CONFLICT `+target+` DO UPDATE SET kind = EXCLUDED.kind, multiplier = EXCLUDED.multiplier,
			mode = EXCLUDED.mode, config = EXCLUDED.config, expression = EXCLUDED.expression,
			expr_hash = EXCLUDED.expr_hash, updated_by = EXCLUDED.updated_by, updated_at = now()`,
		on.GroupID, nullID(on.SegmentID), on.Model, r.Kind, r.Multiplier, r.Mode, r.Config, r.expression, r.exprHash, nullID(updatedBy))
	return err
}

// deleteRule removes the rule on on, if there is one.
func deleteRule(ctx context.Context, tx pgx.Tx, on core.PriceQuery) error {
	_, err := tx.Exec(ctx, `DELETE FROM price_rules WHERE group_id = $1 AND model = $2
		AND segment_id IS NOT DISTINCT FROM $3`, on.GroupID, on.Model, nullID(on.SegmentID))
	return err
}
