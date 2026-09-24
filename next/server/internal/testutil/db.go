// Package testutil provides shared test infrastructure.
package testutil

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var dbSeq atomic.Int64

// DB returns a fresh, fully migrated database for one test, created inside
// the server named by TEST_DATABASE_URL (a superuser DSN, e.g. the docker
// compose "pg" service reached through an SSH tunnel or run on the test
// server). Skips the test when TEST_DATABASE_URL is unset.
func DB(t testing.TB) *store.DB {
	t.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("connect TEST_DATABASE_URL: %v", err)
	}
	defer admin.Close(ctx)

	name := fmt.Sprintf("t_%d_%d", os.Getpid(), dbSeq.Add(1))
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatalf("create test database: %v", err)
	}
	t.Cleanup(func() {
		c, err := pgx.Connect(context.Background(), base)
		if err != nil {
			return
		}
		defer c.Close(context.Background())
		_, _ = c.Exec(context.Background(), "DROP DATABASE IF EXISTS "+name+" WITH (FORCE)")
	})

	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	u.Path = "/" + name
	dsn := u.String()
	db, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(db.Close)
	if _, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}
