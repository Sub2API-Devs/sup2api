package dbx

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

type recTx struct {
	dialect Dialect
	sql     []string
	args    [][]any
}

func (t *recTx) Exec(_ context.Context, sql string, args ...any) (Result, error) {
	t.sql, t.args = append(t.sql, sql), append(t.args, args)
	return pgconn.NewCommandTag("SELECT 1"), nil
}
func (t *recTx) Query(context.Context, string, ...any) (Rows, error) { return nil, nil }
func (t *recTx) QueryRow(_ context.Context, sql string, args ...any) Row {
	t.sql, t.args = append(t.sql, sql), append(t.args, args)
	return boolRow(true)
}
func (t *recTx) Dialect() Dialect               { return t.dialect }
func (t *recTx) Commit(context.Context) error   { return nil }
func (t *recTx) Rollback(context.Context) error { return nil }

type boolRow bool

func (b boolRow) Scan(dest ...any) error { *dest[0].(*bool) = bool(b); return nil }

// The lock keys must compute the same bigint as the literal forms the code
// used before dbx, or nodes on the old and new code stop excluding each
// other during a rolling upgrade.
func TestXactLockSQL(t *testing.T) {
	ctx := context.Background()
	for _, c := range []struct {
		key LockKey
		sql string
		arg any
		was string
	}{
		{LockInt(78190001), "SELECT pg_advisory_xact_lock($1::bigint)", int64(78190001), "pg_advisory_xact_lock(78190001)"},
		{LockHashtext("sub2api:iam:bootstrap"), "SELECT pg_advisory_xact_lock(hashtext($1::text))", "sub2api:iam:bootstrap", "pg_advisory_xact_lock(hashtext('sub2api:iam:bootstrap'))"},
		{LockHashtextExtended("plugin-monitor:m1"), "SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))", "plugin-monitor:m1", "pg_advisory_xact_lock(hashtextextended($1,0))"},
	} {
		tx := &recTx{dialect: Postgres}
		if err := XactLock(ctx, tx, c.key); err != nil {
			t.Fatal(err)
		}
		if len(tx.sql) != 1 || tx.sql[0] != c.sql || tx.args[0][0] != c.arg {
			t.Errorf("%s: got %v %v, want %q [%v] (same key as %s)", c.key, tx.sql, tx.args, c.sql, c.arg, c.was)
		}
	}
	tx := &recTx{dialect: Postgres}
	if ok, err := TryXactLock(ctx, tx, LockHashtextExtended("ccg-account:7")); err != nil || !ok ||
		tx.sql[0] != "SELECT pg_try_advisory_xact_lock(hashtextextended($1::text, 0))" {
		t.Errorf("try: %v %v %v", ok, err, tx.sql)
	}
}

func TestXactLockIsANoOpOnSQLite(t *testing.T) {
	ctx := context.Background()
	tx := &recTx{dialect: SQLite}
	if err := XactLock(ctx, tx, LockInt(1)); err != nil {
		t.Fatal(err)
	}
	if ok, err := TryXactLock(ctx, tx, LockInt(1)); err != nil || !ok {
		t.Fatalf("try: %v %v", ok, err)
	}
	if len(tx.sql) != 0 {
		t.Fatalf("SQLite ran %v", tx.sql)
	}
}

func TestErrorVocabulary(t *testing.T) {
	uniq := &pgconn.PgError{Code: "23505", ConstraintName: "users_email_key"}
	if !IsUniqueViolation(uniq, "") || !IsUniqueViolation(uniq, "users_email_key") || IsUniqueViolation(uniq, "other") {
		t.Error("unique violation")
	}
	if !IsFKViolation(&pgconn.PgError{Code: "23503"}) || IsFKViolation(uniq) {
		t.Error("fk violation")
	}
	if !IsNoRows(ErrNoRows) {
		t.Error("no rows")
	}
}
