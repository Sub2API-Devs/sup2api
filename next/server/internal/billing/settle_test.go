package billing

import (
	"context"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/event"
)

func (e *env) seed(uid int64, amount string) {
	e.t.Helper()
	if _, err := e.svc.Apply(context.Background(), core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString(amount), Credit: true, Kind: KindAdminAdjust, IdempotencyKey: "seed:" + itoa(uid)}); err != nil {
		e.t.Fatal(err)
	}
}

func (e *env) balance(uid int64) decimal.Decimal {
	e.t.Helper()
	var bal decimal.Decimal
	if err := e.db.Pool.QueryRow(context.Background(), `SELECT balance FROM user_balances WHERE user_id = $1`, uid).Scan(&bal); err != nil {
		e.t.Fatal(err)
	}
	return bal
}

func (e *env) count(sql string, args ...any) int {
	e.t.Helper()
	var n int
	if err := e.db.Pool.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		e.t.Fatal(err)
	}
	return n
}

func (e *env) settle(uid int64, requestID string, total string) (*core.LedgerResult, error) {
	e.t.Helper()
	var charge *core.LedgerChange
	if total != "" {
		charge = &core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString(total), Kind: KindUsage, RefType: "usage", RefID: requestID, IdempotencyKey: "usage:" + requestID}
	}
	var res *core.LedgerResult
	err := e.db.Tx(context.Background(), func(tx pgx.Tx) error {
		var err error
		res, err = e.svc.SettleTx(context.Background(), tx, uid, requestID, charge)
		return err
	})
	return res, err
}

func usageRecord(uid int64, id, expr string) *core.UsageRecord {
	return &core.UsageRecord{RequestID: id, UserID: uid, Price: &core.PriceRule{Expression: expr}, RateMultiplier: decimal.NewFromInt(1)}
}

// SettleTx does what ReleasePrechargeTx + ApplyTx did: refund the
// reservation, charge the final amount, one event each, same ledger rows.
func TestSettleReleasesAndCharges(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("settle@test.invalid")
	e.seed(uid, "10")
	if err := e.svc.Precharge(ctx, usageRecord(uid, "r1", "flat(2)")); err != nil {
		t.Fatal(err)
	}
	if bal := e.balance(uid); !bal.Equal(decimal.NewFromInt(8)) {
		t.Fatalf("after precharge %s", bal)
	}
	res, err := e.settle(uid, "r1", "1.5")
	if err != nil || res == nil || res.Duplicate || !res.BalanceAfter.Equal(decimal.RequireFromString("8.5")) {
		t.Fatalf("settle: %+v %v", res, err)
	}
	if bal := e.balance(uid); !bal.Equal(decimal.RequireFromString("8.5")) {
		t.Fatalf("balance %s", bal)
	}
	if n := e.count(`SELECT count(*) FROM request_precharges WHERE request_id='r1'`); n != 0 {
		t.Fatal("reservation kept")
	}
	var refundDelta, usageDelta decimal.Decimal
	if err := e.db.Pool.QueryRow(ctx, `SELECT delta FROM balance_ledger WHERE idempotency_key='precharge_release:r1'`).Scan(&refundDelta); err != nil {
		t.Fatal("no refund row:", err)
	}
	if err := e.db.Pool.QueryRow(ctx, `SELECT delta FROM balance_ledger WHERE idempotency_key='usage:r1'`).Scan(&usageDelta); err != nil {
		t.Fatal("no usage row:", err)
	}
	if !refundDelta.Equal(decimal.NewFromInt(2)) || !usageDelta.Equal(decimal.RequireFromString("-1.5")) {
		t.Fatalf("deltas %s %s", refundDelta, usageDelta)
	}
	// seed, precharge, refund, usage
	if n := e.count(`SELECT count(*) FROM events WHERE type='balance.changed' AND payload->>'user_id'=$1`, itoa(uid)); n != 4 {
		t.Fatalf("events %d", n)
	}
	var kinds []string
	rows, err := e.db.Pool.Query(ctx, `SELECT payload->>'kind' FROM events WHERE type='balance.changed' AND payload->>'user_id'=$1 ORDER BY id DESC LIMIT 2`, itoa(uid))
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var k string
		_ = rows.Scan(&k)
		kinds = append(kinds, k)
	}
	rows.Close()
	if len(kinds) != 2 || kinds[0] != KindUsage || kinds[1] != KindRefund {
		t.Fatalf("event kinds %v", kinds)
	}

	// Settling again charges nothing: the usage key is a duplicate and the
	// reservation is gone.
	dup, err := e.settle(uid, "r1", "1.5")
	if err != nil || dup == nil || !dup.Duplicate || dup.LedgerID != res.LedgerID {
		t.Fatalf("replay: %+v %v", dup, err)
	}
	if bal := e.balance(uid); !bal.Equal(decimal.RequireFromString("8.5")) {
		t.Fatalf("replay moved money: %s", bal)
	}
	if n := e.count(`SELECT count(*) FROM events WHERE type='balance.changed' AND payload->>'user_id'=$1`, itoa(uid)); n != 4 {
		t.Fatalf("replay emitted: %d events", n)
	}
	// Same key, different amount: the idempotency contract still holds.
	if _, err := e.settle(uid, "r1", "1.6"); core.AsError(err).Code != core.ErrConflict.Code {
		t.Fatalf("conflict: %v", err)
	}
}

func TestSettleWithoutReservationOrCharge(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("settle-edges@test.invalid")
	e.seed(uid, "3")
	// Free request, never precharged: nothing moves, nothing is locked or written.
	res, err := e.settle(uid, "free", "")
	if err != nil || res != nil {
		t.Fatalf("free: %+v %v", res, err)
	}
	// Charge without a reservation (precharge was skipped): just the charge.
	res, err = e.settle(uid, "direct", "0.25")
	if err != nil || res == nil || res.Duplicate || !res.BalanceAfter.Equal(decimal.RequireFromString("2.75")) {
		t.Fatalf("direct: %+v %v", res, err)
	}
	if n := e.count(`SELECT count(*) FROM balance_ledger WHERE idempotency_key='precharge_release:direct'`); n != 0 {
		t.Fatal("refund row without a reservation")
	}
	// Reservation released with no final charge (request failed): refund only.
	if err := e.svc.Precharge(ctx, usageRecord(uid, "failed", "flat(1)")); err != nil {
		t.Fatal(err)
	}
	res, err = e.settle(uid, "failed", "")
	if err != nil || res == nil || res.Duplicate || !res.BalanceAfter.Equal(decimal.RequireFromString("2.75")) {
		t.Fatalf("release only: %+v %v", res, err)
	}
	if n := e.count(`SELECT count(*) FROM balance_ledger WHERE user_id=$1`, uid); n != 4 { // seed, direct, precharge, refund
		t.Fatalf("ledger rows %d", n)
	}
	// Unknown user.
	if _, err := e.settle(999999, "nobody", "1"); core.AsError(err).Code != "not_found" {
		t.Fatalf("unknown user: %v", err)
	}
}

// One settlement is BEGIN, one batch (balance row, release, charge), one
// event batch, COMMIT: four flushes, two of them under the user's lock.
func TestSettleRoundTrips(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("settle-round-trips@test.invalid")
	e.seed(uid, "10")
	trace := &roundTrips{}
	db := tracedStore(t, e.db, trace)
	svc := New(db, e.rdb, e.bus, event.NewPublisher(db), nil)
	for _, id := range []string{"warmup", "measured"} {
		if err := e.svc.Precharge(ctx, usageRecord(uid, id, "flat(1)")); err != nil {
			t.Fatal(err)
		}
	}
	settle := func(id string) {
		t.Helper()
		err := db.Tx(ctx, func(tx pgx.Tx) error {
			_, err := svc.SettleTx(ctx, tx, uid, id, &core.LedgerChange{UserID: uid, Amount: decimal.RequireFromString("0.5"), Kind: KindUsage, RefType: "usage", RefID: id, IdempotencyKey: "usage:" + id})
			return err
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	settle("warmup")
	trace.reset()
	settle("measured")
	if trace.flushes > 4 || trace.begins != 1 || trace.commits != 1 || trace.batches != 2 {
		t.Fatalf("%d round trips (%d statements, %d batches, %d begin, %d commit) for one settlement; want 4\n%v",
			trace.flushes, len(trace.statements), trace.batches, trace.begins, trace.commits, trace.statements)
	}
	// ApplyTx on its own: BEGIN, one batch, the event, COMMIT.
	trace.reset()
	if _, err := svc.Apply(ctx, core.LedgerChange{UserID: uid, Amount: decimal.NewFromInt(1), Credit: true, Kind: KindAdminAdjust, IdempotencyKey: "apply-measured"}); err != nil {
		t.Fatal(err)
	}
	if trace.flushes > 4 || trace.batches != 2 {
		t.Fatalf("%d round trips (%d batches) for one Apply; want 4\n%v", trace.flushes, trace.batches, trace.statements)
	}
}

// A precharge queueing behind a held balance lock gives up after
// prechargeLockTimeout with 503 instead of holding a connection; a precharge
// that finds no slot does the same.
func TestPrechargeFailsFastWhenBusy(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	uid := e.user("busy@test.invalid")
	e.seed(uid, "10")
	tx, err := e.db.Pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `SELECT balance FROM user_balances WHERE user_id=$1 FOR UPDATE`, uid); err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	err = e.svc.Precharge(ctx, usageRecord(uid, "blocked", "flat(1)"))
	if core.AsError(err).Code != core.ErrUnavailable.Code {
		t.Fatalf("blocked precharge: %v", err)
	}
	if took := time.Since(start); took < 2*time.Second || took > 10*time.Second {
		t.Fatalf("gave up after %s", took)
	}
	if n := e.count(`SELECT count(*) FROM request_precharges WHERE request_id='blocked'`); n != 0 {
		t.Fatal("blocked precharge reserved")
	}
	_ = tx.Rollback(ctx)

	// Slots: with every slot taken the request path answers 503 too.
	e.svc.slotsOnce.Do(func() {})
	e.svc.prechargeSlots = make(chan struct{}, 1)
	e.svc.prechargeSlots <- struct{}{}
	start = time.Now()
	if err := e.svc.Precharge(ctx, usageRecord(uid, "no-slot", "flat(1)")); core.AsError(err).Code != core.ErrUnavailable.Code {
		t.Fatalf("no slot: %v", err)
	}
	if took := time.Since(start); took < 2*time.Second {
		t.Fatalf("gave up after %s", took)
	}
	<-e.svc.prechargeSlots
	if err := e.svc.Precharge(ctx, usageRecord(uid, "no-slot", "flat(1)")); err != nil {
		t.Fatalf("after the slot freed: %v", err)
	}
}
