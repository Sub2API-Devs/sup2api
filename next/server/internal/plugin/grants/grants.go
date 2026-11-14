// Package grants decides which host permission grants an instance of a
// plugin version runs with (CONTRACTS §5.7). plugin_permission_grants holds
// what the active version is granted; a consent to a version that is not
// active yet while another one runs is staged (plugin_staged_grants) and
// reaches instances of that version only, until the rollout commit
// promotes it or an abandoned upgrade withdraws it.
package grants

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// VersionRows is a FROM item (alias g) of the grant rows an instance of
// key@version ($1, $2) runs with, in the columns of plugin_permission_grants
// a reader needs: the set staged for that version when there is one (it is
// complete), else the plugin's grants.
const VersionRows = `(
	SELECT permission, scope, status, version AS plugin_version, granted_by, granted_at
	FROM plugin_staged_grants WHERE plugin_key = $1 AND version = $2
	UNION ALL
	SELECT permission, scope, status, plugin_version, granted_by, granted_at
	FROM plugin_permission_grants WHERE plugin_key = $1
	  AND NOT EXISTS (SELECT 1 FROM plugin_staged_grants WHERE plugin_key = $1 AND version = $2)) g`

// Granted returns permission -> scope of what an instance of key@version is
// granted, limited to the host permissions its manifest declares: a grant
// made for another version never reaches it.
func Granted(ctx context.Context, q store.Querier, key, version string, declared []manifest.HostPermission) (map[string]json.RawMessage, error) {
	out := map[string]json.RawMessage{}
	if len(declared) == 0 {
		return out, nil
	}
	ids := make([]string, len(declared))
	for i, hp := range declared {
		ids[i] = hp.ID
	}
	rows, err := q.Query(ctx, `SELECT permission, scope FROM `+VersionRows+`
		WHERE status = 'granted' AND permission = ANY($3)`, key, version, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var perm string
		var scope []byte
		if err := rows.Scan(&perm, &scope); err != nil {
			return nil, err
		}
		if len(scope) == 0 {
			scope = []byte("{}")
		}
		out[perm] = scope
	}
	return out, rows.Err()
}

// Holds reports whether key@version is granted permission now, with exactly
// scope unless it is nil: the per-call check behind an instance's cached
// grants, and the rollout's check of db.schema before migrating.
func Holds(ctx context.Context, q store.Querier, key, version, permission string, scope []byte) (bool, error) {
	var ok bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM `+VersionRows+`
		WHERE permission = $3 AND status = 'granted' AND ($4::jsonb IS NULL OR scope = $4::jsonb))`, key, version, permission, scope).Scan(&ok)
	return ok, err
}

// Decision is one host permission decision of a consent.
type Decision struct {
	Permission string
	Scope      []byte
	Status     string
}

// Record writes the decisions of a consent to key@version: staged while
// another version runs, else as the plugin's grants.
func Record(ctx context.Context, tx pgx.Tx, key, version, manifestHash string, by *int64, staged bool, ds []Decision) error {
	sql := `INSERT INTO plugin_permission_grants (plugin_key, plugin_version, manifest_hash, granted_by, permission, scope, status, granted_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now())
		ON CONFLICT (plugin_key, permission) DO UPDATE SET
		  scope = EXCLUDED.scope, status = EXCLUDED.status, plugin_version = EXCLUDED.plugin_version,
		  manifest_hash = EXCLUDED.manifest_hash, granted_by = EXCLUDED.granted_by, granted_at = now()`
	if staged {
		sql = `INSERT INTO plugin_staged_grants (plugin_key, version, manifest_hash, granted_by, permission, scope, status, granted_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, now())
			ON CONFLICT (plugin_key, version, permission) DO UPDATE SET
			  scope = EXCLUDED.scope, status = EXCLUDED.status, manifest_hash = EXCLUDED.manifest_hash,
			  granted_by = EXCLUDED.granted_by, granted_at = now()`
	}
	for _, d := range ds {
		if _, err := tx.Exec(ctx, sql, key, version, manifestHash, by, d.Permission, d.Scope, d.Status); err != nil {
			return err
		}
	}
	return nil
}

// Promote makes the set staged for version the plugin's grants; the rollout
// commit calls it when version becomes active (nothing staged: no-op).
func Promote(ctx context.Context, tx pgx.Tx, key, version string) error {
	_, err := tx.Exec(ctx, `
		WITH staged AS (DELETE FROM plugin_staged_grants WHERE plugin_key = $1 AND version = $2 RETURNING *)
		INSERT INTO plugin_permission_grants (plugin_key, permission, scope, status, plugin_version, manifest_hash, granted_by, granted_at)
		SELECT plugin_key, permission, scope, status, version, manifest_hash, granted_by, granted_at FROM staged
		ON CONFLICT (plugin_key, permission) DO UPDATE SET
		  scope = EXCLUDED.scope, status = EXCLUDED.status, plugin_version = EXCLUDED.plugin_version,
		  manifest_hash = EXCLUDED.manifest_hash, granted_by = EXCLUDED.granted_by, granted_at = EXCLUDED.granted_at`, key, version)
	return err
}

// Withdraw takes back the set staged for version when its upgrade is
// abandoned (reason: the rollout's final phase): the version waits for a
// new consent, and the system audits plugin.grants.withdraw with the
// permissions that were granted. Nothing staged: no-op.
func Withdraw(ctx context.Context, tx pgx.Tx, key, version, reason string) error {
	var (
		n       int
		granted []string
	)
	if err := tx.QueryRow(ctx, `
		WITH gone AS (DELETE FROM plugin_staged_grants WHERE plugin_key = $1 AND version = $2 RETURNING permission, status)
		SELECT count(*), COALESCE(array_agg(permission ORDER BY permission) FILTER (WHERE status = 'granted'), '{}') FROM gone`,
		key, version).Scan(&n, &granted); err != nil || n == 0 {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE plugin_versions SET consent_status = 'awaiting_consent'
		WHERE plugin_key = $1 AND version = $2 AND consent_status = 'approved'`, key, version); err != nil {
		return err
	}
	return audit.Audit(ctx, tx, 0, "plugin.grants.withdraw", "plugin", key, map[string]any{
		"version": version, "reason": reason, "permissions": granted,
	})
}

// Revoke marks permission revoked wherever key grants it: the plugin's
// grants and every staged set (an emergency revocation must not come back
// with the next activation). It reports whether a grant was revoked.
func Revoke(ctx context.Context, tx pgx.Tx, key, permission string, by *int64) (bool, error) {
	var n int
	err := tx.QueryRow(ctx, `
		WITH active AS (UPDATE plugin_permission_grants SET status = 'revoked', granted_by = $3, granted_at = now()
			WHERE plugin_key = $1 AND permission = $2 AND status = 'granted' RETURNING 1),
		staged AS (UPDATE plugin_staged_grants SET status = 'revoked', granted_by = $3, granted_at = now()
			WHERE plugin_key = $1 AND permission = $2 AND status = 'granted' RETURNING 1)
		SELECT (SELECT count(*) FROM active) + (SELECT count(*) FROM staged)`, key, permission, by).Scan(&n)
	return n > 0, err
}
