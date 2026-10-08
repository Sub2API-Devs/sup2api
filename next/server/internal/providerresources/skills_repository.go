package providerresources

import (
	"context"
	"strconv"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

var _ core.SkillResources = (*Service)(nil)

const skillVersionColumns = `public_id,remote_id,legacy_epoch,state,operation_id,bytes,metadata,created_at`

func readSkillVersion(ctx context.Context, q store.Querier, parent core.ProviderResource, where string, args ...any) (v core.SkillVersion, err error) {
	v.Parent = parent
	err = q.QueryRow(ctx, `SELECT `+skillVersionColumns+` FROM provider_skill_versions WHERE `+where, args...).Scan(&v.PublicVersionID, &v.RemoteVersionID, &v.LegacyEpoch, &v.State, &v.OperationID, &v.Bytes, &v.Metadata, &v.CreatedAt)
	return
}
func skillParent(ctx context.Context, q store.Querier, owner core.ResourceOwner, id string, ready bool) (core.ProviderResource, error) {
	r, _, err := read(ctx, q, `user_id=$1 AND group_id=$2 AND public_id=$3`, owner.UserID, owner.GroupID, id)
	if store.IsNoRows(err) {
		return r, core.ErrNotFound
	}
	if err != nil {
		return r, err
	}
	if r.Kind != "skill" || r.PluginKey != "ccgateway" || (ready && r.State != "ready") {
		return core.ProviderResource{}, core.ErrNotFound
	}
	return r, nil
}
func (s *Service) FindVersion(ctx context.Context, owner core.ResourceOwner, parentID, selector string) (core.SkillVersion, error) {
	return s.findSkillVersion(ctx, owner, parentID, selector, false)
}
func (s *Service) FindObservedVersion(ctx context.Context, owner core.ResourceOwner, parentID, selector string) (core.SkillVersion, error) {
	if selector == "latest" {
		return core.SkillVersion{}, core.ErrInvalidArgument
	}
	return s.findSkillVersion(ctx, owner, parentID, selector, true)
}
func (s *Service) findSkillVersion(ctx context.Context, owner core.ResourceOwner, parentID, selector string, providerSelector bool) (core.SkillVersion, error) {
	if !validOwner(owner) || !bounded(parentID) || !bounded(selector) {
		return core.SkillVersion{}, core.ErrInvalidArgument
	}
	tx, err := s.db.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return core.SkillVersion{}, err
	}
	defer tx.Rollback(ctx)
	parent, err := skillParent(ctx, tx, owner, parentID, true)
	if err != nil {
		return core.SkillVersion{}, err
	}
	var v core.SkillVersion
	if providerSelector {
		v, err = readSkillVersion(ctx, tx, parent, `parent_id=$1 AND state='ready' AND (remote_id=$2 OR legacy_epoch=$2)`, parentID, selector)
	} else if selector == "latest" {
		v, err = readSkillVersion(ctx, tx, parent, `parent_id=$1 AND state='ready' ORDER BY created_at DESC,public_id DESC LIMIT 1`, parentID)
	} else {
		v, err = readSkillVersion(ctx, tx, parent, `parent_id=$1 AND state='ready' AND (public_id=$2 OR legacy_epoch=$2)`, parentID, selector)
	}
	if store.IsNoRows(err) {
		err = core.ErrNotFound
	}
	if err == nil {
		err = tx.Commit(ctx)
	}
	return v, err
}
func (s *Service) ListSkillVersions(ctx context.Context, owner core.ResourceOwner, parentID, after string, limit int) (out core.SkillVersionPage, err error) {
	if limit < 1 || limit > 1000 || !validOwner(owner) || !bounded(parentID) || (after != "" && !bounded(after)) {
		return out, core.ErrInvalidArgument
	}
	tx, err := s.db.Pool.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return out, err
	}
	defer tx.Rollback(ctx)
	p, err := skillParent(ctx, tx, owner, parentID, true)
	if err != nil {
		return out, err
	}
	query := `SELECT ` + skillVersionColumns + ` FROM provider_skill_versions WHERE parent_id=$1 AND state='ready'`
	args := []any{parentID}
	if after != "" {
		v, e := readSkillVersion(ctx, tx, p, `parent_id=$1 AND public_id=$2 AND state='ready'`, parentID, after)
		if store.IsNoRows(e) {
			return out, core.ErrNotFound
		}
		if e != nil {
			return out, e
		}
		query += ` AND (created_at,public_id)<($2,$3)`
		args = append(args, v.CreatedAt, v.PublicVersionID)
	}
	query += ` ORDER BY created_at DESC,public_id DESC LIMIT ` + strconv.Itoa(limit+1)
	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	out.Items = []core.SkillVersion{}
	for rows.Next() {
		v := core.SkillVersion{Parent: p}
		if err = rows.Scan(&v.PublicVersionID, &v.RemoteVersionID, &v.LegacyEpoch, &v.State, &v.OperationID, &v.Bytes, &v.Metadata, &v.CreatedAt); err != nil {
			return out, err
		}
		out.Items = append(out.Items, v)
	}
	if err = rows.Err(); err != nil {
		return out, err
	}
	out.HasMore = len(out.Items) > limit
	if out.HasMore {
		out.Items = out.Items[:limit]
	}
	rows.Close()
	return out, tx.Commit(ctx)
}

func (s *Service) ListSkills(ctx context.Context, owner core.ResourceOwner, accounts []int64, after string, limit int) (core.ResourcePage, error) {
	return s.query(ctx, owner, core.ResourceQuery{PluginKey: "ccgateway", Kind: "skill", AccountIDs: accounts, AfterID: after, Limit: limit, ReadyOnly: true}, true)
}
