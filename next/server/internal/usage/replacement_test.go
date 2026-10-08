package usage

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
	"testing"
)

func TestReplacementBillingFreeRefusalSnapshots(t *testing.T) {
	item := core.PricedUsage{Kind: "fallback", Model: "fallback", Price: &core.PriceRule{ID: 4, Expression: `tier("fallback",p*3+c*4)`}, Tokens: core.UsageTokens{Input: 1_000_000, Output: 500_000}, UsageSemantics: "exclusive", RateMultiplier: decimal.NewFromInt(2)}
	free := item
	free.Model = "primary"
	free.Free = true
	free.BillingReason = "refusal_before_output_free_cyber"
	free.Tokens.Output = 0
	p := &pending{Expression: `tier("WRONG_TOP_PRICE",p*100)`, Tokens: core.UsageTokens{Input: 1_000_000}, Rate: decimal.NewFromInt(1), Inputs: pendingInputs{Semantics: "exclusive", Replacement: []core.PricedUsage{free, item}}}
	amount, detail, _, e := priceOf(p)
	if e != nil || !amount.Equal(decimal.NewFromInt(10)) || len(detail.Replacement) != 2 || !detail.Replacement[0].Free {
		t.Fatal(amount, detail, e)
	}
	raw, _ := json.Marshal(pendingDetail{Inputs: p.Inputs})
	var persisted pendingDetail
	if e = json.Unmarshal(raw, &persisted); e != nil {
		t.Fatal(e)
	}
	p.Inputs = persisted.Inputs
	amount, _, _, e = priceOf(p)
	if e != nil || !amount.Equal(decimal.NewFromInt(10)) {
		t.Fatal("retry double counted top", amount, e)
	}
	p.Inputs.Additional = []core.PricedUsage{item}
	amount, _, _, e = priceOf(p)
	if e != nil || !amount.Equal(decimal.NewFromInt(20)) {
		t.Fatal("additional lost", amount, e)
	}
	p.Inputs.Replacement[0].BillingReason = ""
	if _, _, _, e = priceOf(p); e == nil {
		t.Fatal("free without evidence accepted")
	}
}
