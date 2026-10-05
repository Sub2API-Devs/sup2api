package store

import (
	"context"
	"time"
)

// Account balance snapshots (table account_balances, CONTRACTS §51).

// Values of BalanceSnapshot.Source.
const (
	BalanceActive = "active"
)

// BalanceSnapshot is one account_balances row. The JSON form is the one
// the account service caches in Redis (CONTRACTS §51).
type BalanceSnapshot struct {
	AccountID    int64      `json:"account_id"`
	AmountMicros int64      `json:"amount_micros"`
	Currency     string     `json:"currency"`
	Source       string     `json:"source"`
	UpdatedAt    *time.Time `json:"updated_at"`
	Error        string     `json:"error"`
	ErrorAt      *time.Time `json:"error_at"`
}

const selectBalance = `SELECT account_id, amount_micros, currency, source, updated_at, error, error_at
	FROM account_balances`

func scanBalance(r interface{ Scan(...any) error }) (*BalanceSnapshot, error) {
	var b BalanceSnapshot
	if err := r.Scan(&b.AccountID, &b.AmountMicros, &b.Currency, &b.Source, &b.UpdatedAt, &b.Error, &b.ErrorAt); err != nil {
		return nil, err
	}
	return &b, nil
}

// AccountBalance returns the snapshot of one account, nil when it has none.
func (d *DB) AccountBalance(ctx context.Context, accountID int64) (*BalanceSnapshot, error) {
	b, err := scanBalance(d.Pool.QueryRow(ctx, selectBalance+` WHERE account_id = $1`, accountID))
	if IsNoRows(err) {
		return nil, nil
	}
	return b, err
}

// AccountBalances returns the snapshots of the given accounts in one query;
// accounts without one are absent from the map.
func (d *DB) AccountBalances(ctx context.Context, accountIDs []int64) (map[int64]*BalanceSnapshot, error) {
	out := map[int64]*BalanceSnapshot{}
	if len(accountIDs) == 0 {
		return out, nil
	}
	rows, err := d.Pool.Query(ctx, selectBalance+` WHERE account_id = ANY($1)`, accountIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		b, err := scanBalance(rows)
		if err != nil {
			return nil, err
		}
		out[b.AccountID] = b
	}
	return out, rows.Err()
}

// UpsertBalance writes one balance snapshot.
func (d *DB) UpsertBalance(ctx context.Context, b *BalanceSnapshot) error {
	_, err := d.Pool.Exec(ctx, `
		INSERT INTO account_balances (account_id, amount_micros, currency, source, updated_at, error, error_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (account_id) DO UPDATE SET
			amount_micros = EXCLUDED.amount_micros,
			currency = EXCLUDED.currency,
			source = EXCLUDED.source,
			updated_at = EXCLUDED.updated_at,
			error = EXCLUDED.error,
			error_at = EXCLUDED.error_at
	`, b.AccountID, b.AmountMicros, b.Currency, b.Source, b.UpdatedAt, b.Error, b.ErrorAt)
	return err
}

// DeleteBalance removes the balance snapshot of one account.
func (d *DB) DeleteBalance(ctx context.Context, accountID int64) error {
	_, err := d.Pool.Exec(ctx, `DELETE FROM account_balances WHERE account_id = $1`, accountID)
	return err
}
