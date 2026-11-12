package billing

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Global prices a multiplier may be on.
var (
	handWrittenPrice = PriceDef{Mode: "expression", Config: json.RawMessage(`{}`),
		Expression: `tier("base", p*3 + c*15) ||| param("fast") == true ? 2 : 1`}
	perTokenPrice = PriceDef{Mode: "per_token", Config: json.RawMessage(`{"p": 1, "c": 5}`), Expression: `tier("base", p*1 + c*5)`}
	tieredPrice   = PriceDef{Mode: "expression",
		Config: json.RawMessage(`{"tiers": [{"name": "standard", "max_len": 200000, "p": 3, "c": 15},
			{"name": "long", "max_len": null, "p": 6, "c": 22.5}]}`),
		Expression: `len <= 200000 ? tier("standard", p*3 + c*15) : tier("long", p*6 + c*22.5)`}
)

// videoTemplate is a video price with the expression generated from it.
func videoTemplate(t *testing.T) PriceDef {
	t.Helper()
	p := PriceDef{Mode: "expression", Config: json.RawMessage(`{"video": {"price_per_million_tokens": 7, "video_price_per_second": 0.2,
		"resolution_prices": [{"sizes": ["1920x1080"], "price_per_million_tokens": 9}]}}`)}
	var err error
	p.Expression, err = expr.Generate(p.Mode, p.Config)
	require.NoError(t, err)
	return p
}

// The list price a rule makes of a global price, as the pricing endpoints
// show it: a multiplier goes beside the global price, which stays as it is.
func TestListPrice(t *testing.T) {
	scaled := func(base PriceDef, n string) PriceDef {
		base.Multiplier = dec(n)
		return base
	}
	videoPrice := videoTemplate(t)
	own := &storedRule{Rule: Rule{Kind: core.PriceRuleCustom, Mode: "per_token", Config: map[string]*float64{"p": usd(0.8), "c": usd(4), "cr": nil}},
		expression: `tier("base", p*0.8 + c*4)`}
	cases := []struct {
		name string
		base PriceDef
		rule string // the multiplier of the rule; "" = no rule
		want PriceDef
	}{
		{"no rule", handWrittenPrice, "", handWrittenPrice},
		{"per token", perTokenPrice, "1.20", scaled(perTokenPrice, "1.2")},
		{"multiplier 0", perTokenPrice, "0", scaled(perTokenPrice, "0")},
		{"multiplier 1", perTokenPrice, "1", scaled(perTokenPrice, "1")},
		{"tiers", tieredPrice, "0.5", scaled(tieredPrice, "0.5")},
		{"video template", videoPrice, "2", scaled(videoPrice, "2")},
		{"hand-written expression", handWrittenPrice, "2", scaled(handWrittenPrice, "2")},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var rule *storedRule
			if tc.rule != "" {
				rule = times(tc.rule)
			}
			require.Equal(t, jsonOf(t, tc.want), jsonOf(t, listPrice(tc.base, rule)))
		})
	}
	t.Run("custom price", func(t *testing.T) {
		require.JSONEq(t, `{"mode": "per_token", "config": {"p": 0.8, "c": 4, "cr": null}, "expression": "tier(\"base\", p*0.8 + c*4)"}`,
			jsonOf(t, listPrice(perTokenPrice, own)))
	})
	// The multiplier is a decimal string without trailing zeros, there only
	// under a multiplier rule.
	require.JSONEq(t, `{"mode": "per_token", "config": {"p": 1, "c": 5}, "expression": "tier(\"base\", p*1 + c*5)"}`,
		jsonOf(t, listPrice(perTokenPrice, nil)))
	require.JSONEq(t, `{"mode": "per_token", "config": {"p": 1, "c": 5}, "expression": "tier(\"base\", p*1 + c*5)", "multiplier": "1.2"}`,
		jsonOf(t, listPrice(perTokenPrice, times("1.20"))))
	require.JSONEq(t, `{"mode": "per_token", "config": {"p": 1, "c": 5}, "expression": "tier(\"base\", p*1 + c*5)", "multiplier": "0"}`,
		jsonOf(t, listPrice(perTokenPrice, times("0"))))
}

func jsonOf(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	require.NoError(t, err)
	return string(b)
}

// costOf evaluates an expression for a million input and output tokens.
func costOf(t *testing.T, expression string) string {
	t.Helper()
	prog, err := expr.Compile(expression)
	require.NoError(t, err)
	var in expr.Input
	in.Vars.Set("p", 1_000_000)
	in.Vars.Set("c", 1_000_000)
	res, err := prog.Eval(in)
	require.NoError(t, err)
	return res.Cost.String()
}

// What a downstream sup2api imports is the whole list price: the multiplier
// that listPrice leaves beside the price goes into it, into the config where
// there is one to scale and else into the expression, as a rule.
func TestExportPrice(t *testing.T) {
	handWritten := PriceDef{Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15)`}
	stale := customRule("per_request", `tier("base", flat(1))`)
	videoPrice := videoTemplate(t)

	p, err := exportPrice("m", handWritten, ruleLevels{group: times("1.2")})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15) ||| true ? 1.2 : 1`}, p)
	require.NoError(t, p.compile())

	p, err = exportPrice("m", perTokenPrice, ruleLevels{segment: times("0.5"), group: times("1.2")})
	require.NoError(t, err)
	require.Equal(t, `tier("base", p*0.5 + c*2.5)`, p.Expression)
	require.JSONEq(t, `{"p": 0.5, "c": 2.5}`, string(p.Config))

	p, err = exportPrice("m", perTokenPrice, ruleLevels{segment: stale})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: perTokenPrice.Mode, Config: perTokenPrice.Config, Expression: perTokenPrice.Expression}, p)

	// Free: a rule that makes the expression cost nothing.
	p, err = exportPrice("m", handWritten, ruleLevels{group: times("0")})
	require.NoError(t, err)
	require.Equal(t, `tier("base", p*3 + c*15) ||| true ? 0 : 1`, p.Expression)
	require.Equal(t, "18", costOf(t, handWritten.Expression))
	require.Equal(t, "0", costOf(t, p.Expression))

	// A multiplier of 1 changes nothing: no rule is appended.
	p, err = exportPrice("m", handWritten, ruleLevels{group: times("1.0")})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: handWritten.Mode, Config: handWritten.Config, Expression: handWritten.Expression}, p)

	// Tiers are not scaled in the config: the expression is the price, and
	// the config of an expression price may lag behind it.
	p, err = exportPrice("m", tieredPrice, ruleLevels{group: times("0.5")})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: "expression", Config: json.RawMessage(`{}`), Expression: tieredPrice.Expression + ` ||| true ? 0.5 : 1`}, p)

	// A video template is scaled in its config, the expression generated
	// from it; it cannot be free, so that goes into a rule.
	p, err = exportPrice("m", videoPrice, ruleLevels{group: times("2")})
	require.NoError(t, err)
	require.JSONEq(t, `{"video": {"price_per_million_tokens": 14, "video_price_per_second": 0.4,
		"resolution_prices": [{"sizes": ["1920x1080"], "price_per_million_tokens": 18}]}}`, string(p.Config))
	want, err := expr.Generate(p.Mode, p.Config)
	require.NoError(t, err)
	require.Equal(t, want, p.Expression)
	require.NotEqual(t, videoPrice.Expression, p.Expression)
	p, err = exportPrice("m", videoPrice, ruleLevels{group: times("0")})
	require.NoError(t, err)
	require.Equal(t, syncPrice{Model: "m", Mode: "expression", Config: json.RawMessage(`{}`), Expression: videoPrice.Expression + ` ||| true ? 0 : 1`}, p)

	// Text after a comment with an odd number of quotes is no rule: the price
	// cannot carry the multiplier, and is not exported without it.
	for _, comment := range []string{`// don't`, `// 3" display`, "// a `tick"} {
		quoted := PriceDef{Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15) ` + comment}
		_, err = exportPrice("m", quoted, ruleLevels{group: times("2")})
		require.Error(t, err, comment)
		_, err = exportPrice("m", quoted, ruleLevels{})
		require.NoError(t, err, comment)
	}
	// A comment without one takes the rule.
	p, err = exportPrice("m", PriceDef{Mode: "expression", Config: json.RawMessage(`{}`), Expression: `tier("base", p*3 + c*15) // list`},
		ruleLevels{group: times("2")})
	require.NoError(t, err)
	require.Equal(t, "36", costOf(t, p.Expression))
}
