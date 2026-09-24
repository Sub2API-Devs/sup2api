package billing

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Ledger kinds.
const (
	KindUsage        = "usage"
	KindAdminAdjust  = "admin_adjust"
	KindPluginCredit = "plugin_credit"
	KindPluginDebit  = "plugin_debit"
	KindRefund       = "refund"
)

var validKinds = map[string]bool{KindUsage: true, KindAdminAdjust: true, KindPluginCredit: true, KindPluginDebit: true, KindRefund: true}

const balanceCacheTTL = 10 * time.Minute

func balanceKey(userID int64) string { return "balance:" + strconv.FormatInt(userID, 10) }

// setBalanceScript stores "<ledger_id>:<balance>" unless the cache already
// holds a newer ledger id, so concurrent writers never regress the value.
var setBalanceScript = redis.NewScript(`
local cur = redis.call('GET', KEYS[1])
if cur then
  local id = tonumber(string.match(cur, '^(%d+):'))
  if id and id > tonumber(ARGV[1]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[1] .. ':' .. ARGV[2], 'EX', tonumber(ARGV[3]))
return 1
`)

func validateChange(ch *core.LedgerChange) error {
	var fields []core.FieldError
	if ch.UserID <= 0 {
		fields = append(fields, core.FieldError{Field: "user_id", Code: "required", Message: "user id is required"})
	}
	if ch.Amount.Sign() <= 0 {
		fields = append(fields, core.FieldError{Field: "amount", Code: "invalid", Message: "amount must be positive"})
	} else if !ch.Amount.Equal(ch.Amount.Round(8)) {
		fields = append(fields, core.FieldError{Field: "amount", Code: "invalid", Message: "at most 8 decimal places"})
	}
	if !validKinds[ch.Kind] {
		fields = append(fields, core.FieldError{Field: "kind", Code: "invalid", Message: "unknown ledger kind"})
	}
	if ch.IdempotencyKey == "" || len(ch.IdempotencyKey) > 150 {
		fields = append(fields, core.FieldError{Field: "idempotency_key", Code: "required", Message: "1-150 characters"})
	}
	if len(fields) > 0 {
		return core.InvalidFields(fields...)
	}
	return nil
}

// Apply implements core.Ledger: one transaction for balance, ledger row and
// balance.changed event; then the Redis cache is refreshed.
func (s *Service) Apply(ctx context.Context, ch core.LedgerChange) (*core.LedgerResult, error) {
	var res *core.LedgerResult
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		var err error
		res, err = s.ApplyTx(ctx, tx, ch)
		return err
	})
	if err != nil {
		return nil, err
	}
	if !res.Duplicate {
		s.CacheBalance(ctx, ch.UserID, res.LedgerID, res.BalanceAfter)
	}
	return res, nil
}

// ApplyTx applies a change inside the caller's transaction (used by usage
// settlement to update the usage row atomically). The caller must call
// CacheBalance after committing when the result is not a duplicate.
func (s *Service) ApplyTx(ctx context.Context, tx pgx.Tx, ch core.LedgerChange) (*core.LedgerResult, error) {
	if err := validateChange(&ch); err != nil {
		return nil, err
	}
	ch.Amount = ch.Amount.Round(8)
	if _, err := tx.Exec(ctx, `INSERT INTO user_balances (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, ch.UserID); err != nil {
		if isFKViolation(err) {
			return nil, core.ErrNotFound.WithMessage("user not found").WithCause(err)
		}
		return nil, err
	}
	var balance decimal.Decimal
	if err := tx.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id = $1 FOR UPDATE`, ch.UserID).Scan(&balance); err != nil {
		return nil, err
	}
	if dup, err := findLedger(ctx, tx, ch.IdempotencyKey); err != nil || dup != nil {
		return dup, err
	}
	delta := ch.Amount
	if !ch.Credit {
		delta = delta.Neg()
	}
	after := balance.Add(delta)
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO balance_ledger (user_id, delta, balance_after, kind, ref_type, ref_id, idempotency_key,
			operator_id, plugin_key, note)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10)
		ON CONFLICT (idempotency_key) DO NOTHING
		RETURNING id`,
		ch.UserID, delta, after, ch.Kind, ch.RefType, ch.RefID, ch.IdempotencyKey,
		ch.OperatorID, ch.PluginKey, ch.Note).Scan(&id)
	if store.IsNoRows(err) {
		// Same key used concurrently for another user.
		return findLedger(ctx, tx, ch.IdempotencyKey)
	}
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE user_balances SET balance = $2, updated_at = now() WHERE user_id = $1`, ch.UserID, after); err != nil {
		return nil, err
	}
	if s.events != nil {
		err := s.events.Emit(ctx, tx, core.Event{Type: core.EventBalanceChanged, Payload: map[string]any{
			"user_id": ch.UserID, "ledger_id": id, "delta": delta, "balance_after": after, "kind": ch.Kind,
		}})
		if err != nil {
			return nil, fmt.Errorf("emit balance.changed: %w", err)
		}
	}
	return &core.LedgerResult{LedgerID: id, BalanceAfter: after}, nil
}

func findLedger(ctx context.Context, q store.Querier, key string) (*core.LedgerResult, error) {
	r := &core.LedgerResult{Duplicate: true}
	err := q.QueryRow(ctx, `SELECT id, balance_after FROM balance_ledger WHERE idempotency_key = $1`, key).Scan(&r.LedgerID, &r.BalanceAfter)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return r, nil
}

// CacheBalance stores a balance observed at ledgerID in Redis (best effort;
// older observations never overwrite newer ones).
func (s *Service) CacheBalance(ctx context.Context, userID, ledgerID int64, balance decimal.Decimal) {
	if s.rdb == nil {
		return
	}
	err := setBalanceScript.Run(context.WithoutCancel(ctx), s.rdb, []string{balanceKey(userID)},
		ledgerID, balance.String(), int(balanceCacheTTL.Seconds())).Err()
	if err != nil {
		slog.WarnContext(ctx, "billing: cache balance", "user_id", userID, "err", err)
		// A stale entry is worse than none.
		_ = s.rdb.Del(context.WithoutCancel(ctx), balanceKey(userID)).Err()
	}
}

// Balance returns a user's balance, served from Redis when cached.
func (s *Service) Balance(ctx context.Context, userID int64) (decimal.Decimal, error) {
	if s.rdb != nil {
		v, err := s.rdb.Get(ctx, balanceKey(userID)).Result()
		if err == nil {
			if _, bal, ok := strings.Cut(v, ":"); ok {
				if d, err := decimal.NewFromString(bal); err == nil {
					return d, nil
				}
			}
		} else if err != redis.Nil {
			slog.WarnContext(ctx, "billing: read balance cache", "user_id", userID, "err", err)
		}
	}
	var bal decimal.Decimal
	var lastID int64
	err := s.db.Pool.QueryRow(ctx, `
		SELECT COALESCE((SELECT balance FROM user_balances WHERE user_id = $1), 0),
		       COALESCE((SELECT max(id) FROM balance_ledger WHERE user_id = $1), 0)`, userID).Scan(&bal, &lastID)
	if err != nil {
		return decimal.Zero, err
	}
	s.CacheBalance(ctx, userID, lastID, bal)
	return bal, nil
}

// CheckBalance implements core.BalanceGate: the balance must exceed
// settings.min_balance.
func (s *Service) CheckBalance(ctx context.Context, userID int64) error {
	bal, err := s.Balance(ctx, userID)
	if err != nil {
		return err
	}
	st, err := s.Settings(ctx)
	if err != nil {
		return err
	}
	if !bal.GreaterThan(st.MinBalance) {
		return core.ErrInsufficientBalance.WithDetails(map[string]any{"balance": bal.String(), "min_balance": st.MinBalance.String()})
	}
	return nil
}

func isFKViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23503"
}
