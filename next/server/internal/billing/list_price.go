package billing

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// PriceDef is a price as the pricing endpoints return it: a global model
// price, or the list price a price rule makes of one (CONTRACTS §97).
type PriceDef struct {
	Mode       string          `json:"mode"`
	Config     json.RawMessage `json:"config"`
	Expression string          `json:"expression"`
}

// listPrice returns the list price rule makes of the global price base, as
// the pricing endpoints show it. A custom rule is a price of its own. A
// multiplier scales the prices of a visual config (scaleConfig); a
// hand-written expression is never rewritten: it is returned as it is with
// applied false, the multiplier staying in the rule. It is the one place a
// rule becomes a price to show.
func listPrice(base PriceDef, rule *storedRule) (price PriceDef, applied bool) {
	switch {
	case rule == nil:
		return base, true
	case rule.Kind == core.PriceRuleCustom:
		config, _ := json.Marshal(rule.Config)
		return PriceDef{Mode: rule.Mode, Config: config, Expression: rule.expression}, true
	}
	config, expression, ok := scaleConfig(base.Mode, base.Config, rule.scale)
	if !ok {
		return base, false
	}
	return PriceDef{Mode: base.Mode, Config: config, Expression: expression}, true
}

// Prices of a visual config: those of a per-token price, of a tier (with its
// flat fee) and of a video template.
var (
	tokenPriceKeys = []string{"p", "c", "cr", "cc", "cc1h"}
	tierPriceKeys  = []string{"p", "c", "cr", "cc", "cc1h", "flat"}
	videoPriceKeys = []string{"price_per_million_tokens", "video_input_price_per_million_tokens", "video_price_per_second"}
)

// scaleConfig multiplies the prices of a visual price config by m (the
// per-request price, the token prices, those of every tier, or those of a
// video template; tier lengths and surcharge rules stay) and generates the
// expression of the result. ok is false for a price without such a config (a
// hand-written expression) and for one m leaves without a valid config: these
// cannot be scaled short of rewriting the expression.
func scaleConfig(mode string, config json.RawMessage, m decimal.Decimal) (scaled json.RawMessage, expression string, ok bool) {
	var cfg map[string]any
	dec := json.NewDecoder(bytes.NewReader(config))
	dec.UseNumber()
	if dec.Decode(&cfg) != nil || cfg == nil {
		return nil, "", false
	}
	switch {
	case mode == expr.ModePerRequest:
		scaleKeys(cfg, m, "price")
	case mode == expr.ModePerToken:
		scaleKeys(cfg, m, tokenPriceKeys...)
	case mode == expr.ModeExpression && (scaleVideo(cfg, m) || scaleTiers(cfg, m)):
	default:
		return nil, "", false
	}
	scaled, err := json.Marshal(cfg)
	if err != nil {
		return nil, "", false
	}
	if expression, err = expr.Generate(mode, scaled); err != nil {
		return nil, "", false
	}
	return scaled, expression, true
}

// scaleKeys multiplies the numbers under keys in entry by m; anything else
// (an unset price) stays.
func scaleKeys(entry map[string]any, m decimal.Decimal, keys ...string) {
	for _, key := range keys {
		if d, err := decimal.NewFromString(fmt.Sprint(entry[key])); err == nil {
			entry[key] = json.Number(d.Mul(m).String())
		}
	}
}

// scaleVideo scales every per-video price of a video template. It reports
// whether cfg is one.
func scaleVideo(cfg map[string]any, m decimal.Decimal) bool {
	video, ok := cfg["video"].(map[string]any)
	if !ok {
		return false
	}
	scaleKeys(video, m, videoPriceKeys...)
	rows, _ := video["resolution_prices"].([]any)
	for _, row := range rows {
		if r, ok := row.(map[string]any); ok {
			scaleKeys(r, m, videoPriceKeys...)
		}
	}
	return true
}

// scaleTiers scales the prices of every tier, given on the tier or under its
// "prices". It reports whether cfg has tiers.
func scaleTiers(cfg map[string]any, m decimal.Decimal) bool {
	tiers, _ := cfg["tiers"].([]any)
	for _, t := range tiers {
		tier, ok := t.(map[string]any)
		if !ok {
			continue
		}
		scaleKeys(tier, m, tierPriceKeys...)
		if prices, ok := tier["prices"].(map[string]any); ok {
			scaleKeys(prices, m, tokenPriceKeys...)
		}
	}
	return len(tiers) > 0
}
