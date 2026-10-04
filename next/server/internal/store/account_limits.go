package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
)

// LimitsWindow represents one time-based usage limit window.
type LimitsWindow struct {
	Label   string    `json:"label"`
	Seconds int64     `json:"seconds"`
	Used    int64     `json:"used"`
	Limit   int64     `json:"limit"`
	ResetAt time.Time `json:"reset_at"`
}

// LimitsSnapshot is the complete snapshot of an account's subscription limits.
type LimitsSnapshot struct {
	Windows   []LimitsWindow `json:"windows"`
	UpdatedAt time.Time      `json:"updated_at"`
	Provider  string         `json:"provider"`
}

// AccountLimitsRow represents a row in account_subscription_limits table.
type AccountLimitsRow struct {
	AccountID      int64
	LimitsSnapshot LimitsSnapshot
	DisabledAt     sql.NullTime
	ResumeAt       sql.NullTime
	LastQueriedAt  time.Time
	QueryCount     int
	LastError      string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// GetAccountLimits retrieves the cached subscription limits for an account.
// Returns nil if no cache exists.
func (d *DB) GetAccountLimits(ctx context.Context, accountID int64) (*AccountLimitsRow, error) {
	const query = `
		SELECT account_id, limits_snapshot, disabled_at, resume_at,
		       last_queried_at, query_count, last_error, created_at, updated_at
		FROM account_subscription_limits
		WHERE account_id = $1
	`

	var row AccountLimitsRow
	var snapshotJSON []byte

	err := d.Pool.QueryRow(ctx, query, accountID).Scan(
		&row.AccountID,
		&snapshotJSON,
		&row.DisabledAt,
		&row.ResumeAt,
		&row.LastQueriedAt,
		&row.QueryCount,
		&row.LastError,
		&row.CreatedAt,
		&row.UpdatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(snapshotJSON, &row.LimitsSnapshot); err != nil {
		return nil, err
	}

	return &row, nil
}

// UpsertAccountLimits inserts or updates the subscription limits cache.
func (d *DB) UpsertAccountLimits(ctx context.Context, accountID int64, snapshot LimitsSnapshot, lastError string) error {
	snapshotJSON, err := json.Marshal(snapshot)
	if err != nil {
		return err
	}

	const query = `
		INSERT INTO account_subscription_limits (
			account_id, limits_snapshot, last_queried_at, query_count, last_error
		) VALUES ($1, $2, now(), 1, $3)
		ON CONFLICT (account_id) DO UPDATE SET
			limits_snapshot = EXCLUDED.limits_snapshot,
			last_queried_at = now(),
			query_count = account_subscription_limits.query_count + 1,
			last_error = EXCLUDED.last_error,
			updated_at = now()
	`

	_, err = d.Pool.Exec(ctx, query, accountID, snapshotJSON, lastError)
	return err
}

// ClearAccountLimits removes the cached limits and recovery markers for an account.
func (d *DB) ClearAccountLimits(ctx context.Context, accountID int64) error {
	const query = `
		DELETE FROM account_subscription_limits
		WHERE account_id = $1
	`
	_, err := d.Pool.Exec(ctx, query, accountID)
	return err
}

// ClearAccountLimitsMarkers clears the disabled_at and resume_at markers without deleting the cache.
func (d *DB) ClearAccountLimitsMarkers(ctx context.Context, accountID int64) error {
	const query = `
		UPDATE account_subscription_limits
		SET disabled_at = NULL,
		    resume_at = NULL,
		    updated_at = now()
		WHERE account_id = $1
	`
	_, err := d.Pool.Exec(ctx, query, accountID)
	return err
}

// ListAccountsDueForResume returns accounts whose resume_at is in the past.
// Used by the auto-recovery background task (Phase 4, not implemented yet).
func (d *DB) ListAccountsDueForResume(ctx context.Context, limit int) ([]int64, error) {
	const query = `
		SELECT account_id
		FROM account_subscription_limits
		WHERE resume_at IS NOT NULL
		  AND resume_at <= now()
		ORDER BY resume_at
		LIMIT $1
	`

	rows, err := d.Pool.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var accountIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		accountIDs = append(accountIDs, id)
	}

	return accountIDs, rows.Err()
}

// SetAccountLimitsResumeAt sets the auto-recovery marker for an account.
// Used when an account is disabled due to exhausted limits.
func (d *DB) SetAccountLimitsResumeAt(ctx context.Context, accountID int64, resumeAt time.Time) error {
	const query = `
		UPDATE account_subscription_limits
		SET disabled_at = now(),
		    resume_at = $2,
		    updated_at = now()
		WHERE account_id = $1
	`
	_, err := d.Pool.Exec(ctx, query, accountID, resumeAt)
	return err
}

// GetAccountLimitsBatch retrieves limits for multiple accounts in one query.
// Used for batch operations or dashboard views.
func (d *DB) GetAccountLimitsBatch(ctx context.Context, accountIDs []int64) (map[int64]*AccountLimitsRow, error) {
	if len(accountIDs) == 0 {
		return make(map[int64]*AccountLimitsRow), nil
	}

	const query = `
		SELECT account_id, limits_snapshot, disabled_at, resume_at,
		       last_queried_at, query_count, last_error, created_at, updated_at
		FROM account_subscription_limits
		WHERE account_id = ANY($1)
	`

	rows, err := d.Pool.Query(ctx, query, accountIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64]*AccountLimitsRow)
	for rows.Next() {
		var row AccountLimitsRow
		var snapshotJSON []byte

		err := rows.Scan(
			&row.AccountID,
			&snapshotJSON,
			&row.DisabledAt,
			&row.ResumeAt,
			&row.LastQueriedAt,
			&row.QueryCount,
			&row.LastError,
			&row.CreatedAt,
			&row.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(snapshotJSON, &row.LimitsSnapshot); err != nil {
			return nil, err
		}

		result[row.AccountID] = &row
	}

	return result, rows.Err()
}

// CleanupStaleAccountLimits removes limits cache older than the given age.
// Used for maintenance/cleanup tasks.
func (d *DB) CleanupStaleAccountLimits(ctx context.Context, olderThan time.Duration) (int64, error) {
	const query = `
		DELETE FROM account_subscription_limits
		WHERE last_queried_at < $1
		  AND resume_at IS NULL
	`
	threshold := time.Now().Add(-olderThan)
	tag, err := d.Pool.Exec(ctx, query, threshold)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}
