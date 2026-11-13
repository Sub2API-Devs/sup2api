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

// The migrations of 0.10.0 and 0.11.0 alter events, which long statistics
// queries read: behind such a query a migration fails after lock_timeout
// instead of queueing (and making the gateway's inserts queue behind it).
// The failed file leaves nothing behind and runs again on a retry.
func TestMigrationsFailFastOnLock(t *testing.T) {
	dsn, schema := pluginsdktest.NewSchema(t, "plg_moderation_t")
	ctx := context.Background()
	connect := func() *pgx.Conn {
		conn, err := pgx.Connect(ctx, dsn)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.Close(ctx) })
		return conn
	}
	// unchanged counts what the files of a step add or drop: it is what
	// they find while they fail.
	for _, step := range []struct {
		files     []string
		unchanged string
		want      int
	}{
		{[]string{"0011_flow_scope_source.sql", "0012_lists_level.sql"}, `(table_name, column_name) IN
			(('flows', 'scope'), ('events', 'flow_source'), ('watchlist', 'locked'), ('events', 'level'))`, 0},
		{[]string{"0013_contract.sql"}, `(table_name, column_name) IN
			(('events', 'ai_verdict'), ('watchlist', 'latest_trend'), ('user_analyses', 'id'), ('config_state', 'lists_imported'))`, 3},
	} {
		first := step.files[0]
		pluginsdktest.ApplyMigrations(t, dsn, schema, migrationDir(t, func(n string) bool { return n < first }))
		// A long query on events: its ACCESS SHARE lock conflicts with ALTER TABLE.
		reader, err := connect().Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := reader.Exec(ctx, `SELECT count(*) FROM `+pgx.Identifier{schema, "events"}.Sanitize()); err != nil {
			t.Fatal(err)
		}
		for _, name := range step.files {
			body, err := os.ReadFile(filepath.Join("..", "..", "migrations", name))
			if err != nil {
				t.Fatal(err)
			}
			start := time.Now()
			var pe *pgconn.PgError
			err = pgx.BeginFunc(ctx, connect(), func(tx pgx.Tx) error {
				if _, err := tx.Exec(ctx, "SET LOCAL search_path TO "+pgx.Identifier{schema}.Sanitize()); err != nil {
					return err
				}
				_, err := tx.Exec(ctx, string(body))
				return err
			})
			if !errors.As(err, &pe) || pe.Code != "55P03" || time.Since(start) > 15*time.Second {
				t.Fatalf("%s behind a reader: %v after %s, want lock_not_available after 10s", name, err, time.Since(start))
			}
			var cols int
			if err := connect().QueryRow(ctx, `SELECT count(*) FROM information_schema.columns WHERE table_schema = $1 AND `+step.unchanged,
				schema).Scan(&cols); err != nil || cols != step.want {
				t.Fatalf("%s: %d of the columns it changes, want %d (%v)", name, cols, step.want, err)
			}
		}
		if err := reader.Rollback(ctx); err != nil {
			t.Fatal(err)
		}
	}
	pluginsdktest.ApplyMigrations(t, dsn, schema, filepath.Join("..", "..", "migrations"))
}
