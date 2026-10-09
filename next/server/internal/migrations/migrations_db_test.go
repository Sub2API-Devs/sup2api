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

// 0048 removes what plugins brought into sticky sessions and keeps it out:
// only built-in and admin rules, never a plugin-computed session value.
func TestStickyRulesCoreOnly(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `
		ALTER TABLE sticky_rules DROP CONSTRAINT sticky_rules_core_only;
		INSERT INTO plugins (key, name, status) VALUES ('acme_sticky', '{"en":"x"}', 'enabled');
		INSERT INTO sticky_rules (name, source, plugin_key, key_sources) VALUES
			('from-plugin', 'plugin_default', 'acme_sticky', '[{"type":"header","name":"x"}]'),
			('plugin-value', 'admin', NULL, '[{"type":"user"},{"type":"plugin"}]'),
			('kept', 'admin', NULL, '[{"type":"header","name":"x-session"}]');
		DELETE FROM schema_migrations WHERE id >= '0048'`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Migrate(ctx, db, migrations.FS, store.CoreTracker{}, store.MigrateOptions{LockKey: store.CoreMigrationLockKey}); err != nil {
		t.Fatal(err)
	}
	var names []string
	rows, err := db.Pool.Query(ctx, `SELECT name FROM sticky_rules WHERE source = 'admin' OR plugin_key IS NOT NULL ORDER BY name`)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var n string
		_ = rows.Scan(&n)
		names = append(names, n)
	}
	rows.Close()
	if len(names) != 1 || names[0] != "kept" {
		t.Fatalf("rules after 0048: %v", names)
	}
	for _, bad := range []string{
		`INSERT INTO sticky_rules (name, source, key_sources) VALUES ('x', 'plugin_default', '[{"type":"user"}]')`,
		`INSERT INTO sticky_rules (name, source, plugin_key, key_sources) VALUES ('x', 'admin', 'acme_sticky', '[{"type":"user"}]')`,
		`INSERT INTO sticky_rules (name, source, key_sources) VALUES ('x', 'admin', '[{"type":"plugin"}]')`,
	} {
		if _, err := db.Pool.Exec(ctx, bad); err == nil {
			t.Fatalf("accepted: %s", bad)
		}
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
