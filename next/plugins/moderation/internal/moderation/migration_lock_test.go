package moderation

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// The migrations of 0.10.0 alter events, which long statistics queries
// read: behind such a query a migration fails after lock_timeout instead of
// queueing (and making the gateway's inserts queue behind it). The failed
// file leaves nothing behind and runs again on a retry.
func TestMigrationsFailFastOnLock(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < "0011" }))
	ctx := context.Background()
	connect := func() *pgx.Conn {
		conn, err := pgx.Connect(ctx, dsn)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.Close(ctx) })
		return conn
	}
	// A long query on events: its ACCESS SHARE lock conflicts with ALTER TABLE.
	reader, err := connect().Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := reader.Exec(ctx, `SELECT count(*) FROM `+pgx.Identifier{schema, "events"}.Sanitize()); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"0011_flow_scope_source.sql", "0012_lists_level.sql"} {
		body, err := os.ReadFile(filepath.Join("..", "..", "migrations", name))
		if err != nil {
			t.Fatal(err)
		}
		migrate := func(conn *pgx.Conn) error {
			return pgx.BeginFunc(ctx, conn, func(tx pgx.Tx) error {
				if _, err := tx.Exec(ctx, "SET LOCAL search_path TO "+pgx.Identifier{schema}.Sanitize()); err != nil {
					return err
				}
				_, err := tx.Exec(ctx, string(body))
				return err
			})
		}
		start := time.Now()
		var pe *pgconn.PgError
		if err := migrate(connect()); !errors.As(err, &pe) || pe.Code != "55P03" || time.Since(start) > 15*time.Second {
			t.Fatalf("%s behind a reader: %v after %s, want lock_not_available after 10s", name, err, time.Since(start))
		}
		var cols int
		if err := connect().QueryRow(ctx, `SELECT count(*) FROM information_schema.columns WHERE table_schema = $1
			AND (table_name, column_name) IN (('flows', 'scope'), ('events', 'flow_source'), ('watchlist', 'locked'), ('events', 'level'))`,
			schema).Scan(&cols); err != nil || cols != 0 {
			t.Fatalf("%s left %d columns behind (%v)", name, cols, err)
		}
	}
	if err := reader.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
}
