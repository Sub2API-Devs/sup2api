package migrations_test

import (
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// 0064 backfills with the raw cost function the trigger keeps using (a
// negative billing_detail.cost falls back, more than 8 decimals round), so a
// refund of a backfilled row takes back exactly what it added; and a replay
// that finds rows still in the 0068 journal backfills nothing (they are
// counted when folded).
func TestAccountUsageBackfillMatchesTrigger(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	exec := func(sql string, args ...any) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, args...)
		require.NoError(t, err)
	}
	totals := func(name string) string {
		t.Helper()
		exec(`SELECT account_usage_fold(1000)`)
		var v string
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT coalesce((SELECT cost::text||' '||raw_cost::text||' '||requests
			FROM account_usage_totals WHERE account_id=(SELECT id FROM accounts WHERE name=$1)),'none')`, name).Scan(&v))
		return v
	}
	usage := func(rid, account, cost, detail, rate string) {
		t.Helper()
		exec(`INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
			total_cost, billing_status, billing_detail, rate_multiplier, input_tokens, output_tokens)
			VALUES ($1, 1, 1, 1, (SELECT id FROM accounts WHERE name=$2), 'anthropic.messages', '/v1/messages', 200, true,
			$3::numeric, 'billed', $4::jsonb, $5::numeric, 1, 1)`, rid, account, cost, detail, rate)
	}
	replay := func() {
		t.Helper()
		exec(`DELETE FROM schema_migrations WHERE id IN ('0064_account_usage.sql', '0068_account_usage_journal.sql')`)
		_, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
	}

	exec(`INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES ('fresh','fixture','apikey',''), ('history','fixture','apikey','')`)
	usage("journaled", "fresh", "2", `{}`, "1")
	replay()
	require.Equal(t, "2.00000000 2.00000000 1", totals("fresh"), "a row still in the journal is counted once, by the fold")

	exec(`DROP TRIGGER account_usage_track ON usage_logs; DROP FUNCTION account_usage_track(); DROP FUNCTION account_usage_add(bigint, timestamptz, numeric, numeric, bigint, bigint);
		DROP FUNCTION account_usage_fold(int);
		DROP TABLE account_usage_totals, account_usage_hourly, account_usage_limits, account_usage_deltas`)
	usage("negative", "history", "1.2", `{"cost":"-3"}`, "1.2")
	usage("long", "history", "0.3", `{"cost":"0.123456789"}`, "1")
	replay()
	require.Equal(t, "1.50000000 1.12345679 2", totals("history"), "negative raw cost falls back to cost / multiplier; 9 decimals round to 8")
	exec(`UPDATE usage_logs SET billing_status = 'free', total_cost = 0, success = false WHERE request_id IN ('negative', 'long')`)
	require.Equal(t, "0.00000000 0.00000000 0", totals("history"), "refunds take back exactly what the backfill added")
}

// period_count is bounded by the longest period of any unit (8784 hours); the
// per-unit caps are the core's.
func TestAccountUsageLimitCountConstraint(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	var id int64
	require.NoError(t, db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES ('limit','fixture','apikey','') RETURNING id`).Scan(&id))
	_, err := db.Pool.Exec(ctx, `INSERT INTO account_usage_limits (account_id, period, period_count) VALUES ($1, 'hour', 8784)`, id)
	require.NoError(t, err)
	_, err = db.Pool.Exec(ctx, `UPDATE account_usage_limits SET period_count = 8785 WHERE account_id = $1`, id)
	var pg *pgconn.PgError
	require.ErrorAs(t, err, &pg)
	require.Equal(t, "23514", pg.Code)
	require.Equal(t, "account_usage_limits_count_chk", pg.ConstraintName)
}

// accounts.auto_disabled_source (0070) is the core's mark on its own
// automatic disables. The trigger clears it when the account leaves
// auto_disabled, and when the reason or release time of the disable changes
// in a transaction that did not declare writing it (an older core during a
// rolling upgrade); the deferred disable goes with it.
func TestAccountAutoDisabledSourceTrigger(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	var id int64
	require.NoError(t, db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc) VALUES ('source','fixture','apikey','') RETURNING id`).Scan(&id))
	declared := func(sql string) {
		t.Helper()
		tx, err := db.Pool.Begin(ctx)
		require.NoError(t, err)
		defer func() { _ = tx.Rollback(ctx) }()
		_, err = tx.Exec(ctx, `SELECT set_config('sup2api.auto_disabled_source', 'written', true)`)
		require.NoError(t, err)
		_, err = tx.Exec(ctx, sql, id)
		require.NoError(t, err)
		require.NoError(t, tx.Commit(ctx))
	}
	undeclared := func(sql string) {
		t.Helper()
		_, err := db.Pool.Exec(ctx, sql, id)
		require.NoError(t, err)
	}
	state := func() string {
		t.Helper()
		var source string
		var deferred bool
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT auto_disabled_source, deferred_auto_disable FROM accounts WHERE id = $1`, id).Scan(&source, &deferred))
		return fmt.Sprintf("%q %v", source, deferred)
	}
	limit := `UPDATE accounts SET status = 'auto_disabled', status_reason = 'usage limit reached: $6.00 / $5.00 (total)', auto_disabled_until = NULL,
		auto_disabled_source = 'usage_limit' WHERE id = $1`
	hold := `UPDATE accounts SET deferred_auto_disable = true, deferred_auto_disable_reason = 'cooldown' WHERE id = $1`

	undeclared(`UPDATE accounts SET status = 'auto_disabled', status_reason = 'x', auto_disabled_source = 'usage_limit' WHERE id = $1`)
	require.Equal(t, `"" false`, state(), "entering auto_disabled undeclared: no mark")

	declared(limit)
	undeclared(hold)
	require.Equal(t, `"usage_limit" true`, state(), "the core's write keeps it; holding a disable back touches neither reason nor release")
	declared(`UPDATE accounts SET status_reason = 'usage limit reached: $6.00 / $5.50 (total)', auto_disabled_source = 'usage_limit' WHERE id = $1`)
	require.Equal(t, `"usage_limit" true`, state(), "the limit rewriting its own reason keeps the mark")
	undeclared(`UPDATE accounts SET updated_at = now(), schedulable = false WHERE id = $1`)
	require.Equal(t, `"usage_limit" true`, state(), "other columns leave it alone")

	undeclared(`UPDATE accounts SET status_reason = 'banned' WHERE id = $1`)
	require.Equal(t, `"" false`, state(), "an older core's reason over the limit's: no longer the limit's")
	declared(limit)
	undeclared(hold)
	undeclared(`UPDATE accounts SET auto_disabled_until = now() + interval '1 hour' WHERE id = $1`)
	require.Equal(t, `"" false`, state(), "nor with its release time")

	declared(limit)
	undeclared(hold)
	undeclared(`UPDATE accounts SET status = 'active', status_reason = '' WHERE id = $1`)
	require.Equal(t, `"" false`, state(), "leaving auto_disabled clears both")
	declared(`UPDATE accounts SET status = 'auto_disabled', status_reason = 'cooldown', auto_disabled_source = '' WHERE id = $1`)
	undeclared(hold)
	require.Equal(t, `"" false`, state(), "only the limit's disable holds another back")
}
