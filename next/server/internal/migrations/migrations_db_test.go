package migrations_test

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

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
