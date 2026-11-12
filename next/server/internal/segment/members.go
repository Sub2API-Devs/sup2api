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
		moved, dropped, err = moveUsers(ctx, tx, id, in.UserIDs)
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
// personal segment of each one who had one, with its settings. It returns
// how many moved (a user already there does not) and whether a personal
// segment went: its price rules went with it.
func moveUsers(ctx context.Context, tx pgx.Tx, to int64, userIDs []int64) (moved int, dropped bool, err error) {
	// Users are locked in id order, so concurrent moves cannot deadlock.
	rows, err := tx.Query(ctx, `WITH m AS (SELECT id FROM users
			WHERE id = ANY($2) AND deleted_at IS NULL AND segment_id <> $1 ORDER BY id FOR NO KEY UPDATE)
		UPDATE users u SET segment_id = $1 FROM m WHERE u.id = m.id RETURNING u.id`, to, userIDs)
	if err != nil {
		return 0, false, err
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[int64])
	if err != nil {
		return 0, false, err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM segments WHERE kind = 'personal' AND user_id = ANY($1)`, ids)
	return len(ids), tag.RowsAffected() > 0, err
}
