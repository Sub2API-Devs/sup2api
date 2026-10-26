package devenv

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/sdk/testpg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
)

// clearEnv unsets the variables Prepare fills in (restored after the test).
func clearEnv(t *testing.T) {
	for _, k := range []string{"SUB2API_HTTP_ADDR", "SUB2API_PUBLIC_URL", "DATABASE_URL", "REDIS_URL",
		"SUB2API_MASTER_KEY", "SUB2API_JWT_SECRET", "SUB2API_BOOTSTRAP_ADMIN_EMAIL", "SUB2API_BOOTSTRAP_ADMIN_PASSWORD",
		"NODE_ID", "SUB2API_PLUGIN_DIR", "SUB2API_BUILTIN_PLUGIN_DIR", "SUB2API_PLUGIN_DEV_MODE",
		"SUB2API_PLUGIN_STRICT_NETWORK", "SUB2API_PLUGIN_SECCOMP", "SUB2API_SHUTDOWN_DELAY"} {
		t.Setenv(k, "")
	}
}

func TestPrepare(t *testing.T) {
	base := testpg.URL(t) // skips like every database test when PG is off
	if os.Getenv("TEST_DATABASE_URL") != "" {
		t.Skip("Prepare starts the local PostgreSQL server; TEST_DATABASE_URL points elsewhere")
	}
	clearEnv(t)
	ctx := context.Background()
	state := t.TempDir()
	db := DatabaseFor(state)
	if db == Database || !strings.HasPrefix(db, Database+"_") {
		t.Fatalf("database of a custom state dir = %q", db)
	}
	t.Cleanup(func() {
		if c, err := pgx.Connect(ctx, base); err == nil {
			_, _ = c.Exec(ctx, "DROP DATABASE IF EXISTS "+pgx.Identifier{db}.Sanitize()+" WITH (FORCE)")
			_ = c.Close(ctx)
		}
	})

	env, err := Prepare(ctx, Options{StateDir: state, Addr: "127.0.0.1:18099"})
	if err != nil {
		t.Fatal(err)
	}
	defer env.Close()
	if !env.MemoryRedis || env.URL != "http://127.0.0.1:18099" || env.AdminEmail != AdminEmail || len(env.AdminPassword) < 8 {
		t.Fatalf("env %+v", env)
	}
	for k, want := range map[string]string{
		"SUB2API_HTTP_ADDR":          "127.0.0.1:18099",
		"DATABASE_URL":               env.DatabaseURL,
		"REDIS_URL":                  env.RedisURL,
		"SUB2API_PLUGIN_DEV_MODE":    "true",
		"SUB2API_BUILTIN_PLUGIN_DIR": filepath.Join(state, "builtin"),
		"SUB2API_SHUTDOWN_DELAY":     "0s",
	} {
		if got := os.Getenv(k); got != want {
			t.Errorf("%s = %q, want %q", k, got, want)
		}
	}
	checkLoads(t, env)
	conn, err := pgx.Connect(ctx, env.DatabaseURL)
	if err != nil {
		t.Fatal(err)
	}
	var name string
	if err := conn.QueryRow(ctx, `SELECT current_database()`).Scan(&name); err != nil || name != db {
		t.Fatalf("connected to %q (%v), want %q", name, err, db)
	}
	if _, err := conn.Exec(ctx, `CREATE TABLE marker (id int)`); err != nil {
		t.Fatal(err)
	}
	_ = conn.Close(ctx)
	opt, _ := redis.ParseURL(env.RedisURL)
	rdb := redis.NewClient(opt)
	if err := rdb.Ping(ctx).Err(); err != nil {
		t.Fatalf("in-memory redis: %v", err)
	}
	_ = rdb.Close()
	env.Close()

	// A second start reuses the secrets and the data.
	clearEnv(t)
	again, err := Prepare(ctx, Options{StateDir: state})
	if err != nil {
		t.Fatal(err)
	}
	again.Close()
	if again.AdminPassword != env.AdminPassword || os.Getenv("SUB2API_HTTP_ADDR") != "127.0.0.1:8080" {
		t.Fatalf("restart: password changed or default addr not applied")
	}
	if !hasMarker(t, again.DatabaseURL) {
		t.Fatal("restart lost the data")
	}

	// --reset drops the database; variables set by the caller win.
	clearEnv(t)
	t.Setenv("SUB2API_BOOTSTRAP_ADMIN_PASSWORD", "caller-password")
	reset, err := Prepare(ctx, Options{StateDir: state, Reset: true})
	if err != nil {
		t.Fatal(err)
	}
	reset.Close()
	if hasMarker(t, reset.DatabaseURL) {
		t.Fatal("--reset kept the data")
	}
	if reset.AdminPassword != "caller-password" {
		t.Fatalf("admin password = %q, want the caller's", reset.AdminPassword)
	}
}

// checkLoads starts the core's configuration from what Prepare set, the way
// `sub2api dev` does, and checks it uses the prepared servers.
func checkLoads(t *testing.T, env *Env) {
	t.Helper()
	cfg, err := config.Load(runtime.GOOS)
	if err != nil {
		t.Fatalf("config.Load after Prepare: %v", err)
	}
	if cfg.DatabaseURL != env.DatabaseURL || cfg.RedisURL != env.RedisURL || cfg.PublicURL != env.URL ||
		cfg.BootstrapAdminEmail != env.AdminEmail || cfg.BootstrapAdminPassword != env.AdminPassword ||
		cfg.NodeID != "dev" || !cfg.Plugins.DevMode || cfg.Plugins.StrictNetwork || cfg.Plugins.Seccomp ||
		cfg.Plugins.DataDir != filepath.Join(env.StateDir, "plugins") || cfg.ShutdownDelay != 0 {
		t.Fatalf("config %+v does not match env %+v", cfg, env)
	}
}

// Servers named by the caller are used as they are, and the core loads them;
// neither PostgreSQL nor miniredis is started.
func TestPrepareCallerServers(t *testing.T) {
	clearEnv(t)
	t.Setenv("DATABASE_URL", "postgres://caller@db.invalid/app")
	t.Setenv("REDIS_URL", "redis://cache.invalid:6379/0")
	env, err := Prepare(context.Background(), Options{StateDir: t.TempDir()})
	if err != nil {
		t.Fatal(err)
	}
	defer env.Close()
	if env.DatabaseURL != "postgres://caller@db.invalid/app" || env.RedisURL != "redis://cache.invalid:6379/0" || env.MemoryRedis {
		t.Fatalf("env %+v ignored the caller's servers", env)
	}
	checkLoads(t, env)
}

func hasMarker(t *testing.T, dsn string) bool {
	t.Helper()
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	var ok bool
	if err := conn.QueryRow(ctx, `SELECT to_regclass('marker') IS NOT NULL`).Scan(&ok); err != nil {
		t.Fatal(err)
	}
	return ok
}

func TestResetRefusesForeignDatabase(t *testing.T) {
	clearEnv(t)
	t.Setenv("DATABASE_URL", "postgres://somewhere/else")
	if _, err := Prepare(context.Background(), Options{StateDir: t.TempDir(), Reset: true}); err == nil {
		t.Fatal("--reset with DATABASE_URL accepted")
	}
}
