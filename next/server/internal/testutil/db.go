// Package testutil provides shared test infrastructure.
package testutil

import (
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"sort"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

var (
	dbSeq atomic.Int64

	tplOnce sync.Once
	tplName string
	tplErr  error
)

// DB returns a fresh, fully migrated database for one test, created inside
// the server named by TEST_DATABASE_URL (a superuser DSN, e.g. the docker
// compose "pg" service reached through an SSH tunnel or run on the test
// server). Skips the test when TEST_DATABASE_URL is unset.
//
// Databases are cloned from a template (tpl_<hash of core migrations>) that
// is built once and shared by every test process, so each test pays for a
// CREATE DATABASE instead of running all migrations.
func DB(t testing.TB) *store.DB {
	t.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	tplOnce.Do(func() { tplName, tplErr = ensureTemplate(ctx, base) })
	if tplErr != nil {
		t.Fatalf("test template database: %v", tplErr)
	}

	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("connect TEST_DATABASE_URL: %v", err)
	}
	defer admin.Close(ctx)

	name := fmt.Sprintf("t_%d_%d", os.Getpid(), dbSeq.Add(1))
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name+" TEMPLATE "+tplName); err != nil {
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

	dsn, err := withDatabase(base, name)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	db, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(db.Close)
	return db
}

// ensureTemplate builds the migrated template database unless another
// process already did. A template is only valid once datistemplate is set,
// which happens after migrations succeed; a half-built one is rebuilt.
func ensureTemplate(ctx context.Context, base string) (string, error) {
	sum, err := migrationsHash()
	if err != nil {
		return "", err
	}
	name := "tpl_" + sum[:16]
	lockKey := int64(binary.BigEndian.Uint64([]byte(sum[:8])))

	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		return "", err
	}
	defer admin.Close(ctx)
	if _, err := admin.Exec(ctx, "SELECT pg_advisory_lock($1)", lockKey); err != nil {
		return "", err
	}
	defer admin.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", lockKey) //nolint:errcheck

	var isTemplate *bool
	err = admin.QueryRow(ctx, "SELECT datistemplate FROM pg_database WHERE datname = $1", name).Scan(&isTemplate)
	switch {
	case err == nil && isTemplate != nil && *isTemplate:
		return name, nil
	case err == nil:
		if _, err := admin.Exec(ctx, "DROP DATABASE "+name+" WITH (FORCE)"); err != nil {
			return "", err
		}
	case !store.IsNoRows(err):
		return "", err
	}

	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		return "", err
	}
	dsn, err := withDatabase(base, name)
	if err != nil {
		return "", err
	}
	db, err := store.Open(ctx, dsn)
	if err != nil {
		return "", err
	}
	_, err = store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	db.Close()
	if err != nil {
		return "", fmt.Errorf("migrate template: %w", err)
	}
	if _, err := admin.Exec(ctx, "ALTER DATABASE "+name+" IS_TEMPLATE true"); err != nil {
		return "", err
	}
	return name, nil
}

func migrationsHash() (string, error) {
	names, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		return "", err
	}
	sort.Strings(names)
	h := sha256.New()
	for _, n := range names {
		b, err := fs.ReadFile(migrations.FS, n)
		if err != nil {
			return "", err
		}
		fmt.Fprintf(h, "%s\x00%d\x00", n, len(b))
		h.Write(b)
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

func withDatabase(base, name string) (string, error) {
	u, err := url.Parse(base)
	if err != nil {
		return "", err
	}
	u.Path = "/" + name
	return u.String(), nil
}
