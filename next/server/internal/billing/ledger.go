package billing

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/x"
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

func balanceKey(userID int64) string { return "balance:" + x.Itoa64(userID) }

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
//
// One batch (create the balance row, then applySQL: find the key or lock the
// row, write the ledger row and the balance) and one event: two round trips
// under the user's balance lock instead of six (CONTRACTS §63.7).
func (s *Service) ApplyTx(ctx context.Context, tx pgx.Tx, ch core.LedgerChange) (*core.LedgerResult, error) {
	if err := validateChange(&ch); err != nil {
		return nil, err
	}
	ch.Amount = ch.Amount.Round(8)
	b := &pgx.Batch{}
	b.Queue(ensureBalanceSQL, ch.UserID)
	queueApply(b, ch)
	br := tx.SendBatch(ctx, b)
	if _, err := br.Exec(); err != nil {
		_ = br.Close()
		if store.IsForeignKeyViolation(err) {
			return nil, core.ErrNotFound.WithMessage("user not found").WithCause(err)
		}
		return nil, err
	}
	res, raced, err := scanApply(br.QueryRow(), ch)
	if err != nil {
		_ = br.Close()
		return nil, err
	}
	if err := br.Close(); err != nil {
		return nil, err
	}
	if res, err = resolveApply(ctx, tx, res, raced, ch); err != nil || res.Duplicate {
		return res, err
	}
	if s.events != nil {
		delta := ch.Amount
		if !ch.Credit {
			delta = delta.Neg()
		}
		if err := s.events.Emit(ctx, tx, balanceChanged(ch.UserID, res, delta, ch.Kind)); err != nil {
			return nil, fmt.Errorf("emit balance.changed: %w", err)
		}
	}
	return res, nil
}

func findLedger(ctx context.Context, q store.Querier, key string) (*core.LedgerResult, error) {
	r := &core.LedgerResult{Duplicate: true}
	var userID int64
	var delta decimal.Decimal
	var kind string
	err := q.QueryRow(ctx, `SELECT id, balance_after, user_id, delta, kind FROM balance_ledger WHERE idempotency_key = $1`,
		key).Scan(&r.LedgerID, &r.BalanceAfter, &userID, &delta, &kind)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	r.UserID = userID
	r.Delta = delta
	r.Kind = kind
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
	if !meetsMin(bal, st.MinBalance) {
		return core.ErrInsufficientBalance.WithDetails(map[string]any{"balance": bal.String(), "min_balance": st.MinBalance.String()})
	}
	return nil
}

// meetsMin checks if balance meets the minimum threshold: balance > min.
func meetsMin(balance, min decimal.Decimal) bool {
	return balance.GreaterThan(min)
}
