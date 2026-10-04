// Package dbx is the database access layer shared by the core and plugins:
// one set of interfaces with a PostgreSQL backend (pgx) and a SQLite backend.
//
// SQL is always written in PostgreSQL's dialect. The PostgreSQL backend
// passes it through untouched; the SQLite backend (single node only: local
// tests, `sub2api dev`) rewrites a known subset and refuses the rest, so a
// statement it cannot translate fails loudly instead of meaning something
// else. Code that needs a construct outside the subset branches on
// Querier.Dialect(). See docs/SQLITE_BACKEND_DESIGN.md.
//
// Errors use one vocabulary on both backends: no row is ErrNoRows
// (pgx.ErrNoRows), and constraint violations are *pgconn.PgError carrying
// the SQLSTATE and constraint name PostgreSQL would report, so
// IsUniqueViolation / IsFKViolation and existing errors.As checks work
// unchanged on SQLite.
package dbx

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Dialect identifies the backend behind a Querier.
type Dialect uint8

const (
	Postgres Dialect = iota + 1
	SQLite
)

func (d Dialect) String() string {
	switch d {
	case Postgres:
		return "postgres"
	case SQLite:
		return "sqlite"
	}
	return "unknown"
}

// Result is the outcome of Exec. pgconn.CommandTag satisfies it.
type Result interface {
	RowsAffected() int64
}

// Row is one row of QueryRow. pgx.Row satisfies it.
type Row interface {
	Scan(dest ...any) error
}

// Rows is the cursor of Query. pgx.Rows satisfies it.
type Rows interface {
	Next() bool
	Scan(dest ...any) error
	Close()
	Err() error
}

// Querier runs statements; Pool and Tx both implement it, so repositories
// work inside or outside a transaction.
type Querier interface {
	Exec(ctx context.Context, sql string, args ...any) (Result, error)
	Query(ctx context.Context, sql string, args ...any) (Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) Row
	Dialect() Dialect
}

// Tx is a transaction. On SQLite every Tx from Pool.Begin is a write
// transaction (BEGIN IMMEDIATE): writers are serialized database-wide, which
// is what makes row locks and transaction-scoped advisory locks no-ops
// there.
type Tx interface {
	Querier
	Commit(ctx context.Context) error
	Rollback(ctx context.Context) error
}

// Pool is a connection pool.
type Pool interface {
	Querier
	// Begin starts a read-write transaction.
	Begin(ctx context.Context) (Tx, error)
	// BeginReadOnly starts a read-only transaction that sees one snapshot
	// (PostgreSQL: REPEATABLE READ READ ONLY; SQLite: a deferred read
	// transaction on a reader connection).
	BeginReadOnly(ctx context.Context) (Tx, error)
	Ping(ctx context.Context) error
	Close()
}

// ErrNoRows is returned by Row.Scan when the query matched nothing, on both
// backends.
var ErrNoRows = pgx.ErrNoRows

// IsNoRows reports ErrNoRows.
func IsNoRows(err error) bool { return errors.Is(err, ErrNoRows) }

// IsUniqueViolation reports a unique violation (SQLSTATE 23505), optionally
// on the named constraint or unique index.
func IsUniqueViolation(err error, constraint string) bool {
	var pg *pgconn.PgError
	if !errors.As(err, &pg) || pg.Code != "23505" {
		return false
	}
	return constraint == "" || pg.ConstraintName == constraint
}

// IsFKViolation reports a foreign key violation (SQLSTATE 23503).
func IsFKViolation(err error) bool {
	var pg *pgconn.PgError
	return errors.As(err, &pg) && pg.Code == "23503"
}

// InTx runs fn in a read-write transaction, committing when it returns nil
// and rolling back otherwise (also on panic).
func InTx(ctx context.Context, p Pool, fn func(Tx) error) (err error) {
	return run(ctx, p.Begin, fn)
}

// InReadTx runs fn in a read-only snapshot transaction (Pool.BeginReadOnly).
func InReadTx(ctx context.Context, p Pool, fn func(Tx) error) (err error) {
	return run(ctx, p.BeginReadOnly, fn)
}

func run(ctx context.Context, begin func(context.Context) (Tx, error), fn func(Tx) error) (err error) {
	tx, err := begin(ctx)
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(context.WithoutCancel(ctx))
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback(context.WithoutCancel(ctx))
		}
	}()
	if err = fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
