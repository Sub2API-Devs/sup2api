package store

import (
	"context"
	"time"
)

// Credential refresh state of accounts (table account_credential_refresh,
// CONTRACTS §48).

// Values of RefreshState.ErrorType.
const (
	RefreshAuthRejected = "auth_rejected"
	RefreshTransient    = "transient"
)

// RefreshState is one account_credential_refresh row.
type RefreshState struct {
	AccountID        int64
	ExpiresAt        *time.Time
	LastAttemptAt    *time.Time
	LastSuccessAt    *time.Time
	ErrorType        string
	Error            string
	RejectedCredHash []byte
}

// AccountRefreshStates returns the refresh state of the given accounts;
// accounts without a row are absent from the map.
func (d *DB) AccountRefreshStates(ctx context.Context, ids []int64) (map[int64]*RefreshState, error) {
	out := map[int64]*RefreshState{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := d.Pool.Query(ctx, `SELECT account_id, expires_at, last_attempt_at, last_success_at, error_type, error, rejected_cred_hash
		FROM account_credential_refresh WHERE account_id = ANY($1)`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var s RefreshState
		if err := rows.Scan(&s.AccountID, &s.ExpiresAt, &s.LastAttemptAt, &s.LastSuccessAt, &s.ErrorType, &s.Error, &s.RejectedCredHash); err != nil {
			return nil, err
		}
		out[s.AccountID] = &s
	}
	return out, rows.Err()
}

// RecordAccountRefresh stores the outcome of one refresh attempt (in tx
// when the credentials were saved with it). A
// successful attempt (ErrorType "") sets last_success_at and clears the
// error and the rejected hash.
func RecordAccountRefresh(ctx context.Context, q Querier, s RefreshState) error {
	_, err := q.Exec(ctx, `INSERT INTO account_credential_refresh
			(account_id, expires_at, last_attempt_at, last_success_at, error_type, error, rejected_cred_hash)
		VALUES ($1, $2, now(), CASE WHEN $3 = '' THEN now() END, $3, $4, $5)
		ON CONFLICT (account_id) DO UPDATE SET
			expires_at = COALESCE(EXCLUDED.expires_at, account_credential_refresh.expires_at),
			last_attempt_at = EXCLUDED.last_attempt_at,
			last_success_at = COALESCE(EXCLUDED.last_success_at, account_credential_refresh.last_success_at),
			error_type = EXCLUDED.error_type,
			error = EXCLUDED.error,
			rejected_cred_hash = EXCLUDED.rejected_cred_hash`,
		s.AccountID, s.ExpiresAt, s.ErrorType, s.Error, s.RejectedCredHash)
	return err
}
