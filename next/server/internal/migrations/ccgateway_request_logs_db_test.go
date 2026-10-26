package migrations_test

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/stretchr/testify/require"
)

// 0061 adds the per-account request log levels (CONTRACTS §65): a new table
// only, empty after the upgrade (every account follows the default), safe to
// run again, full always with full_until, rows gone with their account.
func TestAccountRequestLogsMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `DROP TABLE ccgateway_account_request_logs;
		DELETE FROM schema_migrations WHERE id='0061_ccgateway_account_request_logs.sql';
		INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('rl-existing','ccgateway','managed',''::bytea)`)
	require.NoError(t, err)
	const snapshot = `SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM accounts a))::text`
	var before, after string
	require.NoError(t, db.Pool.QueryRow(ctx, snapshot).Scan(&before))
	done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	require.Equal(t, []string{"0061_ccgateway_account_request_logs.sql"}, done)
	require.NoError(t, db.Pool.QueryRow(ctx, snapshot).Scan(&after))
	require.Equal(t, before, after)
	var count int
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_account_request_logs`).Scan(&count))
	require.Zero(t, count, "existing accounts follow the default without a row")

	var id int64
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT id FROM accounts WHERE name='rl-existing'`).Scan(&id))
	for _, bad := range []string{
		`INSERT INTO ccgateway_account_request_logs(account_id,level) VALUES($1,'full')`,
		`INSERT INTO ccgateway_account_request_logs(account_id,level,full_until) VALUES($1,'summary',now())`,
		`INSERT INTO ccgateway_account_request_logs(account_id,level) VALUES($1,'follow')`,
		`INSERT INTO ccgateway_account_request_logs(account_id,level) VALUES($1+1000000,'off')`,
	} {
		_, err := db.Pool.Exec(ctx, bad, id)
		require.Error(t, err, bad)
	}
	_, err = db.Pool.Exec(ctx, `INSERT INTO ccgateway_account_request_logs(account_id,level,full_until,updated_by) VALUES($1,'full',now()+interval '1 hour',NULL)`, id)
	require.NoError(t, err)
	raw, err := migrations.FS.ReadFile("0061_ccgateway_account_request_logs.sql")
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, string(raw))
	require.NoError(t, err, "replaying the migration must be safe")
	var level string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT level FROM ccgateway_account_request_logs WHERE account_id=$1`, id).Scan(&level))
	require.Equal(t, "full", level, "a replay keeps the rows")
	_, err = db.Pool.Exec(ctx, `DELETE FROM accounts WHERE id=$1`, id)
	require.NoError(t, err)
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_account_request_logs`).Scan(&count))
	require.Zero(t, count, "the row goes with its account")
}
