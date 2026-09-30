package usage

import (
	"context"
	"encoding/json"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The manual way out of the automatic policy (CONTRACTS §25.4).
//
// The automatic rule for an entry nobody could confirm - keep the estimate -
// errs towards the platform, deliberately: the call was really made and the
// upstream really started work. That is the right default and the wrong
// answer often enough that an administrator has to be able to say otherwise,
// which is what these two actions are. Without them the only recourse would
// be a hand-written balance adjustment with no link to the row.
//
// They apply to every row that is billed AT ITS RESERVATION: the abandoned
// ones, and the ones a plugin closed with SETTLED_ESTIMATE (the work is
// confirmed, the usage is not). The second kind is a smaller injustice than
// the first, but the amount on the row is an estimate either way, and an
// estimate is what an administrator may want to ask about again or give
// back.

// billedAtEstimate reports whether a settlement entry left its row charged
// at the plugin's estimate, which is what the two manual actions act on.
func billedAtEstimate(state string) bool {
	return state == SettleStateAbandoned || state == SettleStateEstimated
}

// Settlement is the pending_settlements entry of a usage row, as the console
// shows it in the usage detail.
type Settlement struct {
	ID          int64     `json:"id"`
	PluginKey   string    `json:"plugin_key"`
	RefID       string    `json:"ref_id"`
	AccountID   *int64    `json:"account_id"`
	Attempts    int       `json:"attempts"`
	NextCheckAt time.Time `json:"next_check_at"`
	DeadlineAt  time.Time `json:"deadline_at"`
	State       string    `json:"state"`
	LastError   string    `json:"last_error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (s *Service) loadSettlement(ctx context.Context, q store.Querier, usageLogID int64) (*Settlement, error) {
	e := &Settlement{}
	err := q.QueryRow(ctx, `
		SELECT id, plugin_key, ref_id, account_id, attempts, next_check_at, deadline_at, state, last_error, created_at
		FROM pending_settlements WHERE usage_log_id = $1`, usageLogID).
		Scan(&e.ID, &e.PluginKey, &e.RefID, &e.AccountID, &e.Attempts, &e.NextCheckAt, &e.DeadlineAt,
			&e.State, &e.LastError, &e.CreatedAt)
	if store.IsNoRows(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return e, nil
}

// POST /usage/:id/reconcile — ask again about a row the core gave up on.
//
// It puts the row back where the loop can see it: billing_status returns to
// "reserved", the entry to "pending" with a fresh deadline and its attempt
// count reset. Nothing about the money changes here - whatever the next
// answer is, the ordinary settle/refund/abandon path applies it.
func (s *Service) retryReconcile(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	cfg := s.reconcileSettings(ctx)
	var out *Settlement
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		row, entry, err := lockSettlement(ctx, tx, id)
		if err != nil {
			return err
		}
		if !billedAtEstimate(entry.State) {
			return core.ErrConflict.WithMessage("only a settlement billed at its estimate (abandoned or estimated) can be reconciled again")
		}
		if row.status != StatusBilled {
			return core.ErrConflict.WithMessage("this usage row is no longer billed at its reservation")
		}
		// Back to "reserved": the row leaves the billed state and, just as
		// importantly, does not enter usage_logs_billing_pending_idx on the
		// way - the settlement retry loop must never see a row whose money
		// has already moved.
		marker, _ := json.Marshal(map[string]string{core.AnomalyReconcile: "retrying"})
		if _, err := tx.Exec(ctx, `
			UPDATE usage_logs SET billing_status = 'reserved', anomalies = anomalies || $2::jsonb
			WHERE id = $1`, id, marker); err != nil {
			return err
		}
		now := time.Now()
		if _, err := tx.Exec(ctx, `
			UPDATE pending_settlements SET state = 'pending', attempts = 0, next_check_at = $2,
				deadline_at = $3, last_error = ''
			WHERE id = $1`, entry.ID, now, now.Add(cfg.maxAge)); err != nil {
			return err
		}
		out, err = s.loadSettlement(ctx, tx, id)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

// POST /usage/:id/refund — give a kept reservation back.
//
// Only for a row billed at its estimate (abandoned, or estimated by the
// plugin): a row that settled or failed has already had its difference
// applied, and refunding on top of that would be a second, unrelated credit. The key is "refund:{request_id}", distinct from the
// reconcile loop's own "refund:{request_id}:reconcile", so an automatic
// partial refund and a manual one can never silently collapse into one.
func (s *Service) refundAbandoned(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Note string `json:"note"`
	}
	_ = c.ShouldBindJSON(&in)
	uid, _ := core.UserID(ctx)
	var ledgerRes *core.LedgerResult
	var userID int64
	var amount decimal.Decimal
	err := s.db.Tx(ctx, func(tx pgx.Tx) error {
		row, entry, err := lockSettlement(ctx, tx, id)
		if err != nil {
			return err
		}
		if !billedAtEstimate(entry.State) {
			return core.ErrConflict.WithMessage("only a settlement billed at its estimate (abandoned or estimated) can be refunded here")
		}
		if row.status != StatusBilled {
			return core.ErrConflict.WithMessage("this usage row is no longer billed at its reservation")
		}
		userID, amount = row.p.UserID, row.totalCost
		if amount.Sign() <= 0 {
			return core.ErrConflict.WithMessage("nothing was charged for this request")
		}
		note := in.Note
		if note == "" {
			note = "reservation refunded by an administrator"
		}
		operator := uid
		ch := core.LedgerChange{
			UserID: userID, Amount: amount, Credit: true, Kind: "refund",
			RefType: "usage", RefID: row.p.RequestID, IdempotencyKey: "refund:" + row.p.RequestID,
			Note: trunc(note, 500),
		}
		if operator > 0 {
			ch.OperatorID = &operator
		}
		ledgerRes, err = s.ledger.ApplyTx(ctx, tx, ch)
		if err != nil {
			return err
		}
		marker, _ := json.Marshal(map[string]string{core.AnomalyReconcile: "refunded"})
		if _, err := tx.Exec(ctx, `
			UPDATE usage_logs SET total_cost = 0, billing_status = 'free', anomalies = anomalies || $2::jsonb
			WHERE id = $1`, id, marker); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `UPDATE pending_settlements SET last_error = $2 WHERE id = $1`,
			entry.ID, trunc("refunded by an administrator: "+note, 2000))
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if ledgerRes != nil && !ledgerRes.Duplicate {
		s.ledger.CacheBalance(ctx, userID, ledgerRes.LedgerID, ledgerRes.BalanceAfter)
	}
	httpapi.OK(c, gin.H{"refunded": amount, "ledger_id": ledgerRes.LedgerID})
}

// lockSettlement loads a usage row and its settlement entry, both locked, or
// reports why the action does not apply.
func lockSettlement(ctx context.Context, tx pgx.Tx, usageLogID int64) (*reservedRowState, *Settlement, error) {
	p := &pending{}
	st := &reservedRowState{p: p}
	err := tx.QueryRow(ctx, `
		SELECT request_id, user_id, billing_status, total_cost FROM usage_logs WHERE id = $1 FOR UPDATE`,
		usageLogID).Scan(&p.RequestID, &p.UserID, &st.status, &st.totalCost)
	if store.IsNoRows(err) {
		return nil, nil, core.ErrNotFound.WithMessage("usage record not found")
	}
	if err != nil {
		return nil, nil, err
	}
	e := &Settlement{}
	err = tx.QueryRow(ctx, `
		SELECT id, plugin_key, ref_id, account_id, attempts, next_check_at, deadline_at, state, last_error, created_at
		FROM pending_settlements WHERE usage_log_id = $1 FOR UPDATE`, usageLogID).
		Scan(&e.ID, &e.PluginKey, &e.RefID, &e.AccountID, &e.Attempts, &e.NextCheckAt, &e.DeadlineAt,
			&e.State, &e.LastError, &e.CreatedAt)
	if store.IsNoRows(err) {
		return nil, nil, core.ErrNotFound.WithMessage("this usage record was not pre-charged")
	}
	if err != nil {
		return nil, nil, err
	}
	return st, e, nil
}
