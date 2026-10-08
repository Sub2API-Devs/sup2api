package usage

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
	"testing"
	"time"
)

func TestReplacementSettlementDBRetriesFrozenAttempts(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	r := f.record("replacement-db", true)
	r.Price = &core.PriceRule{Expression: `tier("wrong-top",p*99)`, Mode: "expression"}
	r.Tokens = core.UsageTokens{Input: 1_000_000}
	r.CreatedAt = time.Now().Add(-time.Hour)
	r.Replacement = []core.PricedUsage{{Kind: "fallback", Model: "primary", Price: r.Price, Tokens: core.UsageTokens{Input: 1_000_000}, UsageSemantics: "exclusive", RateMultiplier: decimal.NewFromInt(1), Free: true, BillingReason: "refusal_before_output_free_cyber"}, {Kind: "fallback", Model: "fallback", Price: &core.PriceRule{Expression: `tier("actual",p)`, Mode: "expression"}, Tokens: core.UsageTokens{Input: 1_000_000}, UsageSemantics: "exclusive", RateMultiplier: decimal.NewFromInt(1), BillingReason: "completed_attempt"}}
	if e := f.bill.Precharge(ctx, r); e != nil {
		t.Fatal(e)
	}
	f.ledger.fail.Store(1)
	f.svc.process(ctx, []*core.UsageRecord{r})
	if got := f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='replacement-db'`); got != StatusFailed {
		t.Fatal(got)
	}
	r.Replacement[1].Price.Expression = `tier("changed",p*99)`
	if _, e := f.svc.RetryPending(ctx); e != nil {
		t.Fatal(e)
	}
	if got := f.scalar(`SELECT billing_status || ' ' || total_cost::text FROM usage_logs WHERE request_id='replacement-db'`); got != "billed 1.00000000" {
		t.Fatal(got)
	}
	if got := f.scalar(`SELECT billing_detail->'replacement'->0->>'free' FROM usage_logs WHERE request_id='replacement-db'`); got != "true" {
		t.Fatal("free evidence missing", got)
	}
	if !f.balance().Equal(decimal.NewFromInt(9)) {
		t.Fatal("replacement/precharge mismatch", f.balance())
	}
	if _, e := f.svc.RetryPending(ctx); e != nil {
		t.Fatal(e)
	}
	if !f.balance().Equal(decimal.NewFromInt(9)) {
		t.Fatal("duplicate replacement charge")
	}
}
