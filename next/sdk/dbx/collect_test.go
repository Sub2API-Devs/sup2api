package dbx

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// memQuerier is a non-Postgres Querier: each statement answers from a
// script, so the sequential batch path is what runs.
type memQuerier struct {
	ran     []string
	answers map[string]func(args []any) (any, error) // sql -> scanned value or error
}

func (m *memQuerier) Exec(_ context.Context, sql string, args ...any) (Result, error) {
	m.ran = append(m.ran, sql)
	if f := m.answers[sql]; f != nil {
		if _, err := f(args); err != nil {
			return nil, err
		}
	}
	return pgconn.NewCommandTag("INSERT 0 1"), nil
}
func (m *memQuerier) Query(context.Context, string, ...any) (Rows, error) { return nil, nil }
func (m *memQuerier) QueryRow(_ context.Context, sql string, args ...any) Row {
	m.ran = append(m.ran, sql)
	v, err := m.answers[sql](args)
	if err != nil {
		return errRow{err}
	}
	return valRow{v}
}
func (m *memQuerier) Dialect() Dialect { return SQLite }

type valRow struct{ v any }

func (r valRow) Scan(dest ...any) error {
	switch d := dest[0].(type) {
	case *int64:
		*d = r.v.(int64)
	case *string:
		*d = r.v.(string)
	}
	return nil
}

func TestSequentialBatchRunsInOrderAndStopsAtTheFirstFailure(t *testing.T) {
	boom := errors.New("boom")
	m := &memQuerier{answers: map[string]func([]any) (any, error){
		"ins": func(a []any) (any, error) {
			if a[0] == "dup" {
				return nil, ErrNoRows // ON CONFLICT DO NOTHING RETURNING id
			}
			return int64(len(a[0].(string))), nil
		},
		"bad": func([]any) (any, error) { return nil, boom },
	}}
	b := &Batch{}
	b.Queue("ins", "a")
	b.Queue("ins", "dup")
	b.Queue("ins", "ccc")
	b.Queue("bad")
	b.Queue("ins", "never")
	br := SendBatch(context.Background(), m, b)
	var ids []int64
	for i := 0; i < 3; i++ {
		var id int64
		err := br.QueryRow().Scan(&id)
		if IsNoRows(err) {
			continue // a no-row result is not a batch failure
		}
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, id)
	}
	if len(ids) != 2 || ids[0] != 1 || ids[1] != 3 {
		t.Fatalf("ids %v", ids)
	}
	if err := br.Close(); !errors.Is(err, boom) {
		t.Fatalf("close: %v", err)
	}
	if len(m.ran) != 4 {
		t.Fatalf("ran %v: the statement after the failure must not run", m.ran)
	}
	if err := br.Close(); err != nil {
		t.Fatalf("second close: %v", err)
	}
}

func TestCopyRowsFallsBackToInserts(t *testing.T) {
	m := &memQuerier{answers: map[string]func([]any) (any, error){}}
	n, err := CopyRows(context.Background(), m, "plugin_egress_logs", []string{"plugin_key", "port"}, [][]any{{"a", 1}, {"b", 2}})
	if err != nil || n != 2 {
		t.Fatalf("n=%d err=%v", n, err)
	}
	want := `INSERT INTO "plugin_egress_logs" ("plugin_key", "port") VALUES ($1, $2)`
	if len(m.ran) != 2 || m.ran[0] != want {
		t.Fatalf("ran %q", m.ran)
	}
}

type pair struct {
	ID   int64
	Name string
	skip int //nolint:unused // unexported fields are not scanned
}

type pairRow struct{}

func (pairRow) Scan(dest ...any) error {
	if len(dest) != 2 {
		return errors.New("want 2 destinations")
	}
	*dest[0].(*int64), *dest[1].(*string) = 7, "seven"
	return nil
}

func TestRowToStructByPos(t *testing.T) {
	p, err := RowToStructByPos[pair](pairRow{})
	if err != nil || p.ID != 7 || p.Name != "seven" {
		t.Fatalf("%+v %v", p, err)
	}
}
