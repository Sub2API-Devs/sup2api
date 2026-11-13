package segment

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// addMembers moves users into a named segment and answers how many moved.
func (s *Service) addMembers(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		UserIDs []int64 `json:"user_ids"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.actOnUsers(ctx, in.UserIDs...); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var moved int
	var dropped bool
	err := s.tx(ctx, func(tx pgx.Tx) error {
		// The lock keeps the segment from being deleted under the move.
		kind, _, err := segmentKind(ctx, tx, id, "FOR KEY SHARE")
		if err != nil {
			return err
		}
		if kind == core.SegmentPersonal {
			return core.ErrConflict.WithMessage(t(ctx, "a personal user group has one member", "个人专属只有一个成员"))
		}
		if err := requireUsers(ctx, tx, in.UserIDs); err != nil {
			return err
		}
		moved, dropped, err = moveUsers(ctx, tx, id, in.UserIDs, "")
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if dropped {
		s.priceRulesChanged(ctx)
	}
	httpapi.OK(c, gin.H{"moved": moved})
}

// requireUsers fails with the field error of the first id that is not a
// user; a deleted user is none.
func requireUsers(ctx context.Context, q store.Querier, ids []int64) error {
	var unknown int64
	err := q.QueryRow(ctx, `SELECT i.id FROM unnest($1::bigint[]) WITH ORDINALITY AS i(id, n)
		WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = i.id AND u.deleted_at IS NULL)
		ORDER BY i.n LIMIT 1`, ids).Scan(&unknown)
	if store.IsNoRows(err) {
		return nil
	}
	if err != nil {
		return err
	}
	id := strconv.FormatInt(unknown, 10)
	return core.InvalidFields(fieldError(ctx, "user_ids", "not_found", "unknown user "+id, "用户 "+id+" 不存在"))
}

// moveUsers puts the users into the named segment to and deletes the
// personal segment of each one who had one, with its settings. With from a
// segment kind, only users in a segment of that kind move. It returns how
// many moved (a user already there does not) and whether a personal segment
// went: its price rules went with it.
func moveUsers(ctx context.Context, tx pgx.Tx, to int64, userIDs []int64, from string) (moved int, dropped bool, err error) {
	ids, err := lockUsers(ctx, tx, `id = ANY($1) AND deleted_at IS NULL AND segment_id <> $2
		AND ($3 = '' OR segment_id IN (SELECT id FROM segments WHERE kind = $3))`, userIDs, to, from)
	if err != nil {
		return 0, false, err
	}
	if _, err := tx.Exec(ctx, `UPDATE users SET segment_id = $1 WHERE id = ANY($2)`, to, ids); err != nil {
		return 0, false, err
	}
	dropped, err = DropPersonal(ctx, tx, ids...)
	return len(ids), dropped, err
}

// lockUsers locks the users cond picks, in id order, until the transaction
// ends, and returns their ids. Every writer of users.segment_id locks first
// and updates in a statement of its own: an UPDATE in the statement that
// locks starts from the row versions of that statement's snapshot and, where
// another writer replaced one meanwhile, queues on it behind the key-share
// holders (inserts that refer to the user), which can close a cycle.
func lockUsers(ctx context.Context, tx pgx.Tx, cond string, args ...any) ([]int64, error) {
	rows, err := tx.Query(ctx, `SELECT id FROM users WHERE `+cond+` ORDER BY id FOR NO KEY UPDATE`, args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowTo[int64])
}

// DropPersonal deletes the personal segments of the users, who have left
// them, with their grants, rates and model prices. It reports whether one
// went: the cached price rules are then stale, and the caller drops them
// after the transaction (Deps.PriceRulesChanged).
func DropPersonal(ctx context.Context, tx pgx.Tx, userIDs ...int64) (bool, error) {
	tag, err := tx.Exec(ctx, `DELETE FROM segments WHERE kind = 'personal' AND user_id = ANY($1)`, userIDs)
	return tag.RowsAffected() > 0, err
}
