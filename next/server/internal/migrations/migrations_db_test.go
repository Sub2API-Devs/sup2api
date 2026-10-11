package migrations_test

import (
	"context"
	"testing"
	"testing/fstest"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestAPIKeyIPAllowlistMigrationPreservesKeys(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `ALTER TABLE api_keys DROP COLUMN allowed_ips;
		DROP INDEX usage_logs_client_ip_created_idx, usage_logs_api_key_created_idx;
		DELETE FROM schema_migrations WHERE id='0052_apikey_ip_allowlist.sql';
		INSERT INTO users(email,password_hash) VALUES ('legacy-ip@example.com','test');
		INSERT INTO groups(name) VALUES ('legacy-ip');
		INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash,status)
		SELECT u.id,g.id,'legacy','masked','test-hash','active' FROM users u,groups g WHERE u.email='legacy-ip@example.com' AND g.name='legacy-ip'`)
	require.NoError(t, err)
	var before, after string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_agg(to_jsonb(k) ORDER BY id)::text FROM api_keys k`).Scan(&before))
	for range 2 {
		_, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_agg(to_jsonb(k)-'allowed_ips' ORDER BY id)::text FROM api_keys k`).Scan(&after))
		require.Equal(t, before, after)
		var ips []string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT allowed_ips FROM api_keys WHERE name='legacy'`).Scan(&ips))
		require.Empty(t, ips)
	}
}

func TestAccountLifecycleMigrationPreservesExistingRuntimes(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `DROP TABLE account_lifecycle_sync,account_preparations;
		ALTER TABLE ccgateway_runtimes DROP COLUMN initial_settings;
		DELETE FROM schema_migrations WHERE id='0051_account_preparations.sql';
		INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,schedulable) VALUES('preserved','ccgateway','managed','','disabled',false);
		INSERT INTO ccgateway_runtimes(key,account_id) SELECT 'd1234567890abcdef',id FROM accounts WHERE name='preserved'`)
	require.NoError(t, err)
	query := `SELECT jsonb_build_object('accounts',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM accounts a),'runtimes',(SELECT jsonb_agg(to_jsonb(r)-'initial_settings' ORDER BY key) FROM ccgateway_runtimes r))::text`
	var before, after string
	require.NoError(t, db.Pool.QueryRow(ctx, query).Scan(&before))
	for i := range 2 {
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		if i == 0 {
			require.Equal(t, []string{"0051_account_preparations.sql"}, done)
		} else {
			require.Empty(t, done)
		}
		require.NoError(t, db.Pool.QueryRow(ctx, query).Scan(&after))
		require.Equal(t, before, after)
	}
}

func TestAutomaticStateMigrationPreservesLegacyAccounts(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `ALTER TABLE accounts DROP COLUMN auto_disabled_until,
		DROP COLUMN last_test_status,DROP COLUMN last_test_error_code,DROP COLUMN last_test_error_source;
		DELETE FROM schema_migrations WHERE id IN ('0049_account_automatic_state.sql','0050_account_test_diagnostics.sql');
		INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,status_reason,schedulable) VALUES
		('manual','fixture','key','','disabled','disabled by administrator',false),
		('legacy','fixture','key','','disabled','upstream rejected credentials (401)',true),
		('ready','fixture','key','','active','',true)`)
	require.NoError(t, err)
	var before, after string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_agg(to_jsonb(a) ORDER BY id)::text FROM accounts a`).Scan(&before))
	for i := range 2 {
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		if i == 0 {
			require.Equal(t, []string{"0049_account_automatic_state.sql", "0050_account_test_diagnostics.sql"}, done)
		} else {
			require.Empty(t, done)
		}
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT jsonb_agg(to_jsonb(a)-'auto_disabled_until'-'last_test_status'-'last_test_error_code'-'last_test_error_source' ORDER BY id)::text FROM accounts a`).Scan(&after))
		require.Equal(t, before, after)
		var indexExists, noDeadlines bool
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM pg_indexes WHERE tablename='accounts' AND indexname='accounts_auto_disabled_due_idx'),
			NOT EXISTS(SELECT 1 FROM accounts WHERE auto_disabled_until IS NOT NULL OR last_test_status IS NOT NULL OR last_test_error_code IS NOT NULL OR last_test_error_source IS NOT NULL)`).Scan(&indexExists, &noDeadlines))
		require.True(t, indexExists)
		require.True(t, noDeadlines)
	}
}

func TestLegacyProxyRealIPReplayPreservesDataAndChecksum(t *testing.T) {
	const id = "0046_proxy_real_ip.sql"
	const checksum = "1b0719bb3a07caa74ca6ad5d92e8c605e9c4f0ebea3097b96a1226ef99c4897f"
	for _, missing := range []string{"none", "real_ip", "real_ip_updated_at", "both"} {
		t.Run(missing, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := context.Background()
			ip := "198.51.100.46"
			stamp := time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)
			var proxyID int64
			err := db.Pool.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port, real_ip, real_ip_updated_at)
				VALUES ('replay-probe','http','proxy.example',8080,$1,$2) RETURNING id`, ip, stamp).Scan(&proxyID)
			require.NoError(t, err)
			if missing == "real_ip" || missing == "both" {
				_, err = db.Pool.Exec(ctx, `ALTER TABLE proxies DROP COLUMN real_ip`)
				require.NoError(t, err)
			}
			if missing == "real_ip_updated_at" || missing == "both" {
				_, err = db.Pool.Exec(ctx, `ALTER TABLE proxies DROP COLUMN real_ip_updated_at`)
				require.NoError(t, err)
			}
			_, err = db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id >= $1`, id)
			require.NoError(t, err)
			done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
			require.NoError(t, err)
			require.Contains(t, done, id)
			var gotIP *string
			var gotTime *time.Time
			require.NoError(t, db.Pool.QueryRow(ctx, `SELECT real_ip, real_ip_updated_at FROM proxies WHERE id=$1`, proxyID).Scan(&gotIP, &gotTime))
			if missing == "real_ip" || missing == "both" {
				require.Nil(t, gotIP)
			} else {
				require.NotNil(t, gotIP)
				require.Equal(t, ip, *gotIP)
			}
			if missing == "real_ip_updated_at" || missing == "both" {
				require.Nil(t, gotTime)
			} else {
				require.NotNil(t, gotTime)
				require.True(t, stamp.Equal(*gotTime))
			}
			var recorded string
			require.NoError(t, db.Pool.QueryRow(ctx, `SELECT checksum FROM schema_migrations WHERE id=$1`, id).Scan(&recorded))
			require.Equal(t, checksum, recorded)
			done, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
			require.NoError(t, err)
			require.Empty(t, done)
		})
	}
}

func TestLegacyProxyRealIPCompatibilityRequiresExactIdentity(t *testing.T) {
	const original = "0046_proxy_real_ip.sql"
	for _, changed := range []string{"name", "body", "applied_body"} {
		t.Run(changed, func(t *testing.T) {
			db := testutil.DB(t)
			ctx := context.Background()
			body, err := migrations.FS.ReadFile(original)
			require.NoError(t, err)
			name := original
			if changed == "name" {
				name = "9999_proxy_real_ip.sql"
			} else {
				body = append(body, '\n')
				if changed == "body" {
					_, err = db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id=$1`, original)
					require.NoError(t, err)
				}
			}
			_, err = store.Migrate(ctx, db, fstest.MapFS{name: {Data: body}}, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
			if changed == "applied_body" {
				require.ErrorContains(t, err, "modified after being applied")
			} else {
				require.ErrorContains(t, err, "already exists")
			}
			var recorded bool
			require.NoError(t, db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE id=$1)`, name).Scan(&recorded))
			require.Equal(t, changed == "applied_body", recorded)
		})
	}
}

// Every migration from FirstIdempotentMigration on must survive a second
// run on a database that already has it: forget them and migrate again.
func TestMigrationsFromFirstIdempotentRunTwice(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	tag, err := db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id >= $1`, migrations.FirstIdempotentMigration)
	if err != nil {
		t.Fatal(err)
	}
	if tag.RowsAffected() == 0 {
		t.Fatalf("%s is not among the applied migrations", migrations.FirstIdempotentMigration)
	}
	again, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	if err != nil {
		t.Fatalf("second run: %v", err)
	}
	if int64(len(again)) != tag.RowsAffected() {
		t.Fatalf("re-applied %v, want the %d forgotten migrations", again, tag.RowsAffected())
	}
}

// 0048 removes what plugins brought into sticky sessions and keeps it out:
// only built-in and admin rules, never a plugin-computed session value.
func TestStickyRulesCoreOnly(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `
		ALTER TABLE sticky_rules DROP CONSTRAINT sticky_rules_core_only;
		INSERT INTO plugins (key, name, status) VALUES ('acme_sticky', '{"en":"x"}', 'enabled');
		INSERT INTO sticky_rules (name, source, plugin_key, key_sources) VALUES
			('from-plugin', 'plugin_default', 'acme_sticky', '[{"type":"header","name":"x"}]'),
			('plugin-value', 'admin', NULL, '[{"type":"user"},{"type":"plugin"}]'),
			('kept', 'admin', NULL, '[{"type":"header","name":"x-session"}]');
		DELETE FROM schema_migrations WHERE id >= '0048'`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey}); err != nil {
		t.Fatal(err)
	}
	var names []string
	rows, err := db.Pool.Query(ctx, `SELECT name FROM sticky_rules WHERE source = 'admin' OR plugin_key IS NOT NULL ORDER BY name`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var n string
		_ = rows.Scan(&n)
		names = append(names, n)
	}
	rows.Close()
	if len(names) != 1 || names[0] != "kept" {
		t.Fatalf("rules after 0048: %v", names)
	}
	for _, bad := range []string{
		`INSERT INTO sticky_rules (name, source, key_sources) VALUES ('x', 'plugin_default', '[{"type":"user"}]')`,
		`INSERT INTO sticky_rules (name, source, plugin_key, key_sources) VALUES ('x', 'admin', 'acme_sticky', '[{"type":"user"}]')`,
		`INSERT INTO sticky_rules (name, source, key_sources) VALUES ('x', 'admin', '[{"type":"plugin"}]')`,
	} {
		if _, err := db.Pool.Exec(ctx, bad); err == nil {
			t.Fatalf("accepted: %s", bad)
		}
	}
}

// 0027 keeps proxies that existed before it working, once: a re-run must not
// let proxies saved since reach private addresses.
func TestSecurityHardeningDoesNotReopenPrivateProxies(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	var id int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO proxies (name, protocol, host, port, allow_private)
		VALUES ('later', 'http', '10.0.0.1', 8080, false) RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id >= '0027'`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey}); err != nil {
		t.Fatal(err)
	}
	var allow bool
	if err := db.Pool.QueryRow(ctx, `SELECT allow_private FROM proxies WHERE id = $1`, id).Scan(&allow); err != nil {
		t.Fatal(err)
	}
	if allow {
		t.Fatal("re-running 0027 opened private addresses to a proxy saved after it")
	}
}
