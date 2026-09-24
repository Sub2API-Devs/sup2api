package pluginsdktest

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5"
)

var schemaSeq atomic.Int64

// NewSchema creates a fresh schema in the database named by
// TEST_DATABASE_URL and returns a DSN whose search_path is pinned to it,
// mimicking the restricted DSN the host hands out. The schema is dropped on
// cleanup. Skips the test when TEST_DATABASE_URL is unset.
func NewSchema(t testing.TB, prefix string) (dsn, schema string) {
	t.Helper()
	base := os.Getenv("TEST_DATABASE_URL")
	if base == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	if prefix == "" {
		prefix = "plg_test"
	}
	schema = fmt.Sprintf("%s_%d_%d", prefix, os.Getpid(), schemaSeq.Add(1))
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, base)
	if err != nil {
		t.Fatalf("pluginsdktest: connect TEST_DATABASE_URL: %v", err)
	}
	defer conn.Close(ctx)
	if _, err := conn.Exec(ctx, "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize()); err != nil {
		t.Fatalf("pluginsdktest: create schema: %v", err)
	}
	t.Cleanup(func() {
		c, err := pgx.Connect(context.Background(), base)
		if err != nil {
			return
		}
		defer c.Close(context.Background())
		_, _ = c.Exec(context.Background(), "DROP SCHEMA IF EXISTS "+pgx.Identifier{schema}.Sanitize()+" CASCADE")
	})
	u, err := url.Parse(base)
	if err != nil {
		t.Fatalf("pluginsdktest: parse TEST_DATABASE_URL: %v", err)
	}
	q := u.Query()
	q.Set("search_path", schema)
	u.RawQuery = q.Encode()
	return u.String(), schema
}

// ApplyMigrations runs every *.sql file of dirs (merged, sorted by file
// name) in its own transaction with search_path set to schema, like the
// host migration runner (ARCHITECTURE 5.6). Returns the applied file names.
func ApplyMigrations(t testing.TB, dsn, schema string, dirs ...string) []string {
	t.Helper()
	files := map[string]string{}
	for _, d := range dirs {
		entries, err := os.ReadDir(d)
		if err != nil {
			t.Fatalf("pluginsdktest: read migrations %s: %v", d, err)
		}
		for _, e := range entries {
			if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
				files[e.Name()] = filepath.Join(d, e.Name())
			}
		}
	}
	names := make([]string, 0, len(files))
	for n := range files {
		names = append(names, n)
	}
	sort.Strings(names)
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("pluginsdktest: connect: %v", err)
	}
	defer conn.Close(ctx)
	for _, n := range names {
		sqlText, err := os.ReadFile(files[n])
		if err != nil {
			t.Fatalf("pluginsdktest: read %s: %v", n, err)
		}
		tx, err := conn.Begin(ctx)
		if err != nil {
			t.Fatalf("pluginsdktest: begin: %v", err)
		}
		if _, err := tx.Exec(ctx, "SET LOCAL search_path TO "+pgx.Identifier{schema}.Sanitize()); err != nil {
			_ = tx.Rollback(ctx)
			t.Fatalf("pluginsdktest: set search_path: %v", err)
		}
		if _, err := tx.Exec(ctx, string(sqlText)); err != nil {
			_ = tx.Rollback(ctx)
			t.Fatalf("pluginsdktest: migration %s: %v", n, err)
		}
		if err := tx.Commit(ctx); err != nil {
			t.Fatalf("pluginsdktest: commit %s: %v", n, err)
		}
	}
	return names
}
