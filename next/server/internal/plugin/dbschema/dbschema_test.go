package dbschema_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func randKey() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return "ds" + hex.EncodeToString(b)
}

func TestSchemaRoleMigrateDSNDrop(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	key := randKey()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'installed')`, key); err != nil {
		t.Fatal(err)
	}
	mk := make([]byte, 32)
	_, _ = rand.Read(mk)
	m := dbschema.New(db, db.Pool.Config().ConnString(), mk, true)
	t.Cleanup(func() { _ = m.Drop(context.Background(), key) })

	st, err := m.Ensure(ctx, key)
	if err != nil {
		t.Fatal(err)
	}
	if !st.RoleIsolated || st.Role != "plg_"+key || st.Schema != "plg_"+key {
		t.Fatalf("status = %+v", st)
	}
	// Idempotent.
	if _, err := m.Ensure(ctx, key); err != nil {
		t.Fatal(err)
	}

	fsys := fstest.MapFS{
		"0001_init.sql": {Data: []byte(`CREATE TABLE items (id int PRIMARY KEY); INSERT INTO items VALUES (1);`)},
	}
	applied, err := m.Migrate(ctx, key, fsys)
	if err != nil || len(applied) != 1 {
		t.Fatalf("migrate: %v %v", applied, err)
	}
	if again, err := m.Migrate(ctx, key, fsys); err != nil || len(again) != 0 {
		t.Fatalf("second migrate: %v %v", again, err)
	}
	pending, err := m.Pending(ctx, key, []string{"0001_init.sql"})
	if err != nil || pending {
		t.Fatalf("pending = %v %v", pending, err)
	}
	if pending, _ := m.Pending(ctx, key, []string{"0001_init.sql", "0002.sql"}); !pending {
		t.Fatal("0002 should be pending")
	}
	var owner string
	if err := db.Pool.QueryRow(ctx, `SELECT tableowner FROM pg_tables WHERE schemaname = $1 AND tablename = 'items'`, "plg_"+key).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if owner != "plg_"+key {
		t.Fatalf("items owner = %s", owner)
	}
	// Modified migration is refused.
	fsys["0001_init.sql"] = &fstest.MapFile{Data: []byte(`SELECT 1;`)}
	if _, err := m.Migrate(ctx, key, fsys); err == nil {
		t.Fatal("expected checksum mismatch")
	}

	// The restricted DSN logs in as the plugin role, sees its schema, not core tables.
	dsn, st2, err := m.DSN(ctx, key)
	if err != nil || !st2.RoleIsolated {
		t.Fatalf("dsn: %v %+v", err, st2)
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect as plugin role: %v", err)
	}
	defer conn.Close(ctx)
	var who string
	var n int
	if err := conn.QueryRow(ctx, `SELECT current_user, (SELECT count(*) FROM items)`).Scan(&who, &n); err != nil {
		t.Fatal(err)
	}
	if who != "plg_"+key || n != 1 {
		t.Fatalf("who=%s n=%d", who, n)
	}
	if _, err := conn.Exec(ctx, `SELECT count(*) FROM public.users`); err == nil || !strings.Contains(err.Error(), "permission denied") {
		t.Fatalf("plugin role reads core tables: %v", err)
	}
	if _, err := conn.Exec(ctx, `CREATE TABLE public.evil (id int)`); err == nil {
		t.Fatal("plugin role can create tables in public")
	}
	conn.Close(ctx)

	if err := m.Drop(ctx, key); err != nil {
		t.Fatal(err)
	}
	var exists bool
	_ = db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1)
		OR EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)
		OR EXISTS (SELECT 1 FROM plugin_migrations WHERE plugin_key = $2)`, "plg_"+key, key).Scan(&exists)
	if exists {
		t.Fatal("schema, role or migration records left after Drop")
	}
}

func TestSchemaWithoutRoleIsolation(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	key := randKey()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'installed')`, key); err != nil {
		t.Fatal(err)
	}
	m := dbschema.New(db, db.Pool.Config().ConnString(), make([]byte, 32), false)
	t.Cleanup(func() { _ = m.Drop(context.Background(), key) })
	if _, err := m.Migrate(ctx, key, fstest.MapFS{"0001.sql": {Data: []byte(`CREATE TABLE t (id int);`)}}); err != nil {
		t.Fatal(err)
	}
	dsn, st, err := m.DSN(ctx, key)
	if err != nil || st.RoleIsolated {
		t.Fatalf("%v %+v", err, st)
	}
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	var sp string
	if err := conn.QueryRow(ctx, `SHOW search_path`).Scan(&sp); err != nil {
		t.Fatal(err)
	}
	if sp != "plg_"+key {
		t.Fatalf("search_path = %q", sp)
	}
	if _, err := conn.Exec(ctx, `SELECT * FROM t`); err != nil {
		t.Fatal(err)
	}
}
