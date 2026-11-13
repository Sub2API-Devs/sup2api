package migrations_test

import (
	"context"
	"fmt"
	"testing"
	"testing/fstest"
	"time"

	"github.com/jackc/pgx/v5"
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

// quota_used starts from what each key was charged, then follows every charge
// through the usage_logs trigger (CONTRACTS §61); rerunning the migration
// keeps a reset, and deleting usage rows gives nothing back.
func TestAPIKeyQuotaMigrationAndTrigger(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	used := func() string {
		t.Helper()
		var v string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT quota_used::text FROM api_keys WHERE name='quota'`).Scan(&v))
		return v
	}
	migrate := func() {
		t.Helper()
		_, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
	}
	usage := func(rid, status, cost string) {
		t.Helper()
		exec(`INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, protocol, endpoint, status_code, success, total_cost, billing_status)
			SELECT $1, k.user_id, k.id, k.group_id, 'anthropic.messages', '/v1/messages', 200, true, $3::numeric, $2 FROM api_keys k WHERE k.name='quota'`, rid, status, cost)
	}
	exec(`DROP TRIGGER apikey_quota_track ON usage_logs; DROP FUNCTION apikey_quota_track(); DROP FUNCTION apikey_quota_charge(text, numeric);
		ALTER TABLE api_keys DROP COLUMN quota_limit, DROP COLUMN quota_used;
		DELETE FROM schema_migrations WHERE id='0059_apikey_quota.sql';
		INSERT INTO users(email,password_hash) VALUES ('quota@example.com','test');
		INSERT INTO groups(name) VALUES ('quota');
		INSERT INTO api_keys(user_id,group_id,name,key_prefix,key_hash)
		SELECT u.id,g.id,'quota','masked','quota-hash' FROM users u,groups g WHERE u.email='quota@example.com' AND g.name='quota'`)
	for i, r := range [][2]string{{"billed", "1.5"}, {"reserved", "0.5"}, {"free", "2"}, {"failed", "3"}, {"pending", "4"}} {
		usage(fmt.Sprint("old-", i), r[0], r[1])
	}
	migrate()
	require.Equal(t, "2.00000000", used(), "billed and reserved rows so far")

	usage("new", "pending", "0")
	exec(`UPDATE usage_logs SET total_cost = 0.25, billing_status = 'billed' WHERE request_id = 'new'`)
	require.Equal(t, "2.25000000", used(), "settled")
	exec(`UPDATE usage_logs SET total_cost = 0.75 WHERE request_id = 'old-1'`)
	require.Equal(t, "2.50000000", used(), "reconciled")
	exec(`UPDATE usage_logs SET total_cost = 0, billing_status = 'free' WHERE request_id = 'old-0'`)
	require.Equal(t, "1.00000000", used(), "refunded")
	exec(`DELETE FROM usage_logs WHERE request_id = 'new'`)
	require.Equal(t, "1.00000000", used(), "deleting history gives nothing back")

	exec(`UPDATE api_keys SET quota_used = 0 WHERE name='quota'`)
	exec(`DELETE FROM schema_migrations WHERE id='0059_apikey_quota.sql'`)
	migrate()
	require.Equal(t, "0.00000000", used(), "a rerun keeps the reset")
}

// 0063 brings back accounts.spm_limit (CONTRACTS §71): values left from the
// SPM removed in 2026-10 are cleared once, values set afterwards survive a
// re-run, and the column keeps its range.
func TestAccountSPMLimitMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) error {
		_, err := db.Pool.Exec(ctx, sql)
		return err
	}
	spm := func() (v int) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT spm_limit FROM accounts WHERE name='spm'`).Scan(&v))
		return v
	}
	migrate := func() []string {
		t.Helper()
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		return done
	}
	const forget = `DELETE FROM schema_migrations WHERE id='0063_account_spm_limit.sql'`
	require.NoError(t, exec(`ALTER TABLE accounts DROP CONSTRAINT accounts_spm_limit_chk;
		COMMENT ON COLUMN accounts.spm_limit IS NULL;
		INSERT INTO accounts(name,plugin_key,type,credentials_enc,spm_limit) VALUES('spm','fixture','apikey','',7);
		`+forget))
	require.Equal(t, []string{"0063_account_spm_limit.sql"}, migrate())
	require.Equal(t, 0, spm(), "a cap from the removed SPM came back")

	require.NoError(t, exec(`UPDATE accounts SET spm_limit = 3 WHERE name='spm'; `+forget))
	migrate()
	require.Equal(t, 3, spm(), "a rerun cleared a cap set after the migration")
	require.Error(t, exec(`UPDATE accounts SET spm_limit = 10000001 WHERE name='spm'`))
}

// 0094 adds accounts.spm_window_seconds (CONTRACTS §71.1): existing accounts
// count sessions over 60 seconds as before, a re-run keeps what was set, and
// the column keeps its range.
func TestAccountSPMWindowMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) error {
		_, err := db.Pool.Exec(ctx, sql)
		return err
	}
	window := func() (v int) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT spm_window_seconds FROM accounts WHERE name='window'`).Scan(&v))
		return v
	}
	migrate := func() []string {
		t.Helper()
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		return done
	}
	const forget = `DELETE FROM schema_migrations WHERE id='0094_account_spm_window.sql'`
	require.NoError(t, exec(`ALTER TABLE accounts DROP COLUMN spm_window_seconds;
		INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES('window','fixture','apikey','');
		`+forget))
	require.Equal(t, []string{"0094_account_spm_window.sql"}, migrate())
	require.Equal(t, 60, window(), "an existing account changed window")

	require.NoError(t, exec(`UPDATE accounts SET spm_window_seconds = 86400 WHERE name='window'; `+forget))
	migrate()
	require.Equal(t, 86400, window(), "a rerun reset the window")
	require.Error(t, exec(`UPDATE accounts SET spm_window_seconds = 59 WHERE name='window'`))
	require.Error(t, exec(`UPDATE accounts SET spm_window_seconds = 86401 WHERE name='window'`))
}

// 0064 and 0068 sum an account's usage (CONTRACTS §73): existing rows are
// backfilled once, then the trigger journals settlement, reconcile, refunds
// and a moved account, and account_usage_fold sums the journal; deleting
// history takes nothing back and a re-run counts nothing twice.
func TestAccountUsageMigrationAndTrigger(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	fold := func() {
		t.Helper()
		exec(`SELECT account_usage_fold(2)`) // a small batch: folding takes several statements
		exec(`SELECT account_usage_fold(1000)`)
	}
	totals := func(name string) string {
		t.Helper()
		fold()
		var v string
		err := db.Pool.QueryRow(ctx, `SELECT coalesce((SELECT cost::text||' '||raw_cost::text||' '||requests||' '||tokens
			FROM account_usage_totals WHERE account_id=(SELECT id FROM accounts WHERE name=$1)),'none')`, name).Scan(&v)
		require.NoError(t, err)
		return v
	}
	hourly := func(name string) string {
		t.Helper()
		fold()
		var v string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT coalesce(sum(cost),0)::text||' '||count(*) FROM account_usage_hourly
			WHERE account_id=(SELECT id FROM accounts WHERE name=$1)`, name).Scan(&v))
		return v
	}
	migrate := func() {
		t.Helper()
		_, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
	}
	usage := func(rid, account, status, cost, detail, rate string, success bool, at string) {
		t.Helper()
		exec(`INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
			total_cost, billing_status, billing_detail, rate_multiplier, input_tokens, output_tokens, cache_read_tokens, created_at)
			VALUES ($1, 1, 1, 1, (SELECT id FROM accounts WHERE name=$2), 'anthropic.messages', '/v1/messages', 200, $7,
			$4::numeric, $3, $5::jsonb, $6::numeric, 10, 5, 100, $8::timestamptz)`, rid, account, status, cost, detail, rate, success, at)
	}
	exec(`DROP TRIGGER account_usage_track ON usage_logs; DROP FUNCTION account_usage_track(); DROP FUNCTION account_usage_add(bigint, timestamptz, numeric, numeric, bigint, bigint);
		DROP FUNCTION account_usage_fold(int);
		DROP TABLE account_usage_totals, account_usage_hourly, account_usage_limits, account_usage_deltas;
		DELETE FROM schema_migrations WHERE id IN ('0064_account_usage.sql', '0068_account_usage_journal.sql');
		INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES ('a','fixture','apikey',''), ('b','fixture','apikey','')`)
	usage("old-billed", "a", "billed", "1.2", `{"cost":"1.0"}`, "1.2", true, "2026-10-01T10:15:00Z")
	usage("old-no-detail", "a", "billed", "0.6", `{}`, "1.5", true, "2026-10-01T10:45:00Z")
	usage("old-free", "a", "free", "0", `{"cost":"9"}`, "1", true, "2026-10-01T11:00:00Z")
	usage("old-failed", "a", "failed", "0", `{}`, "1", false, "2026-10-01T11:30:00Z")
	migrate()
	require.Equal(t, "1.80000000 1.40000000 3 460", totals("a"), "billed rows cost; raw from billing_detail.cost or cost / multiplier; successful rows count")
	require.Equal(t, "1.80000000 2", hourly("a"), "two UTC hours")

	usage("new", "a", "pending", "0", `{}`, "2", true, "2026-10-02T00:05:00Z")
	require.Equal(t, "1.80000000 1.40000000 4 575", totals("a"), "pending: request and tokens, no cost yet")
	exec(`UPDATE usage_logs SET total_cost = 0.5, billing_status = 'billed', billing_detail = '{"cost":"0.25"}' WHERE request_id = 'new'`)
	require.Equal(t, "2.30000000 1.65000000 4 575", totals("a"), "settled")
	exec(`UPDATE usage_logs SET total_cost = 0, billing_status = 'free', success = false WHERE request_id = 'old-billed'`)
	require.Equal(t, "1.10000000 0.65000000 3 575", totals("a"), "refunded")
	exec(`UPDATE usage_logs SET account_id = (SELECT id FROM accounts WHERE name='b') WHERE request_id = 'new'`)
	require.Equal(t, "0.60000000 0.40000000 2 460", totals("a"), "moved away")
	require.Equal(t, "0.50000000 0.25000000 1 115", totals("b"), "moved here")
	exec(`DELETE FROM usage_logs WHERE request_id = 'old-no-detail'`)
	require.Equal(t, "0.60000000 0.40000000 2 460", totals("a"), "deleting history takes nothing back")
	usage("tiny", "b", "billed", "0", `{"cost":"0.000000525"}`, "0", true, "2026-10-02T01:00:00Z")
	require.Equal(t, "0.50000000 0.25000053 2 230", totals("b"), "billing_detail.cost with more than 8 decimals, rounded; a free group still has raw cost")

	// Two settler batches writing the same accounts in opposite orders: the
	// journal takes no row locks, so neither waits on the other (0064's
	// in-place sums deadlocked here).
	tx1, err := db.Pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx1.Rollback(ctx) }()
	tx2, err := db.Pool.Begin(ctx)
	require.NoError(t, err)
	defer func() { _ = tx2.Rollback(ctx) }()
	insert := func(tx pgx.Tx, rid, account string) {
		t.Helper()
		_, err := tx.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
			total_cost, billing_status, rate_multiplier, input_tokens, output_tokens)
			VALUES ($1, 1, 1, 1, (SELECT id FROM accounts WHERE name=$2), 'anthropic.messages', '/v1/messages', 200, true, 1, 'billed', 1, 1, 1)`, rid, account)
		require.NoError(t, err)
	}
	insert(tx1, "batch1-a", "a")
	insert(tx2, "batch2-b", "b")
	insert(tx1, "batch1-b", "b")
	insert(tx2, "batch2-a", "a")
	require.NoError(t, tx1.Commit(ctx))
	require.NoError(t, tx2.Commit(ctx))
	require.Equal(t, "2.60000000 2.40000000 4 464", totals("a"))

	exec(`DELETE FROM schema_migrations WHERE id IN ('0064_account_usage.sql', '0068_account_usage_journal.sql')`)
	migrate()
	require.Equal(t, "2.60000000 2.40000000 4 464", totals("a"), "a re-run does not backfill again")
}

// 0095 adds segments (CONTRACTS §97): every user joins the default one,
// except those who were granted private groups one by one, who become
// personal and keep exactly those grants. A re-run does not undo what an
// administrator changed since, and a user inserted without a segment joins
// the default one.
func TestSegmentsMigrationBackfill(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql)
		require.NoError(t, err)
	}
	text := func(sql string) (v string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, sql).Scan(&v))
		return v
	}
	migrate := func() []string {
		t.Helper()
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		return done
	}
	// segmentOf is "default", "personal" or the name of a named segment.
	segmentOf := func(email string) string {
		return text(`SELECT CASE WHEN s.is_default THEN 'default' WHEN s.kind = 'personal' THEN 'personal' ELSE s.name END
			FROM users u JOIN segments s ON s.id = u.segment_id WHERE u.email = '` + email + `'`)
	}
	// grantsOf lists the private groups granted to the personal segment of a user.
	grantsOf := func(email string) string {
		return text(`SELECT string_agg(g.name, ',' ORDER BY g.name) FROM segment_groups sg
			JOIN groups g ON g.id = sg.group_id JOIN segments s ON s.id = sg.segment_id
			JOIN users u ON u.id = s.user_id WHERE u.email = '` + email + `' AND sg.granted`)
	}
	const forget = `DELETE FROM schema_migrations WHERE id='0095_segments.sql'`
	exec(`ALTER TABLE users DROP COLUMN segment_id;
		DROP TABLE price_rules, segment_groups, segments;
		DROP FUNCTION default_segment_id();
		INSERT INTO groups(name, visibility) VALUES ('seg-private', 'restricted'), ('seg-private-2', 'restricted'), ('seg-public', 'public');
		INSERT INTO users(email, password_hash) VALUES ('granted@seg', ''), ('other@seg', ''), ('public-only@seg', ''), ('plain@seg', '');
		INSERT INTO users(email, password_hash, deleted_at) VALUES ('deleted@seg', '', now());
		INSERT INTO user_groups(user_id, group_id)
		SELECT u.id, g.id FROM users u JOIN groups g ON (u.email, g.name) IN (
			('granted@seg', 'seg-private'), ('granted@seg', 'seg-private-2'), ('granted@seg', 'seg-public'),
			('other@seg', 'seg-private-2'),
			('public-only@seg', 'seg-public'), ('deleted@seg', 'seg-private'));
		` + forget)
	require.Equal(t, []string{"0095_segments.sql"}, migrate())

	require.Equal(t, "personal", segmentOf("granted@seg"))
	require.Equal(t, "personal", segmentOf("other@seg"))
	require.Equal(t, "default", segmentOf("public-only@seg"), "a grant of a public group made a user personal")
	require.Equal(t, "default", segmentOf("plain@seg"))
	require.Equal(t, "default", segmentOf("deleted@seg"), "a deleted user got a personal segment")
	require.Equal(t, "seg-private,seg-private-2", grantsOf("granted@seg"), "the personal segment keeps every private grant, and those only")
	require.Equal(t, "seg-private-2", grantsOf("other@seg"), "a personal segment got the grants of another user")
	require.Equal(t, "3", text(`SELECT count(*)::text FROM segment_groups`))
	require.Equal(t, "default", text(`SELECT string_agg(DISTINCT CASE WHEN o.is_default THEN 'default' ELSE o.name END, ',') FROM segments s
		JOIN segments o ON o.id = s.origin_id WHERE s.kind = 'personal'`))

	// An insert that does not name the column, as an older binary makes it.
	exec(`INSERT INTO users(email, password_hash) VALUES ('later@seg', '')`)
	require.Equal(t, "default", segmentOf("later@seg"))

	// Moved back to the default segment since: a re-run leaves the user there.
	exec(`UPDATE users SET segment_id = default_segment_id() WHERE email IN ('granted@seg', 'other@seg');
		DELETE FROM segments WHERE kind = 'personal'; ` + forget)
	migrate()
	require.Equal(t, "default", segmentOf("granted@seg"), "a rerun made the user personal again")
	require.Equal(t, "default", segmentOf("other@seg"), "a rerun made the user personal again")
	require.Equal(t, "1", text(`SELECT count(*)::text FROM segments`))

	_, err := db.Pool.Exec(ctx, `INSERT INTO segments(kind, name) VALUES ('named', '默认')`)
	require.Error(t, err, "two segments share a name")
	_, err = db.Pool.Exec(ctx, `INSERT INTO segments(kind, name) VALUES ('personal', '')`)
	require.Error(t, err, "a personal segment without its user")
	_, err = db.Pool.Exec(ctx, `UPDATE segments SET discount = 0 WHERE is_default`)
	require.Error(t, err, "a discount of 0")
}

// 0097 adds assignable roles (decisions 3-5): a non-superuser role holding
// role:manage (removed since the split, still counted) or role:assign may
// assign every custom role and the built-in ones but admin and the
// superuser role; other roles get nothing. A re-run does not undo what an
// administrator changed since.
func TestRoleAssignableMigrationBackfill(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql)
		require.NoError(t, err)
	}
	migrate := func() []string {
		t.Helper()
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		return done
	}
	// assignable is "<assign_custom>:<assignable keys>" of a role.
	assignable := func(key string) (v string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT r.assign_custom::text || ':' || COALESCE(string_agg(a.key, ',' ORDER BY a.key), '')
			FROM roles r LEFT JOIN role_assignable_roles ra ON ra.role_id = r.id LEFT JOIN roles a ON a.id = ra.assignable_role_id
			WHERE r.key = $1 GROUP BY r.assign_custom`, key).Scan(&v))
		return v
	}
	const forget = `DELETE FROM schema_migrations WHERE id='0097_role_assignable.sql'`
	exec(`DROP TABLE role_assignable_roles;
		ALTER TABLE roles DROP COLUMN assign_custom;
		INSERT INTO roles (key, name, builtin, superuser) VALUES
			('super_admin', '{}', true, true), ('admin', '{}', true, false), ('operator', '{}', true, false), ('user', '{}', true, false),
			('delegator', '{}', false, false), ('assigner', '{}', false, false), ('plain', '{}', false, false);
		INSERT INTO permissions (key, module, label, source, status) VALUES
			('role:manage', 'role', '{}', 'core', 'removed'), ('role:assign', 'role', '{}', 'core', 'active'), ('user:read', 'user', '{}', 'core', 'active');
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r JOIN permissions p ON (r.key, p.key) IN (
			('super_admin', 'role:manage'), ('admin', 'role:manage'), ('operator', 'role:manage'),
			('delegator', 'role:manage'), ('assigner', 'role:assign'), ('plain', 'user:read'));
		` + forget)
	require.Equal(t, []string{"0097_role_assignable.sql"}, migrate())

	for _, key := range []string{"admin", "operator", "delegator", "assigner"} {
		require.Equal(t, "true:operator,user", assignable(key), key)
	}
	for _, key := range []string{"super_admin", "user", "plain"} {
		require.Equal(t, "false:", assignable(key), key)
	}

	// Narrowed since: a re-run leaves it so.
	exec(`UPDATE roles SET assign_custom = false WHERE key = 'delegator';
		DELETE FROM role_assignable_roles WHERE role_id = (SELECT id FROM roles WHERE key = 'delegator');
		` + forget)
	require.Equal(t, []string{"0097_role_assignable.sql"}, migrate())
	require.Equal(t, "false:", assignable("delegator"), "a rerun widened the role again")
	require.Equal(t, "true:operator,user", assignable("admin"))
}

// 0099 takes the super-only permissions (decision D2) back from the built-in
// admin and operator roles, auditing each one as the system and moving the
// authz version; custom roles, other permissions and a role holding none of
// them are left alone, and a database with nothing to reclaim is untouched.
func TestReclaimSuperOnlyMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql)
		require.NoError(t, err)
	}
	migrate := func() {
		t.Helper()
		exec(`DELETE FROM schema_migrations WHERE id='0099_reclaim_super_only.sql'`)
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		require.Equal(t, []string{"0099_reclaim_super_only.sql"}, done)
	}
	// held is the sorted permission keys of a role.
	held := func(role string) (v string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT COALESCE(string_agg(p.key, ',' ORDER BY p.key), '')
			FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id WHERE r.key = $1`, role).Scan(&v))
		return v
	}
	version := func() (v int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v))
		return v
	}
	const all = "plugin:grant:critical,plugin:grant:db_schema_unconfined,plugin:grant:high,publisher:manage,system:update:execute,system:update:read,system:update:recover"

	// A new database: nothing to reclaim, nothing written.
	v := version()
	migrate()
	require.Equal(t, v, version())

	// The roles as the defaults before left them, a custom role granted the
	// same permissions, and a custom role that only looks built-in by key.
	exec(`INSERT INTO roles (key, name, builtin, superuser) VALUES
			('super_admin', '{}', true, true), ('admin', '{}', true, false), ('operator', '{}', true, false), ('user', '{}', true, false),
			('updater', '{}', false, false);
		INSERT INTO permissions (key, module, label, source, status) VALUES
			('plugin:grant:critical', 'plugin', '{}', 'core', 'active'), ('plugin:grant:db_schema_unconfined', 'plugin', '{}', 'core', 'active'),
			('publisher:manage', 'publisher', '{}', 'core', 'active'), ('system:update:execute', 'system_update', '{}', 'core', 'active'),
			('system:update:recover', 'system_update', '{}', 'core', 'active'),
			('plugin:grant:high', 'plugin', '{}', 'core', 'active'), ('system:update:read', 'system_update', '{}', 'core', 'active');
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT r.id, p.id FROM roles r, permissions p WHERE r.key IN ('admin', 'updater')
			OR (r.key = 'operator' AND p.key LIKE 'system:update:%')`)
	migrate()

	require.Equal(t, "plugin:grant:high,system:update:read", held("admin"))
	require.Equal(t, "system:update:read", held("operator"))
	require.Equal(t, all, held("updater"), "a custom role lost its grants")
	require.Equal(t, v+1, version())
	// One audit row per grant taken back, by the system.
	var audited string
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT string_agg(a.detail->>'role' || '=' || (a.detail->>'key'), ' ' ORDER BY a.detail->>'role', a.detail->>'key')
		FROM audit_logs a JOIN roles r ON r.id::text = a.target_id AND r.key = a.detail->>'role'
		WHERE a.action = 'authz.reclaim.super_only' AND a.target_type = 'role' AND a.user_id IS NULL`).Scan(&audited))
	require.Equal(t, "admin=plugin:grant:critical admin=plugin:grant:db_schema_unconfined admin=publisher:manage admin=system:update:execute admin=system:update:recover "+
		"operator=system:update:execute operator=system:update:recover", audited)

	// Granted again by a super admin since: only a forgotten migration row
	// would run the file again, and then nothing else changes.
	migrate()
	require.Equal(t, v+1, version())
	require.Equal(t, all, held("updater"))
}

// 0101 narrows the built-in operator role's assignable list, which 0097
// generated, to decision 5: supplier and user, no custom roles. It is audited
// as the system and moves the authz version; the operator's permissions,
// every other role's list and a list already right are left alone.
func TestOperatorAssignableMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql)
		require.NoError(t, err)
	}
	migrate := func() {
		t.Helper()
		exec(`DELETE FROM schema_migrations WHERE id='0101_operator_assignable.sql'`)
		done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
		require.Equal(t, []string{"0101_operator_assignable.sql"}, done)
	}
	// assignable is "<assign_custom>:<assignable keys>" of a role.
	assignable := func(key string) (v string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT r.assign_custom::text || ':' || COALESCE(string_agg(a.key, ',' ORDER BY a.key), '')
			FROM roles r LEFT JOIN role_assignable_roles ra ON ra.role_id = r.id LEFT JOIN roles a ON a.id = ra.assignable_role_id
			WHERE r.key = $1 GROUP BY r.assign_custom`, key).Scan(&v))
		return v
	}
	version := func() (v int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v))
		return v
	}
	audits := func() (n int, detail string) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*), COALESCE((array_agg(a.detail::text ORDER BY a.id DESC))[1], '')
			FROM audit_logs a JOIN roles r ON r.id::text = a.target_id AND r.key = 'operator'
			WHERE a.action = 'role.assignable' AND a.target_type = 'role' AND a.user_id IS NULL`).Scan(&n, &detail))
		return n, detail
	}

	// A new database has no roles: nothing written.
	v := version()
	migrate()
	require.Equal(t, v, version())

	// Production after 0097, before the supplier role exists: operator and
	// admin assign {operator, user} and every custom role. A custom role
	// has a list too.
	exec(`INSERT INTO roles (key, name, builtin, superuser, assign_custom) VALUES
			('super_admin', '{}', true, true, false), ('admin', '{}', true, false, true), ('operator', '{}', true, false, true),
			('user', '{}', true, false, false), ('helper', '{}', false, false, true);
		INSERT INTO role_assignable_roles (role_id, assignable_role_id)
		SELECT r.id, a.id FROM roles r JOIN roles a ON a.key IN ('operator', 'user', 'helper') WHERE r.key IN ('admin', 'operator', 'helper');
		INSERT INTO permissions (key, module, label, source) VALUES ('user:read', 'user', '{}', 'core');
		INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = 'operator'`)
	migrate()
	require.Equal(t, "false:user", assignable("operator"))
	require.Equal(t, "true:helper,operator,user", assignable("admin"))
	require.Equal(t, "true:helper,operator,user", assignable("helper"))
	require.Equal(t, v+1, version())
	var perms int
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.key = 'operator'`).Scan(&perms))
	require.Equal(t, 1, perms, "the operator's permissions changed")
	n, detail := audits()
	require.Equal(t, 1, n)
	require.JSONEq(t, `{"via":"migration 0101","role_keys":["user"],"assign_custom":false,"added":[],"removed":["helper","operator"],"removed_assign_custom":true}`, detail)

	// With the supplier role there (an upgrade from a version that had it,
	// or a forgotten migration row): both are on the list afterwards, also
	// when an entry is missing; a list already right writes nothing.
	exec(`INSERT INTO roles (key, name, builtin) VALUES ('supplier', '{}', true);
		DELETE FROM role_assignable_roles WHERE role_id = (SELECT id FROM roles WHERE key = 'operator')`)
	migrate()
	require.Equal(t, "false:supplier,user", assignable("operator"))
	require.Equal(t, v+2, version())
	n, detail = audits()
	require.Equal(t, 2, n)
	require.JSONEq(t, `{"via":"migration 0101","role_keys":["supplier","user"],"assign_custom":false,"added":["supplier","user"],"removed":[],"removed_assign_custom":false}`, detail)
	migrate()
	require.Equal(t, v+2, version())
	n, _ = audits()
	require.Equal(t, 2, n)

	// A custom role that merely has the key is not the built-in operator.
	exec(`UPDATE roles SET builtin = false, assign_custom = true WHERE key = 'operator'`)
	migrate()
	require.Equal(t, "true:supplier,user", assignable("operator"))
}

// 0098 keeps one super admin (decisions 1 and 2): a soft-deleted holder loses
// the role, two undeleted holders (whatever their status) stop the
// migration naming both, and afterwards a second superuser role or holder
// fails at commit while a transfer, deleting before it inserts, commits.
func TestOneSuperAdminMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql)
		require.NoError(t, err)
	}
	id := func(email string) (v int64) {
		t.Helper()
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, email).Scan(&v))
		return v
	}
	holders := func() []int64 {
		t.Helper()
		rows, err := db.Pool.Query(ctx, `SELECT user_id FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.superuser`)
		require.NoError(t, err)
		ids, err := pgx.CollectRows(rows, pgx.RowTo[int64])
		require.NoError(t, err)
		return ids
	}
	migrate := func() ([]string, error) {
		return store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	}
	const grant = `INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE r.superuser AND u.email = `
	exec(`DROP TRIGGER user_roles_one_superuser ON user_roles;
		DROP FUNCTION user_roles_one_superuser();
		DROP INDEX roles_one_superuser;
		DELETE FROM schema_migrations WHERE id = '0098_one_super_admin.sql';
		INSERT INTO roles (key, name, builtin, superuser) VALUES ('super_admin', '{}', true, true);
		INSERT INTO users (email, password_hash) VALUES ('a@su', ''), ('b@su', '');
		INSERT INTO users (email, password_hash, status) VALUES ('disabled@su', '', 'disabled');
		INSERT INTO users (email, password_hash, deleted_at) VALUES ('deleted@su', '', now());
		` + grant + `'a@su';` + grant + `'disabled@su';` + grant + `'deleted@su'`)

	_, err := migrate()
	require.ErrorContains(t, err, fmt.Sprintf("several super admins: %d (a@su), %d (disabled@su);", id("a@su"), id("disabled@su")))
	require.ErrorContains(t, err, "sub2api admin recover-superadmin --email")

	exec(`DELETE FROM user_roles WHERE user_id = (SELECT id FROM users WHERE email = 'disabled@su')`)
	done, err := migrate()
	require.NoError(t, err)
	require.Equal(t, []string{"0098_one_super_admin.sql"}, done)
	require.Equal(t, []int64{id("a@su")}, holders(), "the deleted holder kept the role")

	_, err = db.Pool.Exec(ctx, grant+`'b@su'`)
	require.True(t, store.IsUniqueViolation(err, "user_roles_one_superuser"), "a second holder: %v", err)
	_, err = db.Pool.Exec(ctx, `INSERT INTO roles (key, name, builtin, superuser) VALUES ('root2', '{}', false, true)`)
	require.True(t, store.IsUniqueViolation(err, "roles_one_superuser"), "a second superuser role: %v", err)

	require.NoError(t, db.Tx(ctx, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, grant+`'b@su'`); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `DELETE FROM user_roles WHERE user_id = $1`, id("a@su"))
		return err
	}), "a transfer, checked at commit")
	require.Equal(t, []int64{id("b@su")}, holders())
}

// Two transactions each adding a different holder and committing together:
// the advisory lock makes the later commit count the earlier holder, so
// exactly one commits. Both commits are held at the lock until both wait.
func TestOneSuperAdminConcurrentCommits(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `INSERT INTO roles (key, name, builtin, superuser) VALUES ('super_admin', '{}', true, true);
		INSERT INTO users (email, password_hash) VALUES ('a@su', ''), ('b@su', '')`)
	require.NoError(t, err)
	const lock = `hashtext('user_roles_one_superuser')`
	gate, err := db.Pool.Acquire(ctx)
	require.NoError(t, err)
	defer gate.Release()
	_, err = gate.Exec(ctx, `SELECT pg_advisory_lock(`+lock+`)`)
	require.NoError(t, err)

	errs := make(chan error, 2)
	for _, email := range []string{"a@su", "b@su"} {
		tx, err := db.Pool.Begin(ctx)
		require.NoError(t, err)
		_, err = tx.Exec(ctx, `INSERT INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE r.superuser AND u.email = $1`, email)
		require.NoError(t, err)
		go func() { errs <- tx.Commit(ctx) }()
	}
	require.Eventually(t, func() bool {
		var n int
		return gate.QueryRow(ctx, `SELECT count(*) FROM pg_locks WHERE locktype = 'advisory' AND NOT granted
			AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`).Scan(&n) == nil && n == 2
	}, 10*time.Second, 20*time.Millisecond, "both commits wait on the lock")
	_, err = gate.Exec(ctx, `SELECT pg_advisory_unlock(`+lock+`)`)
	require.NoError(t, err)

	first, second := <-errs, <-errs
	if first != nil {
		first, second = second, first
	}
	require.NoError(t, first)
	require.True(t, store.IsUniqueViolation(second, "user_roles_one_superuser"), "the second holder: %v", second)
}
