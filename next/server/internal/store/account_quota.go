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
	Utilization        float64    `json:"utilization"`
	UtilizationUnknown bool       `json:"utilization_unknown,omitempty"`
	ResetsAt           *time.Time `json:"resets_at,omitempty"`
	Status             string     `json:"status,omitempty"`
	Used               int64      `json:"used,omitempty"`
	Limit              int64      `json:"limit,omitempty"`
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
	Revision      int64      `json:"revision"`
	Generation    int64      `json:"generation"`
	NextCheckAt   *time.Time `json:"next_check_at,omitempty"`
	RefreshStatus string     `json:"refresh_status"`
}

const selectQuota = `SELECT account_id, windows, source, error, updated_at, last_passive_at, last_active_at, revision, next_check_at, refresh_status, generation
	FROM account_quota_snapshots`

func scanQuota(r interface{ Scan(...any) error }) (*QuotaSnapshot, error) {
	var q QuotaSnapshot
	var raw []byte
	if err := r.Scan(&q.AccountID, &raw, &q.Source, &q.Error, &q.UpdatedAt, &q.LastPassiveAt, &q.LastActiveAt, &q.Revision, &q.NextCheckAt, &q.RefreshStatus, &q.Generation); err != nil {
		return nil, err
	}
	q.Windows = map[string]QuotaWindow{}
	if len(raw) > 0 {
		// A malformed document reads as "no windows" rather than failing the
		// account list it is shown in.
		if err := json.Unmarshal(raw, &q.Windows); err != nil {
			return nil, err
		}
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
			q.updated_at, q.last_passive_at, q.last_active_at, COALESCE(q.revision,0), q.next_check_at, COALESCE(q.refresh_status,'pending'), COALESCE(q.generation,0)
		FROM (SELECT statement_timestamp()) t LEFT JOIN account_quota_snapshots q ON q.account_id = ANY($1)`, accountIDs)
	if err != nil {
		return nil, at, err
	}
	defer rows.Close()
	for rows.Next() {
		var id *int64
		var q QuotaSnapshot
		var raw []byte
		if err := rows.Scan(&at, &id, &raw, &q.Source, &q.Error, &q.UpdatedAt, &q.LastPassiveAt, &q.LastActiveAt, &q.Revision, &q.NextCheckAt, &q.RefreshStatus, &q.Generation); err != nil {
			return nil, at, err
		}
		if id == nil {
			continue // no snapshot at all: the row only carries the time
		}
		q.AccountID = *id
		q.Windows = map[string]QuotaWindow{}
		if len(raw) > 0 {
			if err := json.Unmarshal(raw, &q.Windows); err != nil {
				return nil, at, err
			}
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
func (d *DB) SaveAccountQuota(ctx context.Context, accountID int64, source string, windows map[string]QuotaWindow, next ...time.Time) error {
	var nextAt *time.Time
	if len(next) > 0 {
		nextAt = &next[0]
	}
	raw, err := json.Marshal(windows)
	if err != nil {
		return err
	}
	_, err = d.Pool.Exec(ctx, `INSERT INTO account_quota_snapshots
			(account_id, windows, source, error, updated_at, last_passive_at, revision, refresh_status, next_check_at)
		SELECT $1::bigint, $2::jsonb, $3::text, '', clock_timestamp(), CASE WHEN $3::text = 'passive' THEN clock_timestamp() END, 1, 'ready', $4::timestamptz
		WHERE EXISTS (SELECT 1 FROM accounts WHERE id = $1 AND deleted_at IS NULL)
		ON CONFLICT (account_id) DO UPDATE SET
			windows = account_quota_snapshots.windows || EXCLUDED.windows,
			source = EXCLUDED.source,
			error = '',
			updated_at = clock_timestamp(),
			revision = account_quota_snapshots.revision + 1,
			refresh_status = 'ready',
			next_check_at = CASE WHEN account_quota_snapshots.auto_refresh AND $4::timestamptz IS NOT NULL THEN LEAST(account_quota_snapshots.next_check_at,$4::timestamptz) ELSE account_quota_snapshots.next_check_at END,
			last_passive_at = COALESCE(EXCLUDED.last_passive_at, account_quota_snapshots.last_passive_at)`,
		accountID, string(raw), source, nextAt)
	return err
}

func (d *DB) ApplyAccountQuotaObservation(ctx context.Context, accountID, expectedGeneration int64, pluginKey, accountType, pluginVersion string, windows map[string]QuotaWindow, next *time.Time) (bool, error) {
	if expectedGeneration <= 0 || len(windows) == 0 {
		return false, nil
	}
	raw, err := json.Marshal(windows)
	if err != nil {
		return false, err
	}
	tag, err := d.Pool.Exec(ctx, `UPDATE account_quota_snapshots q SET windows=q.windows||$6::jsonb,
		source='passive',last_passive_at=clock_timestamp(),revision=q.revision+1,
		next_check_at=CASE WHEN q.auto_refresh AND $7::timestamptz IS NOT NULL THEN LEAST(q.next_check_at,$7::timestamptz) ELSE q.next_check_at END
		WHERE q.account_id=$1 AND q.generation=$2 AND EXISTS(
			SELECT 1 FROM accounts a JOIN plugins p ON p.key=a.plugin_key
			WHERE a.id=q.account_id AND a.plugin_key=$3 AND a.type=$4 AND a.deleted_at IS NULL AND a.status='active'
			AND p.status IN ('enabled','upgrading') AND p.active_version=$5)`, accountID, expectedGeneration, pluginKey, accountType, pluginVersion, string(raw), next)
	return err == nil && tag.RowsAffected() == 1, err
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
	_, err := d.Pool.Exec(ctx, `UPDATE account_quota_snapshots SET error = $2, refresh_status='error', revision=revision+1 WHERE account_id = $1`, accountID, msg)
	return err
}

type QuotaClaim struct {
	AccountID, Generation, Token, Revision int64
	Failures                               int
	PluginRevision                         string
	Initial                                bool
}

func EnsureAccountQuota(ctx context.Context, q Querier, id int64, pluginRevision string, automatic bool) error {
	_, err := q.Exec(ctx, `INSERT INTO account_quota_snapshots(account_id,plugin_revision,auto_refresh,next_check_at)
		SELECT id,$2,$3,CASE WHEN $3 THEN now() END FROM accounts WHERE id=$1 AND deleted_at IS NULL
		ON CONFLICT(account_id) DO UPDATE SET plugin_revision=$2,auto_refresh=$3,
		generation=CASE WHEN account_quota_snapshots.plugin_revision<>$2 THEN nextval('account_quota_generation_seq') ELSE account_quota_snapshots.generation END,
		lease_until=CASE WHEN account_quota_snapshots.plugin_revision<>$2 THEN NULL ELSE account_quota_snapshots.lease_until END,
		revision=account_quota_snapshots.revision+1,
		next_check_at=CASE WHEN NOT $3 THEN NULL WHEN account_quota_snapshots.plugin_revision<>$2 THEN now() ELSE COALESCE(account_quota_snapshots.next_check_at,now()) END
		WHERE account_quota_snapshots.plugin_revision<>$2 OR account_quota_snapshots.auto_refresh<>$3`, id, pluginRevision, automatic)
	return err
}

func ResetAccountQuota(ctx context.Context, q Querier, id int64) error {
	_, err := q.Exec(ctx, `UPDATE account_quota_snapshots SET windows='{}',source='',error='',updated_at=NULL,last_passive_at=NULL,
		generation=nextval('account_quota_generation_seq'),revision=revision+1,lease_until=NULL,failures=0,
		refresh_status='pending',next_check_at=CASE WHEN auto_refresh THEN now() END WHERE account_id=$1`, id)
	return err
}

func (d *DB) LeaseAccountQuota(ctx context.Context, id int64, pluginRevision string, floor, lease time.Duration, force bool) (*QuotaClaim, error) {
	var c QuotaClaim
	err := d.Pool.QueryRow(ctx, `UPDATE account_quota_snapshots q SET last_active_at=clock_timestamp(),
		lease_token=nextval('account_quota_generation_seq'),lease_until=clock_timestamp()+make_interval(secs=>$4::float8)
		WHERE account_id=$1 AND plugin_revision=$2
		AND (lease_until IS NULL OR lease_until<=clock_timestamp())
		AND ($3::float8<=0 OR last_active_at IS NULL OR last_active_at<=clock_timestamp()-make_interval(secs=>$3::float8))
		AND ($5 OR next_check_at IS NULL OR next_check_at<=clock_timestamp())
		AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=q.account_id AND a.deleted_at IS NULL AND a.status='active'
		AND ($5 OR a.schedulable OR q.updated_at IS NULL)
		AND NOT EXISTS(SELECT 1 FROM plugins p WHERE p.key=a.plugin_key AND p.status NOT IN ('enabled','upgrading')))
		RETURNING account_id,generation,lease_token,revision,failures,plugin_revision,updated_at IS NULL`, id, pluginRevision, floor.Seconds(), lease.Seconds(), force).
		Scan(&c.AccountID, &c.Generation, &c.Token, &c.Revision, &c.Failures, &c.PluginRevision, &c.Initial)
	if IsNoRows(err) {
		return nil, nil
	}
	return &c, err
}

func (d *DB) AccountQuotaClaimValid(ctx context.Context, c *QuotaClaim) (bool, error) {
	var ok bool
	err := d.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM account_quota_snapshots q JOIN accounts a ON a.id=q.account_id
		WHERE q.account_id=$1 AND q.generation=$2 AND q.lease_token=$3 AND q.lease_until>clock_timestamp()
		AND a.deleted_at IS NULL AND a.status='active'
		AND NOT EXISTS(SELECT 1 FROM plugins p WHERE p.key=a.plugin_key AND p.status NOT IN ('enabled','upgrading')))`, c.AccountID, c.Generation, c.Token).Scan(&ok)
	return ok, err
}

func (d *DB) ReleaseAccountQuotaQuery(ctx context.Context, c *QuotaClaim, next time.Time) (bool, error) {
	tag, err := d.Pool.Exec(ctx, `UPDATE account_quota_snapshots q SET lease_until=NULL,
		next_check_at=CASE WHEN revision<>$5 THEN next_check_at ELSE GREATEST($4::timestamptz,clock_timestamp()+interval '30 seconds') END
		WHERE account_id=$1 AND generation=$2 AND lease_token=$3 AND lease_until>clock_timestamp()
		AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=q.account_id AND a.deleted_at IS NULL AND a.status='active'
		AND NOT EXISTS(SELECT 1 FROM plugins p WHERE p.key=a.plugin_key AND p.status NOT IN ('enabled','upgrading')))`, c.AccountID, c.Generation, c.Token, next, c.Revision)
	return err == nil && tag.RowsAffected() == 1, err
}

func (d *DB) CompleteAccountQuota(ctx context.Context, c *QuotaClaim, windows map[string]QuotaWindow, msg string, next time.Time) (bool, error) {
	if windows == nil {
		windows = map[string]QuotaWindow{}
	}
	raw, err := json.Marshal(windows)
	if err != nil {
		return false, err
	}
	tag, err := d.Pool.Exec(ctx, `UPDATE account_quota_snapshots q SET
		windows=CASE WHEN $5='' AND revision=$7 THEN windows||$4::jsonb ELSE windows END,
		source=CASE WHEN $5='' AND revision=$7 THEN 'active' ELSE source END,
		updated_at=CASE WHEN $5='' AND revision=$7 THEN clock_timestamp() ELSE updated_at END,
		error=CASE WHEN revision=$7 THEN $5 ELSE error END,
		refresh_status=CASE WHEN revision<>$7 THEN refresh_status WHEN $5='' THEN 'ready' ELSE 'error' END,
		failures=CASE WHEN revision<>$7 THEN failures WHEN $5='' THEN 0 ELSE LEAST(failures+1,10) END,
		next_check_at=CASE WHEN revision<>$7 THEN next_check_at ELSE $6::timestamptz END,lease_until=NULL,revision=revision+1
		WHERE account_id=$1 AND generation=$2 AND lease_token=$3 AND lease_until>clock_timestamp()
		AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=q.account_id AND a.deleted_at IS NULL AND a.status='active'
		AND NOT EXISTS(SELECT 1 FROM plugins p WHERE p.key=a.plugin_key AND p.status NOT IN ('enabled','upgrading')))`, c.AccountID, c.Generation, c.Token, string(raw), msg, next, c.Revision)
	return err == nil && tag.RowsAffected() == 1, err
}
