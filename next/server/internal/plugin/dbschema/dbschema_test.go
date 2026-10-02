package dbschema_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"sort"
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
	// A script changed after it was applied runs again (scripts are
	// idempotent) and its record takes the new checksum, through the
	// definer function of the isolated role.
	fsys["0001_init.sql"] = &fstest.MapFile{Data: []byte(`CREATE TABLE IF NOT EXISTS items (id int PRIMARY KEY);
		INSERT INTO items VALUES (1), (2) ON CONFLICT DO NOTHING;`)}
	again, err := m.Migrate(ctx, key, fsys)
	if err != nil || len(again) != 1 || again[0] != "0001_init.sql" {
		t.Fatalf("changed script: %v %v", again, err)
	}
	var rows int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM `+pgx.Identifier{"plg_" + key, "items"}.Sanitize()).Scan(&rows); err != nil || rows != 2 {
		t.Fatalf("items after the re-run = %d %v", rows, err)
	}
	if again, err := m.Migrate(ctx, key, fsys); err != nil || len(again) != 0 {
		t.Fatalf("the new checksum was not recorded: %v %v", again, err)
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
	if who != "plg_"+key || n != 2 {
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

// A plugin migration must not escape its role (RESET ROLE was the old hole)
// nor record migrations for another plugin.
func TestMigrationCannotEscalate(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	key, other := randKey(), randKey()
	for _, k := range []string{key, other} {
		if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins (key, name, status) VALUES ($1, '{"en":"x"}', 'installed')`, k); err != nil {
			t.Fatal(err)
		}
	}
	mk := make([]byte, 32)
	_, _ = rand.Read(mk)
	m := dbschema.New(db, db.Pool.Config().ConnString(), mk, true)
	t.Cleanup(func() { _ = m.Drop(context.Background(), key) })

	cases := map[string]string{
		"reset_role":   `RESET ROLE; CREATE TABLE public.escalated (id int);`,
		"core_write":   `UPDATE public.users SET status = 'disabled';`,
		"other_record": `SELECT public.plugin_migration_record('` + other + `', 'x.sql', 'x');`,
		"direct_log":   `INSERT INTO public.plugin_migrations (plugin_key, migration_id, checksum) VALUES ('` + other + `', 'x.sql', 'x');`,
	}
	for name, sql := range cases {
		_, err := m.Migrate(ctx, key, fstest.MapFS{"0001_" + name + ".sql": {Data: []byte(sql)}})
		if err == nil {
			t.Fatalf("%s: migration succeeded", name)
		}
	}
	var n int
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = 'escalated'`).Scan(&n); err != nil || n != 0 {
		t.Fatalf("escalated table exists: n=%d err=%v", n, err)
	}
	if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_migrations WHERE plugin_key = $1`, other).Scan(&n); err != nil || n != 0 {
		t.Fatalf("records for other plugin: n=%d err=%v", n, err)
	}
	// A normal migration still works and is recorded under its own key.
	if applied, err := m.Migrate(ctx, key, fstest.MapFS{"0001_ok.sql": {Data: []byte(`CREATE TABLE ok (id int);`)}}); err != nil || len(applied) != 1 {
		t.Fatalf("ok migration: %v %v", applied, err)
	}
}

// Every SQL migration shipped with an official plugin (and its test
// overlays) is idempotent: applied twice in order, the second pass changes
// nothing and fails nowhere. The core records each file once, but a lost
// record or a corrected script runs it again.
func TestOfficialPluginMigrationsAreIdempotent(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	root := filepath.Join("..", "..", "..", "..", "plugins")
	dirs, err := filepath.Glob(filepath.Join(root, "*", "migrations"))
	if err != nil {
		t.Fatal(err)
	}
	overlays, _ := filepath.Glob(filepath.Join(root, "*", "testdata", "*", "migrations"))
	if len(dirs) < 4 {
		t.Fatalf("found only %v under %s", dirs, root)
	}
	for _, dir := range dirs {
		plugin := filepath.Base(filepath.Dir(dir))
		sets := [][]string{}
		base, _ := filepath.Glob(filepath.Join(dir, "*.sql"))
		sort.Strings(base)
		sets = append(sets, base)
		for _, o := range overlays {
			if strings.Contains(o, string(filepath.Separator)+plugin+string(filepath.Separator)) {
				extra, _ := filepath.Glob(filepath.Join(o, "*.sql"))
				sort.Strings(extra)
				sets = append(sets, append(append([]string(nil), base...), extra...))
			}
		}
		for _, files := range sets {
			t.Run(plugin+"/"+strings.Join(names(files), ","), func(t *testing.T) {
				tx, err := db.Pool.Begin(ctx)
				if err != nil {
					t.Fatal(err)
				}
				defer tx.Rollback(ctx)
				schema := pgx.Identifier{"idem_" + randKey()}.Sanitize()
				if _, err = tx.Exec(ctx, "CREATE SCHEMA "+schema+"; SET LOCAL search_path TO "+schema); err != nil {
					t.Fatal(err)
				}
				for pass := 1; pass <= 2; pass++ {
					for _, f := range files {
						body, err := os.ReadFile(f)
						if err != nil {
							t.Fatal(err)
						}
						if _, err = tx.Exec(ctx, string(body)); err != nil {
							t.Fatalf("pass %d of %s: %v", pass, filepath.Base(f), err)
						}
					}
				}
			})
		}
	}
}

func names(files []string) []string {
	out := make([]string, len(files))
	for i, f := range files {
		out[i] = filepath.Base(f)
	}
	return out
}
