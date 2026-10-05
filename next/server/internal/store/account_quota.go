package store

import (
	"context"
	"encoding/json"
	"time"
)

// Account quota snapshots (table account_quota_snapshots, CONTRACTS §44).

// Values of QuotaSnapshot.Source.
const (
	QuotaPassive = "passive"
	QuotaActive  = "active"
)

// QuotaWindow is one stored quota window; the map key of
// QuotaSnapshot.Windows is its window key.
type QuotaWindow struct {
	// Utilization is in percent (0-100, more with overage).
	Utilization float64    `json:"utilization"`
	ResetsAt    *time.Time `json:"resets_at,omitempty"`
	Status      string     `json:"status,omitempty"`
	Used        int64      `json:"used,omitempty"`
	Limit       int64      `json:"limit,omitempty"`
}

// QuotaSnapshot is one account_quota_snapshots row. The JSON form is the one
// the account service caches in Redis (CONTRACTS §44.9).
type QuotaSnapshot struct {
	AccountID int64                  `json:"account_id"`
	Windows   map[string]QuotaWindow `json:"windows"`
	Source    string                 `json:"source"`
	Error     string                 `json:"error"`
	// UpdatedAt is when the windows were last written; nil = no data yet
	// (a row may exist only because an active query was attempted).
	UpdatedAt     *time.Time `json:"updated_at"`
	LastPassiveAt *time.Time `json:"last_passive_at"`
	LastActiveAt  *time.Time `json:"last_active_at"`
}

const selectQuota = `SELECT account_id, windows, source, error, updated_at, last_passive_at, last_active_at
	FROM account_quota_snapshots`

func scanQuota(r interface{ Scan(...any) error }) (*QuotaSnapshot, error) {
	var q QuotaSnapshot
	var raw []byte
	if err := r.Scan(&q.AccountID, &raw, &q.Source, &q.Error, &q.UpdatedAt, &q.LastPassiveAt, &q.LastActiveAt); err != nil {
		return nil, err
	}
	q.Windows = map[string]QuotaWindow{}
	if len(raw) > 0 {
		// A malformed document reads as "no windows" rather than failing the
		// account list it is shown in.
		_ = json.Unmarshal(raw, &q.Windows)
	}
	return &q, nil
}

// AccountQuota returns the snapshot of one account, nil when it has none.
func (d *DB) AccountQuota(ctx context.Context, accountID int64) (*QuotaSnapshot, error) {
	q, err := scanQuota(d.Pool.QueryRow(ctx, selectQuota+` WHERE account_id = $1`, accountID))
	if IsNoRows(err) {
		return nil, nil
	}
	return q, err
}

// AccountQuotas returns the snapshots of the given accounts in one query;
// accounts without one are absent from the map.
func (d *DB) AccountQuotas(ctx context.Context, accountIDs []int64) (map[int64]*QuotaSnapshot, error) {
	out := map[int64]*QuotaSnapshot{}
	if len(accountIDs) == 0 {
		return out, nil
	}
	rows, err := d.Pool.Query(ctx, selectQuota+` WHERE account_id = ANY($1)`, accountIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		q, err := scanQuota(rows)
		if err != nil {
			return nil, err
		}
		out[q.AccountID] = q
	}
	return out, rows.Err()
}

// AccountQuotasAt is AccountQuotas plus the time the read began
// (statement_timestamp of the one statement, on the database clock): the
// result reflects at least every write committed before it. Caches order
// their entries by it (CONTRACTS §44.9).
func (d *DB) AccountQuotasAt(ctx context.Context, accountIDs []int64) (map[int64]*QuotaSnapshot, time.Time, error) {
	out := map[int64]*QuotaSnapshot{}
	var at time.Time
	rows, err := d.Pool.Query(ctx, `SELECT statement_timestamp(), q.account_id, q.windows, COALESCE(q.source, ''), COALESCE(q.error, ''),
			q.updated_at, q.last_passive_at, q.last_active_at
		FROM (SELECT statement_timestamp()) t LEFT JOIN account_quota_snapshots q ON q.account_id = ANY($1)`, accountIDs)
	if err != nil {
		return nil, at, err
	}
	defer rows.Close()
	for rows.Next() {
		var id *int64
		var q QuotaSnapshot
		var raw []byte
		if err := rows.Scan(&at, &id, &raw, &q.Source, &q.Error, &q.UpdatedAt, &q.LastPassiveAt, &q.LastActiveAt); err != nil {
			return nil, at, err
		}
		if id == nil {
			continue // no snapshot at all: the row only carries the time
		}
		q.AccountID = *id
		q.Windows = map[string]QuotaWindow{}
		if len(raw) > 0 {
			_ = json.Unmarshal(raw, &q.Windows)
		}
		out[q.AccountID] = &q
	}
	return out, at, rows.Err()
}

// SaveAccountQuota merges windows into the account's snapshot (a window
// overwrites the stored one with the same key, others are kept), records the
// source, clears the error and stamps updated_at (and last_passive_at for a
// passive sample) with the database clock. An account that no longer exists
// is skipped silently.
func (d *DB) SaveAccountQuota(ctx context.Context, accountID int64, source string, windows map[string]QuotaWindow) error {
	raw, err := json.Marshal(windows)
	if err != nil {
		return err
	}
	_, err = d.Pool.Exec(ctx, `INSERT INTO account_quota_snapshots
			(account_id, windows, source, error, updated_at, last_passive_at)
		SELECT $1::bigint, $2::jsonb, $3::text, '', now(), CASE WHEN $3::text = 'passive' THEN now() END
		WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $1)
		ON CONFLICT (account_id) DO UPDATE SET
			windows = account_quota_snapshots.windows || EXCLUDED.windows,
			source = EXCLUDED.source,
			error = '',
			updated_at = now(),
			last_passive_at = COALESCE(EXCLUDED.last_passive_at, account_quota_snapshots.last_passive_at)`,
		accountID, string(raw), source)
	return err
}

// ClaimAccountQuotaQuery reserves the right to query the upstream for the
// account's quota: it stamps last_active_at and reports true, unless another
// attempt (on any node) did so less than floor ago. The row is created when
// missing.
func (d *DB) ClaimAccountQuotaQuery(ctx context.Context, accountID int64, floor time.Duration) (bool, error) {
	tag, err := d.Pool.Exec(ctx, `INSERT INTO account_quota_snapshots (account_id, last_active_at)
		SELECT $1::bigint, now() WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $1)
		ON CONFLICT (account_id) DO UPDATE SET last_active_at = now()
		WHERE account_quota_snapshots.last_active_at IS NULL
			OR account_quota_snapshots.last_active_at <= now() - make_interval(secs => $2::float8)`,
		accountID, floor.Seconds())
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// SetAccountQuotaError records the failure of an active query; the windows
// and updated_at are left as they were.
func (d *DB) SetAccountQuotaError(ctx context.Context, accountID int64, msg string) error {
	_, err := d.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET error = $2 WHERE account_id = $1`, accountID, msg)
	return err
}
