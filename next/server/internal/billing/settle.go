package billing

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The ledger's row lock on user_balances serialises every charge of one user,
// and the lock is held until COMMIT. Every client round trip made while it is
// held is paid by everyone else queueing for the same user at a distant
// PostgreSQL (CONTRACTS §63.7). The statements below therefore do a whole
// ledger change in one statement each, and SettleTx sends the release of a
// request's precharge and its final charge in one batch: one flush, then the
// events, then COMMIT.

// ensureBalanceSQL creates the balance row a later statement locks. It is a
// statement of its own because a data-modifying CTE's rows are invisible to
// the rest of the same statement. An unknown user fails here with the users
// foreign key (store.IsForeignKeyViolation → not found).
const ensureBalanceSQL = `INSERT INTO user_balances (user_id) VALUES ($1::bigint) ON CONFLICT DO NOTHING`

// applySQL is ApplyTx in one statement: find an existing ledger row for the
// idempotency key; otherwise lock the balance row, insert the ledger row with
// the new balance and update the balance. Parameters: 1 user, 2 signed delta,
// 3 kind, 4 ref_type, 5 ref_id, 6 idempotency key, 7 operator id (NULL), 8
// plugin key (” → NULL), 9 note. Columns: applied id and balance_after (0
// when nothing was written), whether the key existed before the statement
// and that row's id, balance_after, user_id, delta and kind. Nothing applied
// and no existing row means another transaction inserted the key after this
// statement's snapshot (ON CONFLICT DO NOTHING); the caller re-reads it.
const applySQL = `
WITH existing AS (
    SELECT id, balance_after, user_id, delta, kind FROM balance_ledger WHERE idempotency_key = $6::varchar
), locked AS (
    SELECT balance FROM user_balances
    WHERE user_id = $1::bigint AND NOT EXISTS (SELECT 1 FROM existing)
    FOR UPDATE
), ledger AS (
    INSERT INTO balance_ledger (user_id, delta, balance_after, kind, ref_type, ref_id,
        idempotency_key, operator_id, plugin_key, note)
    SELECT $1::bigint, $2::numeric, locked.balance + $2::numeric, $3::text, $4::text, $5::text,
        $6::varchar, $7::bigint, NULLIF($8::text, ''), $9::text
    FROM locked
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, balance_after
), applied AS (
    UPDATE user_balances SET balance = ledger.balance_after, updated_at = now()
    FROM ledger
    WHERE user_balances.user_id = $1::bigint
    RETURNING ledger.id, ledger.balance_after
)
SELECT COALESCE((SELECT id FROM applied), 0),
       COALESCE((SELECT balance_after FROM applied), 0),
       EXISTS (SELECT 1 FROM existing),
       COALESCE((SELECT id FROM existing), 0),
       COALESCE((SELECT balance_after FROM existing), 0),
       COALESCE((SELECT user_id FROM existing), 0),
       COALESCE((SELECT delta FROM existing), 0),
       COALESCE((SELECT kind FROM existing), '')`

// releaseSQL is ReleasePrechargeTx in one statement. The balance row is
// locked first and the reservation deleted under that lock (USING locked), the
// lock order the ledger and the expiry sweeper share; the lock is not taken
// when the request has no reservation. The refund ledger row is written with
// the reservation's amount unless its idempotency key already exists.
// Parameters: 1 request id, 2 user, 3 idempotency key, 4 note. Columns: the
// refund's id and balance_after (0 when none was written), whether a
// reservation was deleted and its amount.
const releaseSQL = `
WITH locked AS (
    SELECT balance FROM user_balances
    WHERE user_id = $2::bigint
      AND EXISTS (SELECT 1 FROM request_precharges WHERE request_id = $1::varchar AND user_id = $2::bigint)
    FOR UPDATE
), released AS (
    DELETE FROM request_precharges p USING locked
    WHERE p.request_id = $1::varchar AND p.user_id = $2::bigint
    RETURNING p.amount
), ledger AS (
    INSERT INTO balance_ledger (user_id, delta, balance_after, kind, ref_type, ref_id,
        idempotency_key, operator_id, plugin_key, note)
    SELECT $2::bigint, r.amount, l.balance + r.amount, 'refund', 'precharge', $1::varchar,
        $3::varchar, NULL, NULL, $4::text
    FROM released r, locked l
    WHERE NOT EXISTS (SELECT 1 FROM balance_ledger WHERE idempotency_key = $3::varchar)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id, balance_after
), applied AS (
    UPDATE user_balances SET balance = ledger.balance_after, updated_at = now()
    FROM ledger
    WHERE user_balances.user_id = $2::bigint
    RETURNING ledger.id, ledger.balance_after
)
SELECT COALESCE((SELECT id FROM applied), 0),
       COALESCE((SELECT balance_after FROM applied), 0),
       EXISTS (SELECT 1 FROM released),
       COALESCE((SELECT amount FROM released), 0)`

func releaseKey(requestID string) string { return "precharge_release:" + requestID }

// queueApply queues applySQL for a validated, rounded change.
func queueApply(b *pgx.Batch, ch core.LedgerChange) {
	delta := ch.Amount
	if !ch.Credit {
		delta = delta.Neg()
	}
	b.Queue(applySQL, ch.UserID, delta, ch.Kind, ch.RefType, ch.RefID, ch.IdempotencyKey, ch.OperatorID, ch.PluginKey, ch.Note)
}

// scanApply reads applySQL's row. raced reports that neither a new nor an
// existing ledger row was seen, so the caller must look the key up again.
func scanApply(row pgx.Row, ch core.LedgerChange) (res *core.LedgerResult, raced bool, err error) {
	var applied core.LedgerResult
	var existed bool
	dup := &core.LedgerResult{Duplicate: true}
	if err := row.Scan(&applied.LedgerID, &applied.BalanceAfter, &existed, &dup.LedgerID, &dup.BalanceAfter, &dup.UserID, &dup.Delta, &dup.Kind); err != nil {
		return nil, false, err
	}
	if applied.LedgerID != 0 {
		return &applied, false, nil
	}
	if !existed {
		return nil, true, nil
	}
	return dup, false, nil
}

// checkDuplicate is the idempotency contract: the same key must carry the
// same user, amount and kind.
func checkDuplicate(dup *core.LedgerResult, ch core.LedgerChange) (*core.LedgerResult, error) {
	delta := ch.Amount
	if !ch.Credit {
		delta = delta.Neg()
	}
	if dup.UserID != ch.UserID || !dup.Delta.Equal(delta) || dup.Kind != ch.Kind {
		return nil, core.ErrConflict.WithMessage("idempotency key reused with different user, amount or kind")
	}
	return dup, nil
}

// resolveApply turns applySQL's outcome into ApplyTx's result, re-reading the
// key after a lost insert race.
func resolveApply(ctx context.Context, tx pgx.Tx, res *core.LedgerResult, raced bool, ch core.LedgerChange) (*core.LedgerResult, error) {
	if raced {
		dup, err := findLedger(ctx, tx, ch.IdempotencyKey)
		if err != nil {
			return nil, err
		}
		if dup == nil {
			return nil, core.ErrInternal.WithMessage("idempotency key vanished during insert")
		}
		res = dup
	}
	if res.Duplicate {
		return checkDuplicate(res, ch)
	}
	return res, nil
}

// scanRelease reads releaseSQL's row. A reservation that was deleted while
// its refund key already existed (nothing new written) is reported through
// the existing ledger row, as ApplyTx's duplicate.
func scanRelease(ctx context.Context, tx pgx.Tx, row pgx.Row, key string) (res *core.LedgerResult, amount decimal.Decimal, err error) {
	var got core.LedgerResult
	var released bool
	if err := row.Scan(&got.LedgerID, &got.BalanceAfter, &released, &amount); err != nil {
		return nil, amount, err
	}
	if !released {
		return nil, amount, nil
	}
	if got.LedgerID != 0 {
		return &got, amount, nil
	}
	dup, err := findLedger(ctx, tx, key)
	if err != nil {
		return nil, amount, err
	}
	if dup == nil {
		return nil, amount, core.ErrInternal.WithMessage("precharge released without a refund row")
	}
	return dup, amount, nil
}

func balanceChanged(userID int64, res *core.LedgerResult, delta decimal.Decimal, kind string) core.Event {
	return core.Event{Type: core.EventBalanceChanged, Payload: map[string]any{
		"user_id": userID, "ledger_id": res.LedgerID, "delta": delta, "balance_after": res.BalanceAfter, "kind": kind,
	}}
}

// SettleTx releases the request's precharge (if any) and applies the final
// charge (if any) inside the caller's transaction, in one batch under the
// user's balance lock, then emits the balance.changed events in one call.
// It returns the charge's result, or the refund's when there is no charge
// (nil when nothing moved). The caller refreshes the balance cache after
// committing, as for ApplyTx.
func (s *Service) SettleTx(ctx context.Context, tx pgx.Tx, userID int64, requestID string, charge *core.LedgerChange) (*core.LedgerResult, error) {
	if charge != nil {
		if err := validateChange(charge); err != nil {
			return nil, err
		}
		charge.Amount = charge.Amount.Round(8)
		if charge.UserID != userID {
			return nil, errors.New("settlement charge belongs to another user")
		}
	}
	key := releaseKey(requestID)
	b := &pgx.Batch{}
	b.Queue(ensureBalanceSQL, userID)
	b.Queue(releaseSQL, requestID, userID, key, "release request precharge")
	if charge != nil {
		queueApply(b, *charge)
	}
	br := tx.SendBatch(ctx, b)
	if _, err := br.Exec(); err != nil {
		_ = br.Close()
		if store.IsForeignKeyViolation(err) {
			return nil, core.ErrNotFound.WithMessage("user not found").WithCause(err)
		}
		return nil, err
	}
	// Rows are read before Close; the lookups scanRelease and resolveApply
	// may need run after it, on the same transaction.
	var refund core.LedgerResult
	var released bool
	var amount decimal.Decimal
	if err := br.QueryRow().Scan(&refund.LedgerID, &refund.BalanceAfter, &released, &amount); err != nil {
		_ = br.Close()
		return nil, err
	}
	var charged *core.LedgerResult
	var raced bool
	if charge != nil {
		var err error
		if charged, raced, err = scanApply(br.QueryRow(), *charge); err != nil {
			_ = br.Close()
			return nil, err
		}
	}
	if err := br.Close(); err != nil {
		return nil, err
	}
	var refunded *core.LedgerResult
	if released {
		if refund.LedgerID != 0 {
			refunded = &refund
		} else {
			dup, err := findLedger(ctx, tx, key)
			if err != nil {
				return nil, err
			}
			if dup == nil {
				return nil, core.ErrInternal.WithMessage("precharge released without a refund row")
			}
			refunded = dup
		}
	}
	if charge != nil {
		var err error
		if charged, err = resolveApply(ctx, tx, charged, raced, *charge); err != nil {
			return nil, err
		}
	}
	if s.events != nil {
		var evs []core.Event
		if refunded != nil && !refunded.Duplicate {
			evs = append(evs, balanceChanged(userID, refunded, amount, KindRefund))
		}
		if charged != nil && !charged.Duplicate {
			delta := charge.Amount
			if !charge.Credit {
				delta = delta.Neg()
			}
			evs = append(evs, balanceChanged(userID, charged, delta, charge.Kind))
		}
		if len(evs) > 0 {
			if err := s.events.Emit(ctx, tx, evs...); err != nil {
				return nil, fmt.Errorf("emit balance.changed: %w", err)
			}
		}
	}
	if charge != nil {
		return charged, nil
	}
	return refunded, nil
}

// isLockTimeout reports PostgreSQL's lock_not_available (lock_timeout hit).
func isLockTimeout(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "55P03"
}
