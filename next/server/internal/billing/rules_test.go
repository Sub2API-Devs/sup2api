package billing

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func dec(s string) *decimal.Decimal {
	d := decimal.RequireFromString(s)
	return &d
}

func usd(f float64) *float64 { return &f }

func times(n string) *storedRule {
	r := &storedRule{Rule: Rule{Kind: core.PriceRuleMultiplier}}
	r.setScale(decimal.RequireFromString(n))
	return r
}

func customRule(mode, expression string) *storedRule {
	return &storedRule{Rule: Rule{Kind: core.PriceRuleCustom, Mode: mode}, expression: expression, exprHash: "hash of " + expression, exprVersion: 1}
}

// The list price of a query: the segment's rule, the group's rule, the global
// price, first hit; an inactive rule is skipped and nothing applies without a
// global price. The global price comes back as it is, without a source.
func TestSnapshotResolve(t *testing.T) {
	const group, vip, other = 7, 3, 4
	global := core.PriceRule{ID: 11, Model: "m", Mode: "per_token", Expression: `tier("base", p*1 + c*5)`, ExprVersion: 1, ExprHash: "g"}
	video := core.PriceRule{ID: 12, Model: "video", Mode: "expression", Expression: `tier("video", c*7)`, ExprVersion: 1, ExprHash: "v", VideoOnly: true}
	own := customRule("per_token", `tier("base", p*2 + c*3)`)
	stale := customRule("per_request", `tier("base", flat(1))`)

	// with returns the global price as a rule changes it.
	with := func(base core.PriceRule, source string, change func(*core.PriceRule)) *core.PriceRule {
		base.Source = source
		if change != nil {
			change(&base)
		}
		return &base
	}
	scaled := func(n string) func(*core.PriceRule) { return func(r *core.PriceRule) { r.Scale = dec(n) } }
	replaced := func(r *core.PriceRule) {
		r.Base = &core.PriceBase{Expression: r.Expression, ExprHash: r.ExprHash}
		r.Expression, r.ExprHash = own.expression, own.exprHash
	}

	cases := []struct {
		name           string
		ofGroup, ofVIP *storedRule
		q              core.PriceQuery
		want           *core.PriceRule
	}{
		{name: "no rules", q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, "", nil)},
		{name: "a query without group or segment is the global price", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "m"}, want: with(global, "", nil)},
		{name: "a segment alone selects no rule", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "m", SegmentID: vip}, want: with(global, "", nil)},
		{name: "rules of another group", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "m", GroupID: group + 1, SegmentID: vip}, want: with(global, "", nil)},
		{name: "group multiplier", ofGroup: times("1.2"),
			q: core.PriceQuery{Model: "m", GroupID: group}, want: with(global, core.PriceSourceGroup, scaled("1.2"))},
		{name: "group custom", ofGroup: own,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, core.PriceSourceGroup, replaced)},
		{name: "segment multiplier before group custom", ofGroup: own, ofVIP: times("0.8"),
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, core.PriceSourceSegment, scaled("0.8"))},
		{name: "segment custom before group multiplier", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, core.PriceSourceSegment, replaced)},
		{name: "the rule of another segment", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: other}, want: with(global, core.PriceSourceGroup, scaled("1.2"))},
		{name: "a segment rule without the segment", ofVIP: own,
			q: core.PriceQuery{Model: "m", GroupID: group}, want: with(global, "", nil)},
		{name: "multiplier 0 is free", ofGroup: times("0"),
			q: core.PriceQuery{Model: "m", GroupID: group}, want: with(global, core.PriceSourceGroup, scaled("0"))},
		{name: "segment multiplier 1 hides the group's rule", ofGroup: times("2"), ofVIP: times("1"),
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, core.PriceSourceSegment, scaled("1"))},
		{name: "inactive segment custom falls to the group", ofGroup: times("1.2"), ofVIP: stale,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, core.PriceSourceGroup, scaled("1.2"))},
		{name: "inactive group custom falls to the global price", ofGroup: stale,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, "", nil)},
		{name: "both inactive", ofGroup: stale, ofVIP: stale,
			q: core.PriceQuery{Model: "m", GroupID: group, SegmentID: vip}, want: with(global, "", nil)},
		{name: "a custom price never applies to an expression price", ofGroup: own, ofVIP: times("0.5"),
			q: core.PriceQuery{Model: "video", GroupID: group}, want: with(video, "", nil)},
		{name: "a multiplier keeps the video admission", ofGroup: own, ofVIP: times("0.5"),
			q: core.PriceQuery{Model: "video", GroupID: group, SegmentID: vip}, want: with(video, core.PriceSourceSegment, scaled("0.5"))},
		{name: "no global price, no rule", ofGroup: times("1.2"), ofVIP: own,
			q: core.PriceQuery{Model: "unpriced", GroupID: group, SegmentID: vip}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			snap := &priceSnapshot{byModel: map[string]core.PriceRule{"m": global, "video": video}, rules: ruleSet{}}
			for _, model := range []string{"m", "video", "unpriced"} {
				if tc.ofGroup != nil {
					snap.rules[core.PriceQuery{Model: model, GroupID: group}] = tc.ofGroup
				}
				if tc.ofVIP != nil {
					snap.rules[core.PriceQuery{Model: model, GroupID: group, SegmentID: vip}] = tc.ofVIP
				}
			}
			got := snap.resolve(tc.q)
			if tc.want == nil {
				require.Nil(t, got)
				return
			}
			require.Equal(t, tc.want.Scale == nil, got.Scale == nil)
			if tc.want.Scale != nil {
				require.True(t, tc.want.Scale.Equal(*got.Scale), "scale %s", got.Scale)
				got.Scale = tc.want.Scale
			}
			require.Equal(t, tc.want, got)
		})
	}
}

// What a caller does to a resolved price stays out of the snapshot.
func TestSnapshotResolveCopies(t *testing.T) {
	global := core.PriceRule{ID: 1, Model: "m", Mode: "per_token", Expression: "p", ExprHash: "g"}
	rule := times("1.2")
	snap := &priceSnapshot{byModel: map[string]core.PriceRule{"m": global},
		rules: ruleSet{{Model: "m", GroupID: 7}: rule}}
	got := snap.resolve(core.PriceQuery{Model: "m", GroupID: 7})
	*got.Scale = decimal.NewFromInt(9)
	got.Expression = "changed"
	require.Equal(t, "1.2", rule.scale.String())
	require.Equal(t, "p", snap.byModel["m"].Expression)
	require.Equal(t, "", snap.byModel["m"].Source)
}

func TestCheckRule(t *testing.T) {
	perToken := &PriceDef{Mode: "per_token"}
	perRequest := &PriceDef{Mode: "per_request"}
	expression := &PriceDef{Mode: "expression"}
	multiplier := func(n string) Rule { return Rule{Kind: "multiplier", Multiplier: &n} }
	tokens := func(config map[string]*float64) Rule { return Rule{Kind: "custom", Mode: "per_token", Config: config} }

	cases := []struct {
		name    string
		rule    Rule
		base    *PriceDef
		wantErr string
		// What is stored of a rule that passes.
		wantMultiplier string
		wantConfig     map[string]*float64
		wantExpression string
	}{
		{name: "no global price", rule: multiplier("1"), wantErr: "no global price"},
		{name: "unknown kind", rule: Rule{Kind: "discount"}, base: perToken, wantErr: "a multiplier or a custom price"},
		{name: "multiplier", rule: multiplier("1.20"), base: expression, wantMultiplier: "1.2"},
		{name: "multiplier 0", rule: multiplier("0"), base: perToken, wantMultiplier: "0"},
		{name: "multiplier 1", rule: multiplier("1"), base: perToken, wantMultiplier: "1"},
		{name: "largest multiplier", rule: multiplier("999999.9999"), base: perToken, wantMultiplier: "999999.9999"},
		{name: "multiplier missing", rule: Rule{Kind: "multiplier"}, base: perToken, wantErr: "multiplier must be"},
		{name: "multiplier negative", rule: multiplier("-0.1"), base: perToken, wantErr: "multiplier must be"},
		{name: "multiplier too large", rule: multiplier("1000000"), base: perToken, wantErr: "below 1000000"},
		{name: "multiplier too fine", rule: multiplier("1.00001"), base: perToken, wantErr: "at most 4 decimals"},
		{name: "multiplier that is no number", rule: multiplier("much"), base: perToken, wantErr: "multiplier must be"},
		{name: "custom over an expression price", rule: tokens(map[string]*float64{"p": usd(1), "c": usd(2)}), base: expression, wantErr: "multiplier only"},
		{name: "custom in another mode", rule: tokens(map[string]*float64{"p": usd(1), "c": usd(2)}), base: perRequest, wantErr: "a custom price is per_request"},
		{name: "custom without a mode", rule: Rule{Kind: "custom", Config: map[string]*float64{"price": usd(1)}}, base: perRequest, wantErr: "a custom price is per_request"},
		{name: "custom negative price", rule: tokens(map[string]*float64{"p": usd(1), "c": usd(2), "cr": usd(-1)}), base: perToken, wantErr: "non-negative"},
		{name: "custom without output price", rule: tokens(map[string]*float64{"p": usd(1), "cr": usd(1)}), base: perToken, wantErr: "p, c required"},
		{name: "custom without config", rule: Rule{Kind: "custom", Mode: "per_request"}, base: perRequest, wantErr: "price required"},
		{name: "custom per token keeps the prices of the mode", base: perToken,
			rule:           tokens(map[string]*float64{"p": usd(0.8), "c": usd(4), "cr": usd(0.08), "price": usd(9)}),
			wantConfig:     map[string]*float64{"p": usd(0.8), "c": usd(4), "cr": usd(0.08), "cc": nil, "cc1h": nil},
			wantExpression: `tier("base", p*0.8 + c*4 + cr*0.08)`},
		{name: "custom per request, free", base: perRequest,
			rule:           Rule{Kind: "custom", Mode: "per_request", Config: map[string]*float64{"price": usd(0)}, Inactive: true},
			wantConfig:     map[string]*float64{"price": usd(0)},
			wantExpression: `tier("base", flat(0))`},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := checkRule(context.Background(), tc.rule, tc.base)
			if tc.wantErr != "" {
				require.ErrorContains(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			require.Equal(t, tc.rule.Kind, got.Kind)
			require.False(t, got.Inactive)
			if tc.rule.Kind == core.PriceRuleMultiplier {
				require.Equal(t, tc.wantMultiplier, *got.Multiplier)
				require.Equal(t, tc.wantMultiplier, got.scale.String())
				require.Empty(t, got.expression)
				return
			}
			require.Equal(t, tc.base.Mode, got.Mode)
			require.Equal(t, tc.wantConfig, got.Config)
			require.Equal(t, tc.wantExpression, got.expression)
			require.NotEmpty(t, got.exprHash)
			require.Equal(t, 1, got.exprVersion)
		})
	}
	_, err := checkRule(core.WithLocale(context.Background(), "zh"), Rule{Kind: "custom", Mode: "per_token"}, perToken)
	require.EqualError(t, err, "p, c 必填")
}

// Precharge charges at the rate times the scale of the rule, as settlement does.
func TestQuoteRecordAppliesRuleScale(t *testing.T) {
	r := &core.UsageRecord{
		Price:          &core.PriceRule{Expression: `tier("main", p*2)`, Scale: dec("0.5")},
		UsageSemantics: "exclusive", Tokens: core.UsageTokens{Input: 1_000_000}, RateMultiplier: decimal.NewFromInt(3),
		Additional: []core.PricedUsage{{Kind: "advisor", Model: "other", Price: &core.PriceRule{Expression: `tier("other", c*10)`, Scale: dec("0")},
			UsageSemantics: "exclusive", Tokens: core.UsageTokens{Output: 1_000_000}, RateMultiplier: decimal.NewFromInt(3)}},
	}
	amount, err := quoteRecord(context.Background(), &Service{}, r)
	require.NoError(t, err)
	require.Equal(t, "3", amount.String())
}
