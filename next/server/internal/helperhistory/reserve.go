package helperhistory

import (
	"context"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

func (s *Service) Reserve(ctx context.Context, in core.HelperHistoryReservation) (out core.HelperHistoryAttempt, err error) {
	if !validBinding(in.Binding) || !bounded(in.RequestID) || len(in.RequestID) > 64 || !wire.ValidDigest(in.RequestDigest) || !bounded(in.Namespace) || in.ReserveBytes <= 0 || in.ReserveBytes > wire.MaxPayloadBytes {
		return out, core.ErrInvalidArgument
	}
	err = s.transaction(ctx, in.Owner, func(tx pgx.Tx) error {
		now := s.now()
		if e := s.clean(ctx, tx, in.Owner, now); e != nil {
			return e
		}
		chain, e := s.resolve(ctx, tx, in.Owner, in.PriorPrefixes, in.Namespace, now)
		if e != nil {
			return e
		}
		parent := ""
		if len(chain.Records) > 0 {
			if chain.Binding != in.Binding {
				return core.ErrConflict.WithMessage("helper history issuer changed")
			}
			parent = chain.Records[len(chain.Records)-1].Receipt
		}
		var id string
		e = tx.QueryRow(ctx, `SELECT id FROM provider_helper_attempts WHERE user_id=$1 AND group_id=$2 AND request_id=$3`, in.Owner.UserID, in.Owner.GroupID, in.RequestID).Scan(&id)
		if e == nil {
			old, e := readAttempt(ctx, tx, in.Owner, id)
			if e != nil {
				return e
			}
			if old.requestDigest != in.RequestDigest || old.namespace != in.Namespace || old.Binding != in.Binding || old.ParentReceipt != parent || old.reservedBytes != in.ReserveBytes {
				return core.ErrConflict
			}
			if !old.ExpiresAt.After(now) {
				return core.ErrNotFound
			}
			out = old.HelperHistoryAttempt
			return nil
		}
		if !store.IsNoRows(e) {
			return e
		}
		if e = s.quota(ctx, tx, in.Owner, now, in.ReserveBytes); e != nil {
			return e
		}
		id, e = identifier()
		if e != nil {
			return e
		}
		out = core.HelperHistoryAttempt{ID: id, ParentReceipt: parent, State: "reserved", Binding: in.Binding, ExpiresAt: now.Add(s.options.Retention)}
		_, e = tx.Exec(ctx, `INSERT INTO provider_helper_attempts(id,user_id,group_id,request_id,request_digest,namespace,account_id,principal_id,generation,parent_receipt,state,reserved_bytes,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'reserved',$11,$12,$13)`, id, in.Owner.UserID, in.Owner.GroupID, in.RequestID, in.RequestDigest, in.Namespace, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, parent, in.ReserveBytes, now, out.ExpiresAt)
		return e
	})
	return
}
func (s *Service) transition(ctx context.Context, o core.ResourceOwner, id, from, to string) error {
	if !bounded(id) {
		return core.ErrInvalidArgument
	}
	return s.transaction(ctx, o, func(tx pgx.Tx) error {
		a, e := readAttempt(ctx, tx, o, id)
		if e != nil {
			return e
		}
		if !a.ExpiresAt.After(s.now()) {
			return core.ErrNotFound
		}
		if a.State == to && to != "dispatched" {
			return nil
		}
		if a.State != from {
			return core.ErrConflict.WithMessage("helper history attempt cannot transition")
		}
		_, e = tx.Exec(ctx, `UPDATE provider_helper_attempts SET state=$1 WHERE id=$2`, to, id)
		return e
	})
}
func (s *Service) MarkDispatched(c context.Context, o core.ResourceOwner, id string) error {
	return s.transition(c, o, id, "reserved", "dispatched")
}
func (s *Service) MarkUncertain(c context.Context, o core.ResourceOwner, id string) error {
	return s.transition(c, o, id, "dispatched", "uncertain")
}
func (s *Service) Abort(c context.Context, o core.ResourceOwner, id string) error {
	return s.transition(c, o, id, "reserved", "aborted")
}
