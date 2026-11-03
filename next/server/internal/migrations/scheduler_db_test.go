package migrations_test

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/sdk/testpg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// The River schema applied by the core migrations is the one the pinned
// River expects: rivermigrate finds every version and nothing to do.
func TestRiverSchemaIsCurrent(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	migrator, err := rivermigrate.New(riverpgxv5.New(db.Pool), nil)
	require.NoError(t, err)
	res, err := migrator.Validate(ctx, nil)
	require.NoError(t, err)
	require.True(t, res.OK, "rivermigrate validation: %v", res.Messages)
	existing, err := migrator.ExistingVersions(ctx)
	require.NoError(t, err)
	require.Len(t, existing, len(migrator.AllVersions()))
	for _, table := range []string{"river_job", "river_leader", "river_queue", "river_notification", "river_migration", "scheduled_tasks"} {
		var ok bool
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT to_regclass($1) IS NOT NULL`, table).Scan(&ok))
		require.True(t, ok, table)
	}
}

// The core runs its migrations with the same non-superuser role it serves
// with (Supabase); River's schema must not need more.
func TestCoreMigrationsAsNonSuperuser(t *testing.T) {
	base := testpg.URL(t)
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, base)
	require.NoError(t, err)
	defer admin.Close(ctx)
	role := fmt.Sprintf("mig_%d_%d", os.Getpid(), time.Now().UnixNano()%1_000_000)
	_, err = admin.Exec(ctx, "CREATE ROLE "+role+" LOGIN PASSWORD 'pw' NOSUPERUSER NOCREATEDB NOCREATEROLE")
	require.NoError(t, err)
	_, err = admin.Exec(ctx, "CREATE DATABASE "+role+" OWNER "+role)
	require.NoError(t, err)
	t.Cleanup(func() {
		c, err := pgx.Connect(context.Background(), base)
		if err != nil {
			return
		}
		defer c.Close(context.Background())
		_, _ = c.Exec(context.Background(), "DROP DATABASE IF EXISTS "+role+" WITH (FORCE)")
		_, _ = c.Exec(context.Background(), "DROP ROLE IF EXISTS "+role)
	})
	u, err := url.Parse(base)
	require.NoError(t, err)
	u.User = url.UserPassword(role, "pw")
	u.Path = "/" + role
	db, err := store.Open(ctx, u.String())
	require.NoError(t, err)
	defer db.Close()
	var super bool
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT rolsuper FROM pg_roles WHERE rolname = current_user`).Scan(&super))
	require.False(t, super)
	for range 2 {
		_, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
		require.NoError(t, err)
	}
	var versions int
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT count(*) FROM river_migration WHERE line = 'main'`).Scan(&versions))
	require.Equal(t, 8, versions)
}

// status_changed_at moves only when status, auto_disabled_until or
// schedulable change (ACCOUNT-RUNTIME-PARKING-DESIGN §3).
func TestAccountStatusChangedAtTrigger(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	var id int64
	require.NoError(t, db.Pool.QueryRow(ctx, `INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,schedulable)
		VALUES('parking','ccgateway','managed','','active',true) RETURNING id`).Scan(&id))
	at := func() time.Time {
		var ts *time.Time
		require.NoError(t, db.Pool.QueryRow(ctx, `SELECT status_changed_at FROM accounts WHERE id=$1`, id).Scan(&ts))
		require.NotNil(t, ts)
		return *ts
	}
	set := func(sql string) {
		// Each statement is its own transaction, so now() moves on.
		time.Sleep(5 * time.Millisecond)
		_, err := db.Pool.Exec(ctx, sql, id)
		require.NoError(t, err)
	}
	inserted := at()

	set(`UPDATE accounts SET last_used_at=now(), name='renamed' WHERE id=$1`)
	require.Equal(t, inserted, at(), "other columns must not move it")
	set(`UPDATE accounts SET status_changed_at='2000-01-01' WHERE id=$1`)
	require.Equal(t, inserted, at(), "writers cannot set it")
	set(`UPDATE accounts SET status='active' WHERE id=$1`)
	require.Equal(t, inserted, at(), "an unchanged value does not move it")

	prev := inserted
	for _, change := range []string{
		`UPDATE accounts SET status='disabled' WHERE id=$1`,
		`UPDATE accounts SET auto_disabled_until=now()+interval '1 hour' WHERE id=$1`,
		`UPDATE accounts SET schedulable=false WHERE id=$1`,
	} {
		set(change)
		now := at()
		require.True(t, now.After(prev), change)
		prev = now
	}
}

// Existing accounts start counting from the migration, not from updated_at,
// and running 0085 again leaves the times alone.
func TestAccountRuntimeParkingMigrationBackfill(t *testing.T) {
	db := testutil.DB(t)
	ctx := t.Context()
	_, err := db.Pool.Exec(ctx, `DROP TRIGGER accounts_status_changed_at ON accounts;
		ALTER TABLE accounts DROP COLUMN status_changed_at;
		ALTER TABLE ccgateway_runtimes DROP COLUMN parked_at, DROP COLUMN woken_at, DROP COLUMN blocked_revision, DROP COLUMN blocked_at;
		DELETE FROM schema_migrations WHERE id='0085_account_runtime_parking.sql';
		INSERT INTO accounts(name,plugin_key,type,credentials_enc,status,schedulable,updated_at)
		VALUES('legacy-red','ccgateway','managed','','disabled',false,'2020-01-01')`)
	require.NoError(t, err)
	started := time.Now().Add(-time.Minute)
	done, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	require.Equal(t, []string{"0085_account_runtime_parking.sql"}, done)
	var first time.Time
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT status_changed_at FROM accounts WHERE name='legacy-red'`).Scan(&first))
	require.True(t, first.After(started), "backfilled from the migration time, got %v", first)

	_, err = db.Pool.Exec(ctx, `DELETE FROM schema_migrations WHERE id='0085_account_runtime_parking.sql'`)
	require.NoError(t, err)
	_, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	require.NoError(t, err)
	var again time.Time
	require.NoError(t, db.Pool.QueryRow(ctx, `SELECT status_changed_at FROM accounts WHERE name='legacy-red'`).Scan(&again))
	require.Equal(t, first, again)
}
