package dbx

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Postgres backend: a pass-through over pgx. Statements, arguments, scans
// and errors are pgx's own; nothing is rewritten.

// NewPostgres wraps a pgx pool. The pool stays owned by the wrapper (Close
// closes it).
func NewPostgres(p *pgxpool.Pool) Pool { return pgPool{p} }

// PGX returns the pgx object behind a Postgres Querier - a *pgxpool.Pool or
// a pgx.Tx - for the few PostgreSQL-only paths (COPY, batches, session
// locks, role and schema management). ok is false on other backends.
func PGX(q Querier) (PGXQuerier, bool) {
	switch v := q.(type) {
	case pgPool:
		return v.p, true
	case pgTx:
		return v.tx, true
	}
	return nil, false
}

// PGXPool returns the pgx pool behind a Postgres Pool; ok is false on other
// backends.
func PGXPool(p Pool) (*pgxpool.Pool, bool) {
	v, ok := p.(pgPool)
	if !ok {
		return nil, false
	}
	return v.p, true
}

// PGXQuerier is what *pgxpool.Pool and pgx.Tx have in common, including the
// PostgreSQL-only batch and copy protocols.
type PGXQuerier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
	SendBatch(ctx context.Context, b *pgx.Batch) pgx.BatchResults
	CopyFrom(ctx context.Context, table pgx.Identifier, columns []string, src pgx.CopyFromSource) (int64, error)
	Begin(ctx context.Context) (pgx.Tx, error)
}

type pgPool struct{ p *pgxpool.Pool }

func (p pgPool) Exec(ctx context.Context, sql string, args ...any) (Result, error) {
	return p.p.Exec(ctx, sql, args...)
}

func (p pgPool) Query(ctx context.Context, sql string, args ...any) (Rows, error) {
	return p.p.Query(ctx, sql, args...)
}

func (p pgPool) QueryRow(ctx context.Context, sql string, args ...any) Row {
	return p.p.QueryRow(ctx, sql, args...)
}

func (pgPool) Dialect() Dialect { return Postgres }

func (p pgPool) Begin(ctx context.Context) (Tx, error) {
	tx, err := p.p.Begin(ctx)
	if err != nil {
		return nil, err
	}
	return pgTx{tx}, nil
}

func (p pgPool) BeginReadOnly(ctx context.Context) (Tx, error) {
	tx, err := p.p.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, err
	}
	return pgTx{tx}, nil
}

func (p pgPool) Ping(ctx context.Context) error { return p.p.Ping(ctx) }
func (p pgPool) Close()                         { p.p.Close() }

type pgTx struct{ tx pgx.Tx }

func (t pgTx) Exec(ctx context.Context, sql string, args ...any) (Result, error) {
	return t.tx.Exec(ctx, sql, args...)
}

func (t pgTx) Query(ctx context.Context, sql string, args ...any) (Rows, error) {
	return t.tx.Query(ctx, sql, args...)
}

func (t pgTx) QueryRow(ctx context.Context, sql string, args ...any) Row {
	return t.tx.QueryRow(ctx, sql, args...)
}

func (pgTx) Dialect() Dialect                     { return Postgres }
func (t pgTx) Commit(ctx context.Context) error   { return t.tx.Commit(ctx) }
func (t pgTx) Rollback(ctx context.Context) error { return t.tx.Rollback(ctx) }

// WrapPGXTx wraps a pgx transaction opened outside dbx (migrations that need
// a dedicated connection).
func WrapPGXTx(tx pgx.Tx) Tx { return pgTx{tx} }
