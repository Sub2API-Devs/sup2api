package segment

import (
	"context"
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// makePersonal gives a user a segment of their own, with {"copy": true}
// starting from what the segment they leave has now.
func (s *Service) makePersonal(c *gin.Context) {
	ctx := c.Request.Context()
	uid, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Copy bool `json:"copy"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if err := s.actOnUsers(ctx, uid); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var id int64
	err := s.tx(ctx, func(tx pgx.Tx) (err error) {
		id, err = createPersonal(ctx, tx, uid, in.Copy)
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if in.Copy {
		s.priceRulesChanged(ctx)
	}
	s.render(c, id, httpapi.Created)
}

// userSegmentKind returns the kind of the segment the user is in; a deleted
// user is not found.
func userSegmentKind(ctx context.Context, q store.Querier, userID int64) (string, error) {
	var kind string
	err := q.QueryRow(ctx, `SELECT s.kind FROM users u JOIN segments s ON s.id = u.segment_id
		WHERE u.id = $1 AND u.deleted_at IS NULL`, userID).Scan(&kind)
	if store.IsNoRows(err) {
		return "", UserNotFound(ctx)
	}
	return kind, err
}

// createPersonal makes the personal segment of a user in a named segment and
// moves the user into it. Two requests for one user are settled by
// segments_user_uq.
func createPersonal(ctx context.Context, tx pgx.Tx, userID int64, copyFrom bool) (int64, error) {
	kind, err := userSegmentKind(ctx, tx, userID)
	if err != nil {
		return 0, err
	}
	already := core.ErrConflict.WithMessage(t(ctx, "the user has a personal user group already", "该用户已是个人专属"))
	if kind == core.SegmentPersonal {
		return 0, already
	}
	// The user is not locked yet: referring to the origin waits for a
	// delete of it, and that delete waits for its members.
	var id, from int64
	err = tx.QueryRow(ctx, `INSERT INTO segments (kind, user_id, origin_id, discount)
		SELECT 'personal', u.id, s.id, CASE WHEN $2 THEN s.discount ELSE 1 END
		FROM users u JOIN segments s ON s.id = u.segment_id
		WHERE u.id = $1 AND u.deleted_at IS NULL AND s.kind = 'named'
		RETURNING id, origin_id`, userID, copyFrom).Scan(&id, &from)
	if store.IsNoRows(err) || store.IsUniqueViolation(err, "segments_user_uq") {
		return 0, already
	}
	if err != nil {
		return 0, err
	}
	tag, err := tx.Exec(ctx, `UPDATE users SET segment_id = $2 WHERE id = $1 AND segment_id = $3 AND deleted_at IS NULL`, userID, id, from)
	if err != nil {
		return 0, err
	}
	if tag.RowsAffected() == 0 {
		return 0, core.ErrConflict.WithMessage(t(ctx, "the user changed user group meanwhile, try again", "该用户的用户组刚被修改，请重试"))
	}
	if !copyFrom {
		return id, nil
	}
	return id, copySettings(ctx, tx, from, id)
}

// copySettings gives segment to what segment from has in every group: its
// grants, rate overrides and model prices. The two are unrelated afterwards.
func copySettings(ctx context.Context, tx pgx.Tx, from, to int64) error {
	if _, err := tx.Exec(ctx, `INSERT INTO segment_groups (segment_id, group_id, granted, rate_override)
		SELECT $2::bigint, group_id, granted, rate_override FROM segment_groups WHERE segment_id = $1`, from, to); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO price_rules (group_id, segment_id, model, kind, multiplier, mode, config, expression, expr_hash, updated_by)
		SELECT group_id, $2::bigint, model, kind, multiplier, mode, config, expression, expr_hash, updated_by
		FROM price_rules WHERE segment_id = $1`, from, to)
	return err
}

// removePersonal moves a personal user back to a named segment (?to=, the
// default one without it); the personal segment and its settings are deleted.
func (s *Service) removePersonal(c *gin.Context) {
	ctx := c.Request.Context()
	uid, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if err := s.actOnUsers(ctx, uid); err != nil {
		httpapi.Fail(c, err)
		return
	}
	var dropped bool
	err := s.tx(ctx, func(tx pgx.Tx) error {
		notPersonal := core.ErrNotFound.WithMessage(t(ctx, "the user has no personal user group", "该用户不是个人专属"))
		kind, err := userSegmentKind(ctx, tx, uid)
		if err != nil {
			return err
		}
		if kind != core.SegmentPersonal {
			return notPersonal
		}
		to, err := moveTarget(ctx, tx, c.Query("to"))
		if err != nil {
			return err
		}
		// The user was not locked when checked: only one still personal moves.
		var moved int
		moved, dropped, err = moveUsers(ctx, tx, to, []int64{uid}, core.SegmentPersonal)
		if err == nil && moved == 0 {
			return notPersonal
		}
		return err
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if dropped {
		s.priceRulesChanged(ctx)
	}
	httpapi.NoContent(c)
}

// moveTarget returns the named segment to names, the default one when to is
// empty, locked against deletion until the transaction ends.
func moveTarget(ctx context.Context, tx pgx.Tx, to string) (int64, error) {
	unknown := core.InvalidFields(fieldError(ctx, "to", "invalid", "pick a user group", "请选择一个用户组"))
	var want *int64
	if to != "" {
		n, err := strconv.ParseInt(to, 10, 64)
		if err != nil {
			return 0, unknown
		}
		want = &n
	}
	id, err := LockNamed(ctx, tx, want)
	if errors.Is(err, core.ErrNotFound) {
		return 0, unknown
	}
	return id, err
}

// LockNamed returns the named segment id names, the default one when id is
// nil, locked against deletion until the transaction ends, so a user about
// to join it cannot be left pointing at nothing. It is core.ErrNotFound when
// id names no named segment.
func LockNamed(ctx context.Context, tx pgx.Tx, id *int64) (int64, error) {
	var found int64
	err := tx.QueryRow(ctx, `SELECT id FROM segments
		WHERE kind = 'named' AND CASE WHEN $1::bigint IS NULL THEN is_default ELSE id = $1 END FOR KEY SHARE`, id).Scan(&found)
	if store.IsNoRows(err) {
		return 0, core.ErrNotFound
	}
	return found, err
}
