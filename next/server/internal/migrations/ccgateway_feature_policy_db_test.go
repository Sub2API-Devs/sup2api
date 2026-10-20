package migrations_test

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"github.com/stretchr/testify/require"
)

func TestCC304FeatureMigrationPreservesAccountsRuntimesAndConfiguration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `DROP TABLE ccgateway_account_feature_policies;
		DELETE FROM schema_migrations WHERE id='0056_ccgateway_feature_policies.sql';
		INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,schedulable)
		VALUES('cc304-existing','ccgateway','managed','legacy-credential','disabled',false);
		INSERT INTO ccgateway_runtimes(key,account_id)
		SELECT id::text,id FROM accounts WHERE name='cc304-existing';
		INSERT INTO settings(key,value) VALUES('ccgateway_remote','{"cipher":"existing-encrypted-302-policy"}')
		ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`)
	require.NoError(t, err)
	const snapshot = `SELECT jsonb_build_object(
		'accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM accounts a),
		'runtimes',(SELECT jsonb_agg(to_jsonb(r) ORDER BY key) FROM ccgateway_runtimes r),
		'config',(SELECT value FROM settings WHERE key='ccgateway_remote'))::text`
	var before, after string
	require.NoError(t, db.Pool.QueryRow(ctx, snapshot).Scan(&before))
	done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	require.Equal(t, []string{"0056_ccgateway_feature_policies.sql"}, done)
	require.NoError(t, db.Pool.QueryRow(ctx, snapshot).Scan(&after))
	require.Equal(t, before, after, "migration must not select a CLI version or rewrite existing account/runtime/config data")
	var count int
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*) FROM ccgateway_account_feature_policies`).Scan(&count))
	require.Zero(t, count, "existing accounts inherit without a synthetic override row")

	_, err = db.Pool.Exec(ctx, `INSERT INTO ccgateway_account_feature_policies(account_id,mode,overrides)
		SELECT id,'custom','{"build_attachment_sources":{"shell":"worker"}}'
		FROM accounts WHERE name='cc304-existing'`)
	require.NoError(t, err)
	raw, err := migrations.FS.ReadFile("0056_ccgateway_feature_policies.sql")
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, string(raw))
	require.NoError(t, err, "replaying the additive migration must be safe")
	var saved string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT overrides->'build_attachment_sources'->>'shell' FROM ccgateway_account_feature_policies`).Scan(&saved))
	require.Equal(t, "worker", saved)
	done, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	require.Empty(t, done)
	require.NoError(t, db.Pool.QueryRow(ctx, snapshot).Scan(&after))
	require.Equal(t, before, after)
}
