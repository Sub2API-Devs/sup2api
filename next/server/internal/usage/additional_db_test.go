package usage

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
	"testing"
	"time"
)

func TestAdditionalSettlementDBRetriesFrozenFreePrimary(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	r := f.record("additional-db", true)
	r.Price = nil
	r.Tokens = core.UsageTokens{}
	r.CreatedAt = time.Now().Add(-time.Hour)
	r.Additional = []core.PricedUsage{{Kind: "advisor", Model: "other-model", Price: &core.PriceRule{Expression: `tier("extra",p)`, Mode: "expression"}, UsageSemantics: "exclusive", Tokens: core.UsageTokens{Input: 1_000_000}, RateMultiplier: decimal.NewFromInt(1)}}
	if err := f.bill.Precharge(ctx, r); err != nil {
		t.Fatal(err)
	}
	f.ledger.fail.Store(1)
	f.svc.process(ctx, []*core.UsageRecord{r})
	if f.ledger.fail.Load() != 0 {
		t.Fatal("settlement did not reach the failing ledger")
	}
	if got := f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='additional-db'`); got != StatusFailed {
		t.Fatal(got)
	}
	// Mutating the caller's object cannot alter the persisted retry snapshot.
	r.Additional[0].Price.Expression = `tier("changed",p*99)`
	if _, err := f.svc.RetryPending(ctx); err != nil {
		t.Fatal(err)
	}
	if got := f.scalar(`SELECT billing_status || ' ' || total_cost::text FROM usage_logs WHERE request_id='additional-db'`); got != "billed 1.00000000" {
		t.Fatal(got)
	}
	if !f.balance().Equal(decimal.NewFromInt(9)) {
		t.Fatal("precharge/settlement mismatch", f.balance())
	}
	if got := f.scalar(`SELECT billing_detail->'additional'->0->>'model' FROM usage_logs WHERE request_id='additional-db'`); got != "other-model" {
		t.Fatal("detail lost", got)
	}
	if _, err := f.svc.RetryPending(ctx); err != nil {
		t.Fatal(err)
	}
	if !f.balance().Equal(decimal.NewFromInt(9)) {
		t.Fatal("double charged retry")
	}
}
