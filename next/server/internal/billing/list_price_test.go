package billing

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The list price a rule makes of a global price, as the pricing endpoints
// show it.
func TestListPrice(t *testing.T) {
	handWritten := PriceDef{Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15) ||| param("fast") == true ? 2 : 1`}
	cases := []struct {
		name string
		base PriceDef
		rule *storedRule
		// The list price; "" = the global price, as it is.
		wantConfig, wantExpression string
		// Whether the multiplier is left to the rule.
		notApplied bool
	}{
		{name: "no rule", base: handWritten},
		{name: "per request",
			base: PriceDef{Mode: "per_request", Config: json.RawMessage(`{"price": 0.01}`), Expression: `tier("base", flat(0.01))`},
			rule: times("1.5"), wantConfig: `{"price": 0.015}`, wantExpression: `tier("base", flat(0.015))`},
		{name: "per token: unset prices stay unset, numeric strings are prices",
			base: PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 0.1, "c": "5", "cr": null, "note": "kept"}`)},
			rule: times("0.3"), wantConfig: `{"p": 0.03, "c": 1.5, "cr": null, "note": "kept"}`, wantExpression: `tier("base", p*0.03 + c*1.5)`},
		{name: "multiplier 0",
			base: PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 1, "c": 5}`)},
			rule: times("0"), wantConfig: `{"p": 0, "c": 0}`, wantExpression: `tier("base", p*0 + c*0)`},
		{name: "multiplier 1",
			base: PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 1, "c": 5}`)},
			rule: times("1"), wantConfig: `{"p": 1, "c": 5}`, wantExpression: `tier("base", p*1 + c*5)`},
		{name: "tiers: prices and flat fees, not lengths or surcharges",
			base: PriceDef{Mode: "expression", Expression: "stale", Config: json.RawMessage(`{
				"tiers": [{"name": "standard", "max_len": 200000, "p": 3, "c": 15, "flat": 0.01},
				          {"name": "long", "max_len": null, "prices": {"p": 6, "c": 22.5, "cr": 0.6}}],
				"rules": [{"kind": "header", "name": "x-fast", "op": "eq", "value": "1", "multiplier": 2}]}`)},
			rule: times("0.5"),
			wantConfig: `{
				"tiers": [{"name": "standard", "max_len": 200000, "p": 1.5, "c": 7.5, "flat": 0.005},
				          {"name": "long", "max_len": null, "prices": {"p": 3, "c": 11.25, "cr": 0.3}}],
				"rules": [{"kind": "header", "name": "x-fast", "op": "eq", "value": "1", "multiplier": 2}]}`,
			wantExpression: `len <= 200000 ? tier("standard", flat(0.005) + p*1.5 + c*7.5) : tier("long", p*3 + c*11.25 + cr*0.3) ||| header("x-fast") == "1" ? 2 : 1`},
		{name: "video template",
			base: PriceDef{Mode: "expression", Config: json.RawMessage(`{"video": {"price_per_million_tokens": 7, "video_price_per_second": 0.2,
				"resolution_prices": [{"sizes": ["1920x1080"], "price_per_million_tokens": 9}]}}`)},
			rule: times("2"),
			wantConfig: `{"video": {"price_per_million_tokens": 14, "video_price_per_second": 0.4,
				"resolution_prices": [{"sizes": ["1920x1080"], "price_per_million_tokens": 18}]}}`},
		{name: "a hand-written expression is not rewritten", base: handWritten, rule: times("2"), notApplied: true},
		{name: "a video template cannot be free", notApplied: true,
			base: PriceDef{Mode: "expression", Config: json.RawMessage(`{"video": {"price_per_million_tokens": 7}}`), Expression: "kept"},
			rule: times("0")},
		{name: "custom price",
			base: PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 1, "c": 5}`), Expression: `tier("base", p*1 + c*5)`},
			rule: &storedRule{Rule: Rule{Kind: core.PriceRuleCustom, Mode: "per_token", Config: map[string]*float64{"p": usd(0.8), "c": usd(4), "cr": nil}},
				expression: `tier("base", p*0.8 + c*4)`},
			wantConfig: `{"p": 0.8, "c": 4, "cr": null}`, wantExpression: `tier("base", p*0.8 + c*4)`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, applied := listPrice(tc.base, tc.rule)
			require.Equal(t, !tc.notApplied, applied)
			if tc.wantConfig == "" {
				require.Equal(t, tc.base, got)
				return
			}
			require.Equal(t, tc.base.Mode, got.Mode)
			require.JSONEq(t, tc.wantConfig, string(got.Config))
			if tc.wantExpression != "" {
				require.Equal(t, tc.wantExpression, got.Expression)
			}
			_, err := expr.Compile(got.Expression)
			require.NoError(t, err)
		})
	}
}

// What a downstream sup2api imports is the whole list price: a multiplier
// that listPrice leaves in the rule goes into the expression.
func TestExportPrice(t *testing.T) {
	handWritten := PriceDef{Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15)`}
	perToken := PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 1, "c": 5}`), Expression: `tier("base", p*1 + c*5)`}
	stale := customRule("per_request", `tier("base", flat(1))`)

	p, _, err := exportPrice("m", handWritten, ruleLevels{group: times("1.2")})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15) ||| true ? 1.2 : 1`}, p)
	require.NoError(t, p.compile())

	p, _, err = exportPrice("m", perToken, ruleLevels{segment: times("0.5"), group: times("1.2")})
	require.NoError(t, err)
	require.Equal(t, `tier("base", p*0.5 + c*2.5)`, p.Expression)
	require.JSONEq(t, `{"p": 0.5, "c": 2.5}`, string(p.Config))

	p, _, err = exportPrice("m", perToken, ruleLevels{segment: stale})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: perToken.Mode, Config: perToken.Config, Expression: perToken.Expression}, p)
}
