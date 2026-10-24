package payment

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// pagedQuery is one admin list endpoint: a count statement and the page
// statement, each with the arguments it needs, plus the message prefix of
// each failure. Callers build both statements (they differ only by the
// optional status filter and its placeholders); this type only carries them.
type pagedQuery struct {
	countSQL  string
	countArgs []any
	listSQL   string
	listArgs  []any
	// Labels are the failure prefixes, kept per stage because the endpoints
	// report the raw error to administrators ("count codes: ...").
	countLabel string
	queryLabel string
	scanLabel  string
}

// listPaged runs the count and the page statement and reads the rows into T.
// It returns the total for the pagination block, which callers still need even
// when the page is empty.
func listPaged[T any](ctx context.Context, db *pgxpool.Pool, q pagedQuery, scan pgx.RowToFunc[T]) ([]T, int, error) {
	var total int
	if err := db.QueryRow(ctx, q.countSQL, q.countArgs...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("%s: %w", q.countLabel, err)
	}
	rows, err := db.Query(ctx, q.listSQL, q.listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("%s: %w", q.queryLabel, err)
	}
	items, err := pgx.CollectRows(rows, scan)
	if err != nil {
		return nil, 0, fmt.Errorf("%s: %w", q.scanLabel, err)
	}
	return items, total, nil
}

// lockedRow describes the row a redemption locks and the wording of its
// failures: the messages are rendered to the console verbatim, so each caller
// keeps its own.
type lockedRow struct {
	query string // SELECT ... FOR UPDATE taking exactly one argument
	arg   any
	// missing is returned when no row matches.
	missing string
	// queryFail prefixes a genuine query error ("query code").
	queryFail string
}

// withLockedRow runs fn inside a transaction that holds the FOR UPDATE lock on
// the row lockedRow selects; the transaction commits when fn returns nil. fn
// reads and writes the row through tx.
func withLockedRow[T any](ctx context.Context, db *pgxpool.Pool, l lockedRow, scan func(pgx.Row) (T, error), fn func(pgx.Tx, T) error) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	row, err := scan(tx.QueryRow(ctx, l.query, l.arg))
	if errors.Is(err, pgx.ErrNoRows) {
		return errors.New(l.missing)
	}
	if err != nil {
		return fmt.Errorf("%s: %w", l.queryFail, err)
	}
	if err := fn(tx, row); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
