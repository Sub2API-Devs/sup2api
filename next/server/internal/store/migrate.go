package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

// Tracker records which migrations have been applied for one scope.
// CoreTracker covers the core schema; the plugin runtime provides a tracker
// backed by plugin_migrations.
type Tracker interface {
	// Ensure creates the tracking table if needed (runs outside the lock tx).
	Ensure(ctx context.Context, q Querier) error
	Applied(ctx context.Context, q Querier) (map[string]string, error) // id -> checksum
	Record(ctx context.Context, tx pgx.Tx, id, checksum string) error
}

// MigrateOptions controls one migration run.
type MigrateOptions struct {
	// LockKey is the pg_advisory_lock key serializing runs across nodes.
	LockKey int64
	// SearchPath, when set, is applied with SET LOCAL before each file.
	// Privilege separation is done by the connection's login role, never by
	// SET ROLE (a migration could RESET it).
	SearchPath string
}

// Migrate applies *.sql files from fsys in lexical order. Each file runs in
// its own transaction; a file whose checksum differs from the recorded one is
// an error (applied migrations are immutable). Returns applied file names.
func Migrate(ctx context.Context, db *DB, fsys fs.FS, tr Tracker, opt MigrateOptions) ([]string, error) {
	names, err := fs.Glob(fsys, "*.sql")
	if err != nil {
		return nil, err
	}
	sort.Strings(names)

	conn, err := db.Pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()
	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", opt.LockKey); err != nil {
		return nil, fmt.Errorf("acquire migration lock: %w", err)
	}
	defer conn.Exec(context.WithoutCancel(ctx), "SELECT pg_advisory_unlock($1)", opt.LockKey) //nolint:errcheck

	if err := tr.Ensure(ctx, conn); err != nil {
		return nil, err
	}
	applied, err := tr.Applied(ctx, conn)
	if err != nil {
		return nil, err
	}

	var done []string
	for _, name := range names {
		body, err := fs.ReadFile(fsys, name)
		if err != nil {
			return done, err
		}
		sum := sha256.Sum256(body)
		checksum := hex.EncodeToString(sum[:])
		if prev, ok := applied[name]; ok {
			if prev != checksum {
				return done, fmt.Errorf("migration %s was modified after being applied", name)
			}
			continue
		}
		tx, err := conn.Begin(ctx)
		if err != nil {
			return done, err
		}
		if opt.SearchPath != "" {
			if _, err := tx.Exec(ctx, "SET LOCAL search_path TO "+pgx.Identifier{opt.SearchPath}.Sanitize()); err != nil {
				_ = tx.Rollback(ctx)
				return done, err
			}
		}
		if _, err := tx.Exec(ctx, string(body)); err != nil {
			_ = tx.Rollback(ctx)
			return done, fmt.Errorf("migration %s: %w", name, err)
		}
		if err := tr.Record(ctx, tx, name, checksum); err != nil {
			_ = tx.Rollback(ctx)
			return done, err
		}
		if err := tx.Commit(ctx); err != nil {
			return done, err
		}
		done = append(done, name)
	}
	return done, nil
}

// CoreTracker tracks core migrations in public.schema_migrations.
type CoreTracker struct{}

func (CoreTracker) Ensure(ctx context.Context, q Querier) error {
	_, err := q.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		id varchar(200) PRIMARY KEY,
		checksum varchar(64) NOT NULL,
		applied_at timestamptz NOT NULL DEFAULT now())`)
	return err
}

func (CoreTracker) Applied(ctx context.Context, q Querier) (map[string]string, error) {
	rows, err := q.Query(ctx, `SELECT id, checksum FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := map[string]string{}
	for rows.Next() {
		var id, sum string
		if err := rows.Scan(&id, &sum); err != nil {
			return nil, err
		}
		m[id] = sum
	}
	return m, rows.Err()
}

func (CoreTracker) Record(ctx context.Context, tx pgx.Tx, id, checksum string) error {
	_, err := tx.Exec(ctx, `INSERT INTO schema_migrations (id, checksum) VALUES ($1, $2)`, id, checksum)
	return err
}

// CoreMigrationLockKey serializes core migrations across nodes.
const CoreMigrationLockKey int64 = 0x5375623241504931 // "Sub2API1"

// PluginMigrationLockKey derives a stable advisory lock key for a plugin.
func PluginMigrationLockKey(pluginKey string) int64 {
	sum := sha256.Sum256([]byte("plugin-migrations:" + strings.ToLower(pluginKey)))
	var k int64
	for i := 0; i < 8; i++ {
		k = k<<8 | int64(sum[i])
	}
	return k
}
