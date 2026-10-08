package providerresources

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func (s *Service) BeginSkillDelete(ctx context.Context, owner core.ResourceOwner, parentID, selector string) (out core.SkillDeleteIntent, err error) {
	if !validOwner(owner) || !bounded(parentID) || selector == "latest" {
		return out, core.ErrInvalidArgument
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, owner); e != nil {
			return e
		}
		p, e := skillParent(ctx, tx, owner, parentID, true)
		if e != nil {
			return e
		}
		out.Parent = p
		op := uuid.NewString()
		if selector == "" {
			var busy bool
			if e = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM provider_skill_versions WHERE parent_id=$1 AND state IN('pending','uncertain','deleting','delete_uncertain'))`, p.PublicID).Scan(&busy); e != nil {
				return e
			}
			if busy {
				return core.ErrConflict.WithMessage("skill has an unfinished version mutation")
			}
			_, e = tx.Exec(ctx, `UPDATE provider_resources SET state='deleting',operation_id=$2,updated_at=now() WHERE public_id=$1`, p.PublicID, op)
		} else {
			v, x := readSkillVersion(ctx, tx, p, `parent_id=$1 AND (public_id=$2 OR legacy_epoch=$2) AND state='ready'`, p.PublicID, selector)
			if store.IsNoRows(x) {
				return core.ErrNotFound
			}
			if x != nil {
				return x
			}
			_, e = tx.Exec(ctx, `UPDATE provider_skill_versions SET state='deleting',operation_id=$2,updated_at=now() WHERE public_id=$1`, v.PublicVersionID, op)
			v.State = "deleting"
			v.OperationID = op
			out.Version = &v
		}
		if e != nil {
			return e
		}
		out.OperationID = op
		out.Dispatch = true
		return nil
	})
	return
}
func (s *Service) FinishSkillDelete(ctx context.Context, in core.SkillDeleteCompletion) error {
	if !validOwner(in.Owner) || !bounded(in.ParentID) || !bounded(in.OperationID) || (in.Outcome != "deleted" && in.Outcome != "uncertain" && (in.Outcome != "rejected" || !confirmedSkillRejection(in.EvidenceCode))) {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if e := lockOwner(ctx, tx, in.Owner); e != nil {
			return e
		}
		p, e := skillParent(ctx, tx, in.Owner, in.ParentID, false)
		if e != nil {
			return e
		}
		table, id, state, op := "provider_resources", p.PublicID, p.State, p.OperationID
		if in.PublicVersionID != "" {
			v, x := readSkillVersion(ctx, tx, p, `parent_id=$1 AND public_id=$2`, p.PublicID, in.PublicVersionID)
			if x != nil {
				return x
			}
			table, id, state, op = "provider_skill_versions", v.PublicVersionID, v.State, v.OperationID
		}
		if op != in.OperationID {
			return core.ErrConflict
		}
		target := "delete_uncertain"
		if in.Outcome == "deleted" {
			target = "deleted"
		}
		if in.Outcome == "rejected" {
			target = "ready"
		}
		if state == target {
			return nil
		}
		if state != "deleting" && state != "delete_uncertain" {
			return core.ErrConflict
		}
		if _, e = tx.Exec(ctx, `UPDATE `+table+` SET state=$2,updated_at=now() WHERE public_id=$1`, id, target); e != nil {
			return e
		}
		if in.PublicVersionID == "" && target == "deleted" {
			_, e = tx.Exec(ctx, `UPDATE provider_skill_versions SET state='deleted',updated_at=now() WHERE parent_id=$1`, p.PublicID)
		}
		return e
	})
}
