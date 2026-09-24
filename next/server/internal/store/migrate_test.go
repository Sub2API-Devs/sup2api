package store_test

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestCoreMigrationsApplyAndAreIdempotent(t *testing.T) {
	db := testutil.DB(t) // applies migrations once
	ctx := context.Background()

	again, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	if err != nil {
		t.Fatalf("second run: %v", err)
	}
	if len(again) != 0 {
		t.Fatalf("second run applied %v, want nothing", again)
	}

	var n int
	if err := db.Pool.QueryRow(ctx,
		`SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n < 30 {
		t.Fatalf("expected the full core schema, got %d tables", n)
	}
}
