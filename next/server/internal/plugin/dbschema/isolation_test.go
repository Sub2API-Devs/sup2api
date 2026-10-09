package dbschema_test

import (
	"context"
	"crypto/rand"
	"errors"
	"net/url"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/dbschema"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// hostWithoutCreateRole connects to the test database as a fresh login role
// that may create schemas but not roles.
func hostWithoutCreateRole(t *testing.T, db *store.DB) *store.DB {
	t.Helper()
	ctx := context.Background()
	role := "nocr_" + randKey()
	pw := "pw-" + randKey()
	rid := pgx.Identifier{role}.Sanitize()
	var dbname string
	if err := db.Pool.QueryRow(ctx, `SELECT current_database()`).Scan(&dbname); err != nil {
		t.Fatal(err)
	}
	for _, s := range []string{
		"CREATE ROLE " + rid + " LOGIN NOCREATEROLE NOSUPERUSER PASSWORD '" + pw + "'",
		"GRANT CREATE, CONNECT ON DATABASE " + pgx.Identifier{dbname}.Sanitize() + " TO " + rid,
	} {
		if _, err := db.Pool.Exec(ctx, s); err != nil {
			t.Fatal(err)
		}
	}
	u, err := url.Parse(db.Pool.Config().ConnString())
	if err != nil {
		t.Fatal(err)
	}
	u.User = url.UserPassword(role, pw)
	host, err := store.Open(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		host.Close()
		c := context.Background()
		_, _ = db.Pool.Exec(c, "DROP OWNED BY "+rid)
		_, _ = db.Pool.Exec(c, "DROP ROLE IF EXISTS "+rid)
	})
	return host
}

// Without CREATEROLE the plugin is refused with a clear code instead of
// running with the core's own role; no schema is created.
func TestEnsureFailsWithoutCreateRole(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	host := hostWithoutCreateRole(t, db)
	key := randKey()
	m := dbschema.New(host, host.Pool.Config().ConnString(), make([]byte, 32), true)

	err := m.CheckIsolation(ctx)
	if !errors.Is(err, dbschema.ErrIsolationUnavailable) || core.AsError(err).Code != "plugin_db_isolation_unavailable" {
		t.Fatalf("CheckIsolation: %v", err)
	}
	for name, call := range map[string]func() error{
		"ensure":  func() error { _, err := m.Ensure(ctx, key); return err },
		"migrate": func() error { _, err := m.Migrate(ctx, key, nil); return err },
		"dsn":     func() error { _, _, err := m.DSN(ctx, key); return err },
	} {
		if err := call(); core.AsError(err).Code != "plugin_db_isolation_unavailable" {
			t.Fatalf("%s: %v", name, err)
		}
	}
	var exists bool
	if err := db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1)`, "plg_"+key).Scan(&exists); err != nil || exists {
		t.Fatalf("schema created without isolation: %v %v", exists, err)
	}
	// Turning isolation off is an explicit operator choice, not a silent
	// fallback: then the shared role is used.
	shared := dbschema.New(host, host.Pool.Config().ConnString(), make([]byte, 32), false)
	t.Cleanup(func() { _ = shared.Drop(context.Background(), key) })
	if err := shared.CheckIsolation(ctx); err != nil {
		t.Fatal(err)
	}
	if st, err := shared.Ensure(ctx, key); err != nil || st.RoleIsolated {
		t.Fatalf("explicit shared role: %+v %v", st, err)
	}
}

// A role named plg_<key> that this core did not create is neither taken
// over (password, attributes) nor dropped.
func TestEnsureRefusesForeignRole(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	key := randKey()
	role := "plg_" + key
	rid := pgx.Identifier{role}.Sanitize()
	if _, err := db.Pool.Exec(ctx, "CREATE ROLE "+rid+" LOGIN PASSWORD 'theirs' CONNECTION LIMIT 3"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Pool.Exec(context.Background(), "DROP ROLE IF EXISTS "+rid) })
	mk := make([]byte, 32)
	_, _ = rand.Read(mk)
	m := dbschema.New(db, db.Pool.Config().ConnString(), mk, true)

	if _, err := m.Ensure(ctx, key); !errors.Is(err, dbschema.ErrRoleConflict) || core.AsError(err).Code != "plugin_db_role_conflict" {
		t.Fatalf("Ensure: %v", err)
	}
	if _, _, err := m.DSN(ctx, key); core.AsError(err).Code != "plugin_db_role_conflict" {
		t.Fatalf("DSN: %v", err)
	}
	var limit int
	var comment *string
	if err := db.Pool.QueryRow(ctx, `SELECT rolconnlimit, shobj_description(oid, 'pg_authid') FROM pg_roles WHERE rolname = $1`, role).Scan(&limit, &comment); err != nil {
		t.Fatal(err)
	}
	if limit != 3 || comment != nil {
		t.Fatalf("foreign role altered: limit=%d comment=%v", limit, comment)
	}
	var exists bool
	if err := db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1)`, role).Scan(&exists); err != nil || exists {
		t.Fatalf("schema created for a foreign role: %v %v", exists, err)
	}
	// Uninstall with purge does not drop it either.
	if err := m.Drop(ctx, key); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)`, role).Scan(&exists); err != nil || !exists {
		t.Fatalf("foreign role dropped: %v %v", exists, err)
	}
}

// A role this core created keeps working across Ensure calls and is marked
// as belonging to this database and plugin.
func TestEnsureAdoptsOwnRole(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	key := randKey()
	mk := make([]byte, 32)
	_, _ = rand.Read(mk)
	m := dbschema.New(db, db.Pool.Config().ConnString(), mk, true)
	t.Cleanup(func() { _ = m.Drop(context.Background(), key) })
	if _, err := m.Ensure(ctx, key); err != nil {
		t.Fatal(err)
	}
	// A second manager (another node, or after a restart) adopts it.
	m2 := dbschema.New(db, db.Pool.Config().ConnString(), mk, true)
	if st, err := m2.Ensure(ctx, key); err != nil || !st.RoleIsolated {
		t.Fatalf("own role: %+v %v", st, err)
	}
	// A role created before the marker existed is recognised by the schema
	// it owns.
	if _, err := db.Pool.Exec(ctx, "COMMENT ON ROLE "+pgx.Identifier{"plg_" + key}.Sanitize()+" IS NULL"); err != nil {
		t.Fatal(err)
	}
	if st, err := dbschema.New(db, db.Pool.Config().ConnString(), mk, true).Ensure(ctx, key); err != nil || !st.RoleIsolated {
		t.Fatalf("legacy own role: %+v %v", st, err)
	}
}
