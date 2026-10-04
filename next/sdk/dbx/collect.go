package dbx

import (
	"context"
	"fmt"
	"reflect"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
)

// CollectRows reads every row with fn and closes rows, like pgx.CollectRows.
func CollectRows[T any](rows Rows, fn func(Row) (T, error)) ([]T, error) {
	defer rows.Close()
	var out []T
	for rows.Next() {
		v, err := fn(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

// RowTo scans a one-column row, like pgx.RowTo.
func RowTo[T any](row Row) (T, error) {
	var v T
	err := row.Scan(&v)
	return v, err
}

// RowToStructByPos scans the columns into the exported fields of T in
// declaration order, like pgx.RowToStructByPos (without its embedded-struct
// and db-tag handling, which the code base does not use).
func RowToStructByPos[T any](row Row) (T, error) {
	var v T
	rv := reflect.ValueOf(&v).Elem()
	if rv.Kind() != reflect.Struct {
		return v, fmt.Errorf("dbx: RowToStructByPos: %T is not a struct", v)
	}
	dest := make([]any, 0, rv.NumField())
	for i := 0; i < rv.NumField(); i++ {
		if rv.Type().Field(i).IsExported() {
			dest = append(dest, rv.Field(i).Addr().Interface())
		}
	}
	err := row.Scan(dest...)
	return v, err
}

// Batch queues statements to send together, like pgx.Batch: on PostgreSQL
// in one pipelined round trip, elsewhere one after another.
type Batch struct{ items []queued }

type queued struct {
	sql  string
	args []any
}

// Queue adds a statement. Results are read back in queue order.
func (b *Batch) Queue(sql string, args ...any) { b.items = append(b.items, queued{sql, args}) }

// Len is the number of queued statements.
func (b *Batch) Len() int { return len(b.items) }

// BatchResults reads the results of a sent batch in queue order: call one of
// Exec, Query or QueryRow per queued statement, then Close (which also runs
// or discards whatever was not read). Like pgx, an error surfaces when the
// result of the failing statement is read.
type BatchResults interface {
	Exec() (Result, error)
	Query() (Rows, error)
	QueryRow() Row
	Close() error
}

// SendBatch sends b on q. On PostgreSQL outside a transaction the batch runs
// in one implicit transaction; on SQLite each statement outside a
// transaction commits on its own - send batches that must be atomic inside
// a transaction.
func SendBatch(ctx context.Context, q Querier, b *Batch) BatchResults {
	if pq, ok := PGX(q); ok {
		pb := &pgx.Batch{}
		for _, it := range b.items {
			pb.Queue(it.sql, it.args...)
		}
		return pgBatchResults{pq.SendBatch(ctx, pb)}
	}
	return &seqBatchResults{ctx: ctx, q: q, items: b.items}
}

type pgBatchResults struct{ br pgx.BatchResults }

func (r pgBatchResults) Exec() (Result, error) { return r.br.Exec() }
func (r pgBatchResults) Query() (Rows, error)  { return r.br.Query() }
func (r pgBatchResults) QueryRow() Row         { return r.br.QueryRow() }
func (r pgBatchResults) Close() error          { return r.br.Close() }

// seqBatchResults runs each statement when its result is read.
type seqBatchResults struct {
	ctx    context.Context
	q      Querier
	items  []queued
	err    error // first failure; later statements are not run
	closed bool
}

func (r *seqBatchResults) next() (queued, error) {
	if r.err != nil {
		return queued{}, r.err
	}
	if len(r.items) == 0 {
		return queued{}, fmt.Errorf("dbx: batch result read past the last queued statement")
	}
	it := r.items[0]
	r.items = r.items[1:]
	return it, nil
}

func (r *seqBatchResults) Exec() (Result, error) {
	it, err := r.next()
	if err != nil {
		return nil, err
	}
	res, err := r.q.Exec(r.ctx, it.sql, it.args...)
	if err != nil {
		r.err = err
	}
	return res, err
}

func (r *seqBatchResults) Query() (Rows, error) {
	it, err := r.next()
	if err != nil {
		return nil, err
	}
	rows, err := r.q.Query(r.ctx, it.sql, it.args...)
	if err != nil {
		r.err = err
	}
	return rows, err
}

func (r *seqBatchResults) QueryRow() Row {
	it, err := r.next()
	if err != nil {
		return errRow{err}
	}
	return seqRow{r, r.q.QueryRow(r.ctx, it.sql, it.args...)}
}

// Close runs the statements nobody read, as pgx does, and reports the first
// failure of the batch.
func (r *seqBatchResults) Close() error {
	if r.closed {
		return nil
	}
	r.closed = true
	for r.err == nil && len(r.items) > 0 {
		_, _ = r.Exec()
	}
	return r.err
}

type seqRow struct {
	r   *seqBatchResults
	row Row
}

func (s seqRow) Scan(dest ...any) error {
	err := s.row.Scan(dest...)
	if err != nil && !IsNoRows(err) {
		s.r.err = err
	}
	return err
}

type errRow struct{ err error }

func (e errRow) Scan(...any) error { return e.err }

// CopyRows inserts rows into table, like pgx's CopyFrom: on PostgreSQL with
// the COPY protocol, elsewhere as single-row INSERTs.
func CopyRows(ctx context.Context, q Querier, table string, columns []string, rows [][]any) (int64, error) {
	if pq, ok := PGX(q); ok {
		return pq.CopyFrom(ctx, pgx.Identifier{table}, columns, pgx.CopyFromRows(rows))
	}
	cols := make([]string, len(columns))
	ph := make([]string, len(columns))
	for i, c := range columns {
		cols[i] = pgx.Identifier{c}.Sanitize()
		ph[i] = "$" + strconv.Itoa(i+1)
	}
	sql := "INSERT INTO " + pgx.Identifier{table}.Sanitize() + " (" + strings.Join(cols, ", ") + ") VALUES (" + strings.Join(ph, ", ") + ")"
	var n int64
	for _, row := range rows {
		if _, err := q.Exec(ctx, sql, row...); err != nil {
			return n, err
		}
		n++
	}
	return n, nil
}
