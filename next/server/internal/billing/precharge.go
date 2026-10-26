package billing

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func (s *Service) PreConsumeTokens(ctx context.Context) (int64, error) {
	st, err := s.Settings(ctx)
	return st.PreConsumeTokens, err
}

func (s *Service) OutputReserveTokens(ctx context.Context) (int64, error) {
	st, err := s.Settings(ctx)
	return st.OutputReserveTokens, err
}

func (s *Service) Precharge(ctx context.Context, r *core.UsageRecord) error {
	if r.Price == nil && len(r.Additional) == 0 && r.BillingError == "" {
		return nil
	}
	amount, err := quoteRecord(ctx, s, r)
	if err != nil {
		return err
	}
	if amount.IsZero() {
		return nil
	}
	if amount.IsNegative() {
		return fmt.Errorf("invalid negative precharge")
	}
	st, err := s.Settings(ctx)
	if err != nil {
		return err
	}
	ch := core.LedgerChange{UserID: r.UserID, Amount: amount, Kind: KindUsage, RefType: "precharge",
		RefID: r.RequestID, IdempotencyKey: "precharge:" + r.RequestID, Note: "request precharge"}
	// ApplyTx validated and rounded the same change; doing it before the
	// transaction keeps the error and the SQL parameters identical.
	if err := validateChange(&ch); err != nil {
		return err
	}
	ch.Amount = ch.Amount.Round(8)
	var lr *core.LedgerResult
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		if lr, err = s.prechargeTx(ctx, tx, ch, st.MinBalance); err != nil {
			return err
		}
		if lr == nil || s.events == nil {
			return nil
		}
		if err := s.events.Emit(ctx, tx, core.Event{Type: core.EventBalanceChanged, Payload: map[string]any{
			"user_id": ch.UserID, "ledger_id": lr.LedgerID, "delta": ch.Amount.Neg(), "balance_after": lr.BalanceAfter, "kind": ch.Kind,
		}}); err != nil {
			return fmt.Errorf("emit balance.changed: %w", err)
		}
		return nil
	})
	if err == nil && lr != nil {
		s.CacheBalance(ctx, r.UserID, lr.LedgerID, lr.BalanceAfter)
	}
	return err
}

// prechargeTx reserves the precharge and writes its ledger entry in four
// round trips: BEGIN (s.db.Tx), one pipelined batch (create the balance row,
// lock it, then reserve and charge under that lock), the caller's
// balance.changed event, and COMMIT. The statements are the ones Precharge
// used to run one by one, minus the ones ApplyTx repeated (the balance row
// insert, its FOR UPDATE lock and the idempotency lookup), and with the
// sufficiency check expressed in SQL so the batch needs no client round trip
// in the middle. The row lock is still taken before anything else touches the
// user's money, the idempotency key is still the ledger key, and a duplicate
// still charges nothing and reports no error.
func (s *Service) prechargeTx(ctx context.Context, tx pgx.Tx, ch core.LedgerChange, min decimal.Decimal) (*core.LedgerResult, error) {
	batch := &pgx.Batch{}
	batch.Queue(`INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, ch.UserID)
	batch.Queue(`SELECT user_id FROM user_balances WHERE user_id = $1 FOR UPDATE`, ch.UserID)
	batch.Queue(prechargeSQL, ch.UserID, ch.RefID, ch.Amount, ch.Kind, ch.RefType, ch.RefID, ch.IdempotencyKey, ch.Note, min)
	br := tx.SendBatch(ctx, batch)
	var lockedUser, ledgerID int64
	var after decimal.Decimal
	var duplicate, sufficient bool
	if _, err := br.Exec(); err != nil {
		_ = br.Close()
		return nil, err
	}
	if err := br.QueryRow().Scan(&lockedUser); err != nil {
		_ = br.Close()
		return nil, err
	}
	if err := br.QueryRow().Scan(&ledgerID, &after, &duplicate, &sufficient); err != nil {
		_ = br.Close()
		return nil, err
	}
	if err := br.Close(); err != nil {
		return nil, err
	}
	switch {
	case ledgerID != 0:
		return &core.LedgerResult{LedgerID: ledgerID, BalanceAfter: after}, nil
	case duplicate:
		// The same request id was precharged before: nothing is charged and
		// Precharge has always answered success here.
		return nil, nil
	case !sufficient:
		return nil, core.ErrInsufficientBalance
	}
	// The key was not visible to the statement (so nothing was inserted) yet
	// the balance would have allowed it: another transaction inserted that key
	// after the statement's snapshot. ApplyTx answered by reading the row and
	// comparing it; do the same, and return it so the caller refreshes the
	// balance cache exactly as ApplyTx's caller did.
	dup, err := findLedger(ctx, tx, ch.IdempotencyKey)
	if err != nil {
		return nil, err
	}
	if dup == nil {
		return nil, core.ErrInternal.WithMessage("idempotency key vanished during insert")
	}
	delta := ch.Amount
	if !ch.Credit {
		delta = delta.Neg()
	}
	if dup.UserID != ch.UserID || !dup.Delta.Equal(delta) || dup.Kind != ch.Kind {
		return nil, core.ErrConflict.WithMessage("idempotency key reused with different user, amount or kind")
	}
	return dup, nil
}

// prechargeSQL is the reservation and its ledger entry in one statement under
// the row lock prechargeTx took. The guards are the statements Precharge used
// to run in order:
//   - balance - amount must exceed min_balance (meetsMin), else nothing is
//     reserved and the caller reports insufficient balance;
//   - a ledger row with the idempotency key must not exist yet (it answered
//     success and charged nothing when it did) — then ledger yields no row and
//     the caller sees duplicate=true.
//
// When both pass, balance_ledger, request_precharges and the balance update
// happen with the values ApplyTx wrote: delta -round(amount, 8) (validateChange
// already rejected a different rounding), balance_after balance - that, kind,
// ref and note unchanged. The update reads the inserted row through RETURNING,
// which is how data-modifying CTEs communicate. Every parameter carries its
// type: the pipeline prepares the batch, and a bare $n that Postgres sees in
// two contexts is an "inconsistent types deduced" error. Parameters: 1 user,
// 2 request id, 3 amount, 4 kind, 5 ref_type, 6 ref_id, 7 idempotency key,
// 8 note, 9 min_balance.
const prechargeSQL = `
WITH ledger AS (
    INSERT INTO balance_ledger (user_id, delta, balance_after, kind, ref_type, ref_id,
        idempotency_key, operator_id, plugin_key, note)
    SELECT $1::bigint, -round($3::numeric, 8), b.balance - round($3::numeric, 8), $4::text, $5::text,
        $6::text, $7::varchar, NULL, NULL, $8::text
    FROM user_balances b
    WHERE b.user_id = $1::bigint
      AND b.balance - $3::numeric > $9::numeric
      AND NOT EXISTS (SELECT 1 FROM balance_ledger l WHERE l.idempotency_key = $7::varchar)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, balance_after
), reserved AS (
    INSERT INTO request_precharges (request_id, user_id, amount)
    SELECT $2::varchar, $1::bigint, $3::numeric WHERE EXISTS (SELECT 1 FROM ledger)
    RETURNING request_id
), applied AS (
    UPDATE user_balances SET balance = ledger.balance_after, updated_at = now()
    FROM ledger
    WHERE user_balances.user_id = $1::bigint
    RETURNING ledger.id, ledger.balance_after
)
SELECT COALESCE((SELECT id FROM applied), 0),
       COALESCE((SELECT balance_after FROM applied), 0),
       EXISTS (SELECT 1 FROM balance_ledger WHERE idempotency_key = $7::varchar),
       COALESCE((SELECT balance - $3::numeric > $9::numeric FROM user_balances WHERE user_id = $1::bigint), false)`

func (s *Service) ReleasePrechargeTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string) (*core.LedgerResult, error) {
	// Match the ledger's user-row lock order before touching the reservation.
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM request_precharges WHERE request_id=$1 AND user_id=$2)`, requestID, userID).Scan(&exists); err != nil || !exists {
		return nil, err
	}
	var balance decimal.Decimal
	if err := tx.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id=$1 FOR UPDATE`, userID).Scan(&balance); err != nil {
		return nil, err
	}
	var amount decimal.Decimal
	err := tx.QueryRow(ctx, `DELETE FROM request_precharges WHERE request_id=$1 AND user_id=$2 RETURNING amount`, requestID, userID).Scan(&amount)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return s.ApplyTx(ctx, tx, core.LedgerChange{UserID: userID, Amount: amount, Credit: true, Kind: KindRefund, RefType: "precharge", RefID: requestID, IdempotencyKey: "precharge_release:" + requestID, Note: "release request precharge"})
}

func (s *Service) ReleaseExpiredPrecharges(ctx context.Context) error {
	// Pending usage is retried by settlement and must keep its reservation.
	rows, err := s.db.Pool.Query(ctx, `SELECT p.request_id,p.user_id FROM request_precharges p WHERE p.expires_at < now() AND NOT EXISTS (SELECT 1 FROM usage_logs u WHERE u.request_id=p.request_id AND u.billing_status IN ('pending','failed')) ORDER BY p.expires_at LIMIT 100`)
	if err != nil {
		return err
	}
	type entry struct {
		id   string
		user int64
	}
	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.id, &e.user); err != nil {
			rows.Close()
			return err
		}
		entries = append(entries, e)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	var failedCount int
	for _, e := range entries {
		var lr *core.LedgerResult
		err := s.db.Tx(ctx, func(tx pgx.Tx) error {
			var err error
			lr, err = s.ReleasePrechargeTx(ctx, tx, e.user, e.id)
			return err
		})
		if err != nil {
			slog.WarnContext(ctx, "billing: release expired precharge failed", "request_id", e.id, "user_id", e.user, "err", err)
			failedCount++
			continue
		}
		if lr != nil {
			s.CacheBalance(ctx, e.user, lr.LedgerID, lr.BalanceAfter)
		}
	}
	if failedCount > 0 {
		slog.ErrorContext(ctx, "billing: some expired precharges failed to release", "failed", failedCount, "total", len(entries))
	}
	return nil
}
