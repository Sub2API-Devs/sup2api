package store_test

import (
	"context"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/jackc/pgx/v5"

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

// Core migrations are immutable once applied; plugin migrations, which are
// idempotent by contract, run again when their content changed.
func TestChangedMigrationIsRefusedForCoreAndRerunForPlugins(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	tr := memTracker{}
	fsys := fstest.MapFS{"0001.sql": {Data: []byte(`CREATE TEMP TABLE IF NOT EXISTS rerun_probe (n int); INSERT INTO rerun_probe VALUES (1);`)}}
	if done, err := store.Migrate(ctx, db, fsys, tr, store.MigrateOptions{LockKey: 42}); err != nil || len(done) != 1 {
		t.Fatalf("first run: %v %v", done, err)
	}
	fsys["0001.sql"] = &fstest.MapFile{Data: []byte(`CREATE TEMP TABLE IF NOT EXISTS rerun_probe (n int);`)}
	if _, err := store.Migrate(ctx, db, fsys, tr, store.MigrateOptions{LockKey: 42}); err == nil || !strings.Contains(err.Error(), "modified after being applied") {
		t.Fatalf("strict run accepted a changed migration: %v", err)
	}
	done, err := store.Migrate(ctx, db, fsys, tr, store.MigrateOptions{LockKey: 42, RerunChanged: true})
	if err != nil || len(done) != 1 {
		t.Fatalf("rerun: %v %v", done, err)
	}
	if done, err = store.Migrate(ctx, db, fsys, tr, store.MigrateOptions{LockKey: 42, RerunChanged: true}); err != nil || len(done) != 0 {
		t.Fatalf("unchanged after the rerun: %v %v", done, err)
	}
}

func TestLegacyProxyRealIPCompatibilityIsCoreOnly(t *testing.T) {
	db := testutil.DB(t)
	body, err := migrations.FS.ReadFile("0046_proxy_real_ip.sql")
	if err != nil {
		t.Fatal(err)
	}
	tracker := memTracker{}
	_, err = store.Migrate(context.Background(), db, fstest.MapFS{"0046_proxy_real_ip.sql": {Data: body}}, tracker, store.MigrateOptions{LockKey: 42, RerunChanged: true})
	if err == nil || !strings.Contains(err.Error(), "already exists") {
		t.Fatalf("core compatibility applied to a plugin migration: %v", err)
	}
	if len(tracker) != 0 {
		t.Fatal("failed migration was recorded")
	}
}

// memTracker keeps the applied set in memory.
type memTracker map[string]string

func (memTracker) Ensure(context.Context, store.Querier) error { return nil }
func (m memTracker) Applied(context.Context, store.Querier) (map[string]string, error) {
	out := map[string]string{}
	for k, v := range m {
		out[k] = v
	}
	return out, nil
}
func (m memTracker) Record(_ context.Context, _ pgx.Tx, id, checksum string) error {
	m[id] = checksum
	return nil
}
