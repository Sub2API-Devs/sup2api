package usage

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
)

// A fixed submission fee is ordinary usage, not a reservation for future
// reconciliation. It must take the ordinary immediate settlement path.
func TestTaskImmediateBillingWithoutReservationAndRetry(t *testing.T) {
	f := newFixture(t)
	ctx := context.Background()
	const expression = "flat(0.25)"
	hash := expr.Hash(expression)
	if _, err := f.db.Pool.Exec(ctx, `INSERT INTO model_price_history(expr_hash,expression,expr_version) VALUES($1,$2,1)`, hash, expression); err != nil {
		t.Fatal(err)
	}
	register := func(request string, free bool) string {
		t.Helper()
		r := f.reserved(request, "raw-"+request, core.UsageTokens{})
		r.Reservation = nil
		r.Price = &core.PriceRule{Mode: "per_request", Expression: expression, ExprHash: hash, ExprVersion: 1}
		if free {
			r.Billable = false
			r.Price = nil
		}
		id, err := f.svc.BeginTask(ctx, core.TaskIntent{RequestID: request, PluginKey: r.PluginKey, Kind: "video", Model: r.Model, Protocol: r.Protocol,
			UserID: r.UserID, APIKeyID: r.APIKeyID, GroupID: r.GroupID, AccountID: *r.AccountID})
		if err != nil {
			t.Fatal(err)
		}
		body := []byte(`{"id":"raw-` + request + `","status":"queued"}`)
		if err = f.svc.ReceiveTask(ctx, request, 200, body, ""); err != nil {
			t.Fatal(err)
		}
		if err = f.svc.RegisterTask(ctx, core.TaskRegistration{PublicID: id, UpstreamID: "raw-" + request, Kind: "video", Snapshot: body, IDPaths: []string{"id"}, Deadline: time.Hour, Record: r}); err != nil {
			t.Fatal("registered task must remain successful after a settlement failure", err)
		}
		if _, err = f.svc.FindTask(ctx, core.TaskQuery{ID: id, PluginKey: r.PluginKey, Kind: "video", UserID: r.UserID, GroupID: r.GroupID}); err != nil {
			t.Fatal("committed task disappeared", err)
		}
		return id
	}
	before := f.balance()
	id := register("fixed-fee", false)
	if got := f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='fixed-fee'`); got != StatusBilled {
		t.Fatalf("fixed task fee was not settled immediately: %s", got)
	}
	fee := decimal.RequireFromString("0.25")
	if !before.Sub(f.balance()).Equal(fee) || !f.cost("fixed-fee").Equal(fee) {
		t.Fatal("fixed task fee was not charged exactly once")
	}
	if f.scalar(`SELECT count(*) FROM pending_settlements WHERE task_public_id=$1`, id) != "0" {
		t.Fatal("fixed fee created an unnecessary reservation")
	}

	// The receipt and task already committed. A temporary settlement error
	// cannot turn registration into a retryable submission error.
	f.ledger.fail.Store(1)
	before = f.balance()
	register("retry-fixed-fee", false)
	if f.ledger.fail.Load() != 0 {
		t.Fatal("registration bypassed immediate settlement")
	}
	if f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='retry-fixed-fee'`) != StatusFailed {
		t.Fatal("failed settlement was not queued for retry")
	}
	if !f.balance().Equal(before) {
		t.Fatal("rolled-back settlement charged money")
	}
	if n, err := f.svc.RetryPending(ctx); err != nil || n != 1 {
		t.Fatal("retry failed", n, err)
	}
	if !before.Sub(f.balance()).Equal(fee) {
		t.Fatal("retry did not charge the fee once")
	}
	if n, err := f.svc.RetryPending(ctx); err != nil || n != 0 {
		t.Fatal("already billed task retried", n, err)
	}

	before = f.balance()
	register("still-free", true)
	if !f.balance().Equal(before) || f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='still-free'`) != StatusFree {
		t.Fatal("free task changed billing semantics")
	}
}
