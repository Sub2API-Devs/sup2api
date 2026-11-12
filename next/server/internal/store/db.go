// Package store owns the PostgreSQL pool, transactions and the migration
// runner shared by the core schema and plugin schemas.
package store

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Querier is satisfied by *pgxpool.Pool and pgx.Tx, so repositories can run
// inside or outside a transaction.
type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

type DB struct {
	Pool *pgxpool.Pool
}

func Open(ctx context.Context, dsn string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.MaxConns = poolMaxConns(dsn, os.Getenv("SUB2API_PG_MAX_CONNS"), cfg.MaxConns)
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	slog.Info("database pool opened", "max_conns", cfg.MaxConns, "min_conns", cfg.MinConns,
		"max_conn_lifetime", cfg.MaxConnLifetime, "max_conn_idle_time", cfg.MaxConnIdleTime)
	return &DB{Pool: pool}, nil
}

func (db *DB) Close() { db.Pool.Close() }

// Tx runs fn in a transaction, committing on nil error.
func (db *DB) Tx(ctx context.Context, fn func(tx pgx.Tx) error) (err error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()
	if err = fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// IsUniqueViolation reports a 23505 error (optionally on a named constraint).
func IsUniqueViolation(err error, constraint string) bool {
	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "23505" {
		return false
	}
	return constraint == "" || pg.ConstraintName == constraint
}

// IsForeignKeyViolation reports a write that refers to a row that is not
// there (any more).
func IsForeignKeyViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23503"
}

// IsNoRows reports pgx.ErrNoRows.
func IsNoRows(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

// defaultPoolMaxConns is the pool size when neither SUB2API_PG_MAX_CONNS nor
// the DSN's pool_max_conns sets one.
const defaultPoolMaxConns = 20

// poolMaxConns picks the pool size: SUB2API_PG_MAX_CONNS (AR-P1-2) first,
// then pool_max_conns in the DSN (parsed is what pgxpool read from it), else
// defaultPoolMaxConns. pgxpool.ParseConfig never leaves MaxConns at 0 (it
// defaults to max(4, NumCPU)), so the absence of pool_max_conns is what
// tells the default apart: 4 connections shared by the gateway and the
// console made every list request queue for a connection per statement. A
// plugin-heavy or multi-node setup may need more.
func poolMaxConns(dsn, env string, parsed int32) int32 {
	if env != "" {
		if n, err := strconv.Atoi(env); err == nil && n > 0 {
			return int32(n)
		}
	}
	if strings.Contains(dsn, "pool_max_conns") {
		return parsed
	}
	return defaultPoolMaxConns
}
