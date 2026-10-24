package payment

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// pagedQuery is one paged list endpoint. The WHERE clause and its arguments
// are written once: listPaged appends them to both statements and numbers the
// page's LIMIT/OFFSET after them, so a caller never shifts "$2"/"$3" by hand.
type pagedQuery struct {
	// countSQL and listSQL end at the table (no WHERE, ORDER BY or LIMIT).
	countSQL string
	listSQL  string
	// where is the optional filter shared by both statements, with its
	// placeholders numbered from $1; args are its arguments.
	where string
	args  []any
	// orderBy is the page statement's ORDER BY ("created_at DESC").
	orderBy string
	// Labels are the failure prefixes, kept per stage because the endpoints
	// report the raw error to administrators ("count codes: ...").
	countLabel string
	queryLabel string
	scanLabel  string
}

// statements renders the count and page SQL with the filter applied and the
// page window numbered after the filter's arguments.
func (q pagedQuery) statements(limit, offset int) (countSQL, listSQL string, args []any) {
	where := ""
	if q.where != "" {
		where = " WHERE " + q.where
	}
	countSQL = q.countSQL + where
	listSQL = fmt.Sprintf("%s%s ORDER BY %s LIMIT $%d OFFSET $%d",
		q.listSQL, where, q.orderBy, len(q.args)+1, len(q.args)+2)
	args = append(append(make([]any, 0, len(q.args)+2), q.args...), limit, offset)
	return countSQL, listSQL, args
}

// listPaged runs the count and the page statement and reads the rows into T.
// It returns the total for the pagination block, which callers still need even
// when the page is empty.
func listPaged[T any](ctx context.Context, db *pgxpool.Pool, q pagedQuery, limit, offset int, scan pgx.RowToFunc[T]) ([]T, int, error) {
	countSQL, listSQL, args := q.statements(limit, offset)
	var total int
	if err := db.QueryRow(ctx, countSQL, args[:len(q.args)]...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("%s: %w", q.countLabel, err)
	}
	rows, err := db.Query(ctx, listSQL, args...)
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
