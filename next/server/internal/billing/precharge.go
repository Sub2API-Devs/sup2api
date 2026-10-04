package billing

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

func (s *Service) PreConsumeTokens(ctx context.Context) (int64, error) {
	st, err := s.Settings(ctx)
	return st.PreConsumeTokens, err
}

func (s *Service) Precharge(ctx context.Context, r *core.UsageRecord) error {
	if r.Price == nil {
		return nil
	}
	p, err := expr.CompileCached(r.Price.Expression)
	if err != nil {
		return err
	}
	t := r.Tokens
	vars := expr.Normalize(r.UsageSemantics, expr.Tokens{Input: t.Input, Output: t.Output, CacheRead: t.CacheRead, CacheCreation: t.CacheCreation, CacheCreation1h: t.CacheCreation1h}, p.Uses)
	result, err := p.Eval(expr.Input{Vars: vars, Metrics: r.Metrics, Params: r.PriceParams, Headers: r.PriceHeaders, At: r.CreatedAt})
	if err != nil {
		return err
	}
	amount := result.Cost.Mul(r.RateMultiplier).Round(8)
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
	var lr *core.LedgerResult
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `INSERT INTO user_balances(user_id) VALUES($1) ON CONFLICT DO NOTHING`, r.UserID); err != nil {
			return err
		}
		var balance decimal.Decimal
		if err := tx.QueryRow(ctx, `SELECT balance FROM user_balances WHERE user_id=$1 FOR UPDATE`, r.UserID).Scan(&balance); err != nil {
			return err
		}
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM balance_ledger WHERE idempotency_key=$1)`, "precharge:"+r.RequestID).Scan(&exists); err != nil {
			return err
		}
		if exists {
			return nil
		}
		if balance.Sub(amount).LessThan(st.MinBalance) {
			return core.ErrInsufficientBalance
		}
		if _, err := tx.Exec(ctx, `INSERT INTO request_precharges(request_id,user_id,amount) VALUES($1,$2,$3)`, r.RequestID, r.UserID, amount); err != nil {
			return err
		}
		var err error
		lr, err = s.ApplyTx(ctx, tx, core.LedgerChange{UserID: r.UserID, Amount: amount, Kind: KindUsage, RefType: "precharge", RefID: r.RequestID, IdempotencyKey: "precharge:" + r.RequestID, Note: "request precharge"})
		return err
	})
	if err == nil && lr != nil {
		s.CacheBalance(ctx, r.UserID, lr.LedgerID, lr.BalanceAfter)
	}
	return err
}

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
	for _, e := range entries {
		var lr *core.LedgerResult
		err := s.db.Tx(ctx, func(tx pgx.Tx) error {
			var err error
			lr, err = s.ReleasePrechargeTx(ctx, tx, e.user, e.id)
			return err
		})
		if err != nil {
			return err
		}
		if lr != nil {
			s.CacheBalance(ctx, e.user, lr.LedgerID, lr.BalanceAfter)
		}
	}
	return nil
}
