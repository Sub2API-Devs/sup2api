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
	"testing/fstest"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/testpg"
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
// the test PostgreSQL (testpg.URL: TEST_DATABASE_URL when set, otherwise a
// local server started from Go and shared by every test process).
//
// Databases are cloned from a template (tpl_<hash of core migrations>) that
// is built once and shared by every test process, so each test pays for a
// CREATE DATABASE instead of running all migrations.
func DB(t testing.TB) *store.DB {
	t.Helper()
	base := testpg.URL(t)
	tplOnce.Do(func() { tplName, tplErr = ensureTemplate(context.Background(), base, migrations.FS) })
	if tplErr != nil {
		t.Fatalf("test template database: %v", tplErr)
	}
	return cloneTemplate(t, base, tplName)
}

// DBThrough returns a fresh database migrated through the core migration
// last and no further: the schema a deployed release left, for testing the
// migrations after it. Its template is built once per migration set, like
// DB's.
func DBThrough(t testing.TB, last string) *store.DB {
	t.Helper()
	base := testpg.URL(t)
	upTo := fstest.MapFS{}
	names, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		t.Fatal(err)
	}
	for _, n := range names {
		if n > last {
			continue
		}
		b, err := fs.ReadFile(migrations.FS, n)
		if err != nil {
			t.Fatal(err)
		}
		upTo[n] = &fstest.MapFile{Data: b}
	}
	if _, ok := upTo[last]; !ok {
		t.Fatalf("no core migration %s", last)
	}
	name, err := ensureTemplate(context.Background(), base, upTo)
	if err != nil {
		t.Fatalf("test template database through %s: %v", last, err)
	}
	return cloneTemplate(t, base, name)
}

// cloneTemplate creates a database for one test from the template tpl.
func cloneTemplate(t testing.TB, base, tpl string) *store.DB {
	t.Helper()
	ctx := context.Background()
	admin, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("connect TEST_DATABASE_URL: %v", err)
	}
	defer admin.Close(ctx)

	name := fmt.Sprintf("t_%d_%d", os.Getpid(), dbSeq.Add(1))
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name+" TEMPLATE "+tpl); err != nil {
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

// ensureTemplate builds the template database migrated with fsys unless
// another process already did. A template is only valid once datistemplate
// is set, which happens after migrations succeed; a half-built one is
// rebuilt.
func ensureTemplate(ctx context.Context, base string, fsys fs.FS) (string, error) {
	sum, err := migrationsHash(fsys)
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
	_, err = store.Migrate(ctx, db, fsys, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	db.Close()
	if err != nil {
		return "", fmt.Errorf("migrate template: %w", err)
	}
	if _, err := admin.Exec(ctx, "ALTER DATABASE "+name+" IS_TEMPLATE true"); err != nil {
		return "", err
	}
	return name, nil
}

// ExecWithoutTrigger runs sql with trigger on table disabled, to set up a
// state the trigger refuses, as a database from before it may hold.
func ExecWithoutTrigger(t testing.TB, db *store.DB, table, trigger, sql string, args ...any) {
	t.Helper()
	toggle := func(tx pgx.Tx, state string) error {
		_, err := tx.Exec(context.Background(), fmt.Sprintf("ALTER TABLE %s %s TRIGGER %s", table, state, trigger))
		return err
	}
	err := db.Tx(context.Background(), func(tx pgx.Tx) error {
		if err := toggle(tx, "DISABLE"); err != nil {
			return err
		}
		if _, err := tx.Exec(context.Background(), sql, args...); err != nil {
			return err
		}
		return toggle(tx, "ENABLE")
	})
	if err != nil {
		t.Fatalf("exec without trigger %s: %v", trigger, err)
	}
}

func migrationsHash(fsys fs.FS) (string, error) {
	names, err := fs.Glob(fsys, "*.sql")
	if err != nil {
		return "", err
	}
	sort.Strings(names)
	h := sha256.New()
	for _, n := range names {
		b, err := fs.ReadFile(fsys, n)
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
