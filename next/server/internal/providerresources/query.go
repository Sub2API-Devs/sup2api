package providerresources

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

func queryFilter(owner core.ResourceOwner, q core.ResourceQuery) (string, []any, error) {
	if !validOwner(owner) || !bounded(q.PluginKey) || !bounded(q.Kind) || q.Limit < 1 || q.Limit > 1000 || len(q.IDs) > 100 || (q.BeforeID != "" && q.AfterID != "") {
		return "", nil, core.ErrInvalidArgument
	}
	for _, id := range append(slices.Clone(q.IDs), q.BeforeID, q.AfterID) {
		if id != "" && !bounded(id) {
			return "", nil, core.ErrInvalidArgument
		}
	}
	for _, id := range q.AccountIDs {
		if id <= 0 {
			return "", nil, core.ErrInvalidArgument
		}
	}
	args := []any{owner.UserID, owner.GroupID, q.PluginKey, q.Kind, q.AccountIDs}
	where := `user_id=$1 AND group_id=$2 AND plugin_key=$3 AND kind=$4 AND account_id=ANY($5::bigint[])`
	if q.ExpiredWithin < 0 || q.ExpiredWithin > 365*24*time.Hour || (q.UnexpiredOnly && q.ExpiredWithin > 0) {
		return "", nil, core.ErrInvalidArgument
	}
	if q.ReadyOnly {
		where += ` AND state='ready'`
	}
	if q.UnexpiredOnly {
		where += ` AND (expires_at IS NULL OR expires_at>now())`
	}
	if q.ExpiredWithin > 0 {
		args = append(args, q.ExpiredWithin.Seconds())
		where += fmt.Sprintf(` AND (expires_at IS NULL OR expires_at>now()-($%d * interval '1 second'))`, len(args))
	}
	if len(q.IDs) > 0 {
		args = append(args, q.IDs)
		where += fmt.Sprintf(` AND public_id=ANY($%d::text[])`, len(args))
	}
	return where, args, nil
}

// Query filters inside SQL before pagination. A read-only repeatable snapshot
// makes cursor eligibility and page membership consistent during concurrent
// completion/deletion. Public IDs only break ties in provider creation order.
func (s *Service) Query(ctx context.Context, owner core.ResourceOwner, q core.ResourceQuery) (core.ResourcePage, error) {
	return s.query(ctx, owner, q, false)
}
func (s *Service) query(ctx context.Context, owner core.ResourceOwner, q core.ResourceQuery, skillVersions bool) (out core.ResourcePage, err error) {
	where, args, err := queryFilter(owner, q)
	if err != nil {
		return out, err
	}
	if skillVersions {
		where += ` AND EXISTS(SELECT 1 FROM provider_skill_versions v WHERE v.parent_id=provider_resources.public_id AND v.state='ready')`
	}
	out.Items = []core.ProviderResource{}
	if len(q.AccountIDs) == 0 {
		return out, nil
	}
	tx, err := s.db.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	cursor := q.AfterID
	if q.BeforeID != "" {
		cursor = q.BeforeID
	}
	if cursor != "" {
		cursorArgs := append(slices.Clone(args), cursor)
		r, _, e := read(ctx, tx, where+fmt.Sprintf(` AND public_id=$%d`, len(cursorArgs)), cursorArgs...)
		if store.IsNoRows(e) {
			return out, core.ErrNotFound
		}
		if e != nil {
			return out, e
		}
		op := "<"
		if q.BeforeID != "" {
			op = ">"
		}
		args = append(args, r.CreatedAt, r.PublicID)
		where += fmt.Sprintf(` AND (created_at,public_id)%s($%d,$%d)`, op, len(args)-1, len(args))
	}
	direction := "DESC"
	if q.BeforeID != "" {
		direction = "ASC"
	}
	args = append(args, q.Limit+1)
	sql := `SELECT ` + columns + ` FROM provider_resources WHERE ` + where + ` ORDER BY created_at ` + direction + `,public_id ` + direction + fmt.Sprintf(` LIMIT $%d`, len(args))
	rows, e := tx.Query(ctx, sql, args...)
	if e != nil {
		return out, e
	}
	for rows.Next() {
		r, _, e := scan(rows)
		if e != nil {
			rows.Close()
			return out, e
		}
		out.Items = append(out.Items, r)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return out, err
	}
	out.HasMore = len(out.Items) > q.Limit
	if out.HasMore {
		out.Items = out.Items[:q.Limit]
	}
	if strings.EqualFold(direction, "ASC") {
		slices.Reverse(out.Items)
	}
	err = tx.Commit(ctx)
	return out, err
}
