package billing

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
	"testing"
)

func TestAdditionalPrechargeQuotesIndependentComponents(t *testing.T) {
	s := &Service{}
	r := &core.UsageRecord{Price: &core.PriceRule{Expression: `tier("main",p*2)`}, UsageSemantics: "exclusive", Tokens: core.UsageTokens{Input: 1_000_000}, RateMultiplier: decimal.NewFromInt(1), Additional: []core.PricedUsage{{Kind: "advisor", Model: "other", Price: &core.PriceRule{Expression: `tier("other",c*10)`}, UsageSemantics: "exclusive", Tokens: core.UsageTokens{Output: 500_000}, RateMultiplier: decimal.NewFromInt(2)}}}
	amount, err := quoteRecord(context.Background(), s, r)
	if err != nil || !amount.Equal(decimal.NewFromInt(12)) {
		t.Fatal(amount, err)
	}
	r.Price = nil
	amount, err = quoteRecord(context.Background(), s, r)
	if err != nil || !amount.Equal(decimal.NewFromInt(10)) {
		t.Fatal("free main hid extras", amount, err)
	}
	r.Additional[0].Tokens.Output = -1
	if _, err := quoteRecord(context.Background(), s, r); err == nil {
		t.Fatal("invalid count quoted")
	}
}
