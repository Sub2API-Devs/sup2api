package dbx

import (
	"context"
	"fmt"
)

// LockKey names a PostgreSQL advisory lock. What identifies the lock is the
// computed bigint, not the SQL text: LockHashtext("x") takes the same lock
// as the literal pg_advisory_xact_lock(hashtext('x')) did, so nodes running
// the old and the new code still exclude each other.
type LockKey struct {
	expr string // SQL expression over $1
	arg  any
}

// LockInt is a plain bigint key.
func LockInt(k int64) LockKey { return LockKey{"$1::bigint", k} }

// LockHashtext is hashtext(s) (32-bit).
func LockHashtext(s string) LockKey { return LockKey{"hashtext($1::text)", s} }

// LockHashtextExtended is hashtextextended(s, 0) (64-bit).
func LockHashtextExtended(s string) LockKey { return LockKey{"hashtextextended($1::text, 0)", s} }

func (k LockKey) String() string { return fmt.Sprintf("%s [%v]", k.expr, k.arg) }

// XactLock takes a transaction-scoped advisory lock, released at commit or
// rollback. On SQLite it is a no-op: the write transaction already excludes
// every other writer.
func XactLock(ctx context.Context, tx Tx, k LockKey) error {
	if tx.Dialect() != Postgres {
		return nil
	}
	_, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock("+k.expr+")", k.arg)
	return err
}

// TryXactLock is XactLock without waiting; ok reports whether the lock was
// taken. Always true on SQLite.
func TryXactLock(ctx context.Context, tx Tx, k LockKey) (ok bool, err error) {
	if tx.Dialect() != Postgres {
		return true, nil
	}
	err = tx.QueryRow(ctx, "SELECT pg_try_advisory_xact_lock("+k.expr+")", k.arg).Scan(&ok)
	return ok, err
}

// SessionLocker is implemented by pools of backends other than Postgres to
// provide WithSessionLock (an in-process lock is enough where only one
// process may open the database). LockKey is comparable and can key a map.
type SessionLocker interface {
	WithSessionLock(ctx context.Context, k LockKey, try bool, fn func() error) (bool, error)
}

// WithSessionLock runs fn while holding a session-scoped advisory lock - one
// that is held across transactions, for work that commits several times
// (migrations) or talks to the outside world and must not keep a
// transaction open meanwhile. With try set it does not wait: ran reports
// whether fn ran.
func WithSessionLock(ctx context.Context, p Pool, k LockKey, try bool, fn func() error) (ran bool, err error) {
	if l, ok := p.(SessionLocker); ok {
		return l.WithSessionLock(ctx, k, try, fn)
	}
	pool, ok := PGXPool(p)
	if !ok {
		return false, fmt.Errorf("dbx: %s pool has no session locks", p.Dialect())
	}
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return false, err
	}
	defer conn.Release()
	if try {
		if err := conn.QueryRow(ctx, "SELECT pg_try_advisory_lock("+k.expr+")", k.arg).Scan(&ran); err != nil || !ran {
			return false, err
		}
	} else if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock("+k.expr+")", k.arg); err != nil {
		return false, err
	}
	defer conn.Exec(context.WithoutCancel(ctx), "SELECT pg_advisory_unlock("+k.expr+")", k.arg) //nolint:errcheck
	return true, fn()
}
