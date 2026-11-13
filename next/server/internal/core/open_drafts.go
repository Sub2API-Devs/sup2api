package core

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// MaxOpenDrafts is how many open account drafts one user may hold at a time
// (W1-F13): ccgateway draft runtimes and account preparations, each counted
// on its own. Callers with the full scope of the route are not limited.
const MaxOpenDrafts = 3

// LockOpenDrafts serializes, until tx ends, the count-and-insert of userID's
// open drafts: without it, concurrent requests each count the committed rows
// only and all pass the limit together (READ COMMITTED). Take it right
// before the counting insert.
func LockOpenDrafts(ctx context.Context, tx pgx.Tx, userID int64) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('open-drafts:' || $1::bigint::text, 0))`, userID)
	return err
}
