package billing

import (
	"context"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestPrechargeConcurrentAdmissionAndIdempotentRelease(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("precharge@test.invalid")
	e.exec(`INSERT INTO user_balances(user_id,balance) VALUES($1,1)`, uid)
	var wg sync.WaitGroup
	errs := make(chan error, 2)
	for _, id := range []string{"request-a", "request-b"} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- e.svc.Precharge(ctx, &core.UsageRecord{RequestID: id, UserID: uid, Price: &core.PriceRule{Expression: "flat(0.75)"}, RateMultiplier: decimal.NewFromInt(1)})
		}()
	}
	wg.Wait()
	close(errs)
	success := 0
	for err := range errs {
		if err == nil {
			success++
		} else if core.AsError(err).Code != core.ErrInsufficientBalance.Code {
			t.Fatal(err)
		}
	}
	if success != 1 {
		t.Fatalf("admitted %d requests", success)
	}
	var id string
	if err := e.db.Pool.QueryRow(ctx, `SELECT request_id FROM request_precharges`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if err := e.svc.Precharge(ctx, &core.UsageRecord{RequestID: id, UserID: uid, Price: &core.PriceRule{Expression: "flat(0.75)"}, RateMultiplier: decimal.NewFromInt(1)}); err != nil {
		t.Fatal(err)
	}
	var balance decimal.Decimal
	_ = e.db.Pool.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id=$1`, uid).Scan(&balance)
	if !balance.Equal(decimal.RequireFromString("0.25")) {
		t.Fatalf("balance %s", balance)
	}
	for range 2 {
		if err := e.db.Tx(ctx, func(tx pgx.Tx) error { _, err := e.svc.ReleasePrechargeTx(ctx, tx, uid, id); return err }); err != nil {
			t.Fatal(err)
		}
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id=$1`, uid).Scan(&balance)
	if !balance.Equal(decimal.NewFromInt(1)) {
		t.Fatalf("refund balance %s", balance)
	}
}

func TestPreConsumeSettings(t *testing.T) {
	e := newEnv(t)
	uid := e.user("settings@test.invalid")
	out := data(e.mustCall(uid, 200, "GET", "/settings/billing", nil))
	if out["pre_consume_tokens"] != float64(500) {
		t.Fatalf("default: %v", out)
	}
	e.mustCall(uid, 200, "PUT", "/settings/billing", map[string]any{"pre_consume_tokens": 1200})
	e.mustCall(uid, 200, "PUT", "/settings/billing", map[string]any{"min_balance": "0.1"})
	n, err := e.svc.PreConsumeTokens(context.Background())
	if err != nil || n != 1200 {
		t.Fatalf("persisted %d %v", n, err)
	}
	for _, v := range []any{-1, 1.5, 100000001} {
		code, _ := e.call(uid, "PUT", "/settings/billing", map[string]any{"pre_consume_tokens": v})
		if code < 400 {
			t.Fatalf("accepted %v", v)
		}
	}
}
