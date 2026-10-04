// Package testpg gives tests a PostgreSQL server without any setup.
//
// URL returns TEST_DATABASE_URL when it is set (CI, a tunnel to a shared
// test server). Otherwise it starts - or reuses - a local PostgreSQL run from
// Go with embedded-postgres: the real server binaries, downloaded once
// from Maven Central and cached, not an emulation. `go test ./...` runs each
// package in its own process at the same time, so the processes share one
// server through a file lock instead of starting forty: the data directory
// lives in the user cache directory, initdb runs once, and the server keeps
// running after the tests exit so the next run starts in milliseconds (stop
// it with `go run github.com/Sub2API-Devs/sup2api/next/sdk/testpg/cmd/testpg stop`).
//
// The server is tuned for tests (fsync off, C locale, UTF8, many
// connections) and only listens on 127.0.0.1. Set SUB2API_TESTPG=off to
// skip database tests instead, e.g. offline before the first download.
package testpg

import (
	"context"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	embeddedpostgres "github.com/fergusstrange/embedded-postgres"
	"github.com/jackc/pgx/v5"
)

// Version is the PostgreSQL major the production images run (postgres:16).
const Version = embeddedpostgres.V16

const (
	user     = "postgres"
	password = "postgres"
)

var (
	once     sync.Once
	localURL string
	localErr error
)

// URL returns a superuser DSN of the server tests use, or skips the test
// when SUB2API_TESTPG=off and TEST_DATABASE_URL is unset.
func URL(t testing.TB) string {
	t.Helper()
	if u := os.Getenv("TEST_DATABASE_URL"); u != "" {
		return u
	}
	if strings.EqualFold(os.Getenv("SUB2API_TESTPG"), "off") {
		t.Skip("SUB2API_TESTPG=off and TEST_DATABASE_URL not set")
	}
	once.Do(func() { localURL, localErr = Ensure(context.Background()) })
	if localErr != nil {
		t.Fatalf("local test PostgreSQL: %v (set TEST_DATABASE_URL, or SUB2API_TESTPG=off to skip database tests)", localErr)
	}
	return localURL
}

// Dir is where the local server keeps its binaries, data and port.
func Dir() (string, error) {
	base, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "sub2api-testpg", string(Version)), nil
}

// Ensure starts the local server unless one is already running and returns
// its superuser DSN.
func Ensure(ctx context.Context) (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	unlock, err := lock(filepath.Join(dir, "lock"))
	if err != nil {
		return "", fmt.Errorf("lock %s: %w", dir, err)
	}
	defer unlock()

	if port, ok := runningPort(ctx, dir); ok {
		return dsn(port), nil
	}
	port, err := freePort()
	if err != nil {
		return "", err
	}
	logf, err := os.OpenFile(filepath.Join(dir, "server.log"), os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return "", err
	}
	defer logf.Close()
	pg := embeddedpostgres.NewDatabase(config(dir, port, logf))
	// pg_ctl start -w returns once the server accepts connections and leaves
	// it running in the background after this process exits.
	if err := pg.Start(); err != nil {
		return "", fmt.Errorf("start embedded PostgreSQL %s (log: %s): %w", Version, logf.Name(), err)
	}
	if err := os.WriteFile(filepath.Join(dir, "port"), []byte(strconv.Itoa(int(port))), 0o600); err != nil {
		return "", err
	}
	return dsn(port), nil
}

// Stop stops the local server if it is running.
func Stop() error {
	dir, err := Dir()
	if err != nil {
		return err
	}
	unlock, err := lock(filepath.Join(dir, "lock"))
	if err != nil {
		return err
	}
	defer unlock()
	port, ok := runningPort(context.Background(), dir)
	if !ok {
		return nil
	}
	pg := embeddedpostgres.NewDatabase(config(dir, port, io.Discard))
	return pg.Stop()
}

func config(dir string, port uint32, log io.Writer) embeddedpostgres.Config {
	return embeddedpostgres.DefaultConfig().
		Version(Version).
		Port(port).
		Username(user).
		Password(password).
		Database("postgres").
		// Start wipes RuntimePath on every call: data and binaries live
		// next to it, never inside.
		RuntimePath(filepath.Join(dir, "run")).
		BinariesPath(filepath.Join(dir, "bin")).
		DataPath(filepath.Join(dir, "data")).
		Locale("C").
		Encoding("UTF8").
		StartParameters(map[string]string{
			"listen_addresses":   "127.0.0.1",
			"max_connections":    "1000",
			"shared_buffers":     "128MB",
			"fsync":              "off",
			"synchronous_commit": "off",
			"full_page_writes":   "off",
		}).
		StartTimeout(2 * time.Minute).
		Logger(log)
}

func dsn(port uint32) string {
	return fmt.Sprintf("postgres://%s:%s@127.0.0.1:%d/postgres?sslmode=disable", user, password, port)
}

// runningPort returns the recorded port when a server answers on it.
func runningPort(ctx context.Context, dir string) (uint32, bool) {
	b, err := os.ReadFile(filepath.Join(dir, "port"))
	if err != nil {
		return 0, false
	}
	n, err := strconv.ParseUint(strings.TrimSpace(string(b)), 10, 32)
	if err != nil {
		return 0, false
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, dsn(uint32(n)))
	if err != nil {
		return 0, false
	}
	_ = conn.Close(ctx)
	return uint32(n), true
}

func freePort() (uint32, error) {
	l, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	defer l.Close()
	return uint32(l.Addr().(*net.TCPAddr).Port), nil
}
