package usage

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
	"testing"
)

func TestAdditionalPriceSnapshotsSurviveRetryAndKeepMainSeparate(t *testing.T) {
	item := core.PricedUsage{Kind: "advisor", Model: "extra", Price: &core.PriceRule{ID: 9, Expression: `tier("extra",p*10+c*20) ||| header("premium") == "yes" ? 2 : 1`}, Tokens: core.UsageTokens{Input: 1_000_000, Output: 500_000}, UsageSemantics: "exclusive", PriceHeaders: map[string]string{"premium": "yes"}, RateMultiplier: decimal.NewFromInt(3)}
	p := &pending{Expression: `tier("main",p*2+c*4)`, Tokens: core.UsageTokens{Input: 1_000_000, Output: 500_000}, Rate: decimal.NewFromInt(2), Inputs: pendingInputs{Semantics: "exclusive", Additional: []core.PricedUsage{item}}}
	total, detail, _, err := priceOf(p)
	if err != nil {
		t.Fatal(err)
	}
	if !total.Equal(decimal.NewFromInt(128)) || len(detail.Additional) != 1 || detail.Breakdown.Vars.P != 1_000_000 {
		t.Fatal(total, detail)
	}
	raw, _ := json.Marshal(pendingDetail{Inputs: p.Inputs})
	var persisted pendingDetail
	if err := json.Unmarshal(raw, &persisted); err != nil {
		t.Fatal(err)
	}
	p.Inputs = persisted.Inputs
	again, _, _, err := priceOf(p)
	if err != nil || !again.Equal(total) {
		t.Fatal("retry changed frozen price", again, err)
	}
	p.Expression = ""
	freeMain, _, _, err := priceOf(p)
	if err != nil || !freeMain.Equal(decimal.NewFromInt(120)) {
		t.Fatal("free main lost extra fee", freeMain, err)
	}
	p.Inputs.BillingError = "untrusted model"
	if _, _, _, err := priceOf(p); err == nil {
		t.Fatal("blocked usage charged")
	}
}

func TestAdditionalPricingFailureIsAtomicAndRecordedPending(t *testing.T) {
	rec := &core.UsageRecord{Billable: true, Additional: []core.PricedUsage{{Kind: "advisor", Model: "extra", Price: &core.PriceRule{Expression: "invalid ("}, UsageSemantics: "exclusive", RateMultiplier: decimal.NewFromInt(1)}}}
	if initialStatus(rec) != StatusPending {
		t.Fatal("free primary hid additional work")
	}
	if amount, _, _, err := priceOf(fromRecord(rec)); err == nil || !amount.IsZero() {
		t.Fatal("partial amount returned on pricing failure", amount, err)
	}
	rec.Additional = nil
	rec.BillingError = "missing usage"
	if initialStatus(rec) != StatusPending {
		t.Fatal("billing error silently free")
	}
}
