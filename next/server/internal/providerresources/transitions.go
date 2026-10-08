package providerresources

import (
	"bytes"
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"time"
)

func (s *Service) mutate(ctx context.Context, owner core.ResourceOwner, id string, fn func(pgx.Tx, core.ProviderResource) error) error {
	if !validOwner(owner) || !bounded(id) {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockOwner(ctx, tx, owner); err != nil {
			return err
		}
		r, _, err := read(ctx, tx, `user_id=$1 AND group_id=$2 AND public_id=$3 FOR UPDATE`, owner.UserID, owner.GroupID, id)
		if store.IsNoRows(err) {
			return core.ErrNotFound
		}
		if err != nil {
			return err
		}
		return fn(tx, r)
	})
}

func (s *Service) Finalize(ctx context.Context, in core.ResourceCompletion) (out core.ProviderResource, err error) {
	if !bounded(in.RemoteID) || !bounded(in.OperationID) || !validBinding(in.Binding) || in.Bytes < 0 || in.Bytes > s.limits.MaxResourceBytes {
		return out, core.ErrInvalidArgument
	}
	meta, err := metadata(in.Metadata)
	if err != nil {
		return out, err
	}
	err = s.mutate(ctx, in.Owner, in.PublicID, func(tx pgx.Tx, r core.ProviderResource) error {
		if r.Binding != in.Binding || r.OperationID != in.OperationID {
			return core.ErrConflict
		}
		expires := r.ExpiresAt
		if in.ExpiresAt != nil && !in.ExpiresAt.IsZero() {
			providerExpiry := in.ExpiresAt.UTC().Truncate(time.Microsecond)
			if expires.IsZero() || providerExpiry.Before(expires) {
				expires = providerExpiry
			}
		}
		if r.State == "ready" {
			old, _ := metadata(r.Metadata)
			if r.RemoteID != in.RemoteID || r.Bytes != in.Bytes || !bytes.Equal(old, meta) || !r.ExpiresAt.Equal(expires) {
				return core.ErrConflict
			}
			out = r
			return nil
		}
		if r.State != "pending" && r.State != "uncertain" {
			return core.ErrConflict
		}
		if e := lockRemote(ctx, tx, r.PluginKey, r.Kind, r.Binding, in.RemoteID); e != nil {
			return e
		}
		known, e := lookupRemote(ctx, tx, r.PluginKey, r.Kind, r.Binding, in.RemoteID)
		if e != nil {
			return e
		}
		for _, other := range known {
			if other.PublicID != r.PublicID {
				return core.ErrConflict.WithMessage("remote resource identity was previously registered")
			}
		}
		if err := s.quota(ctx, tx, in.Owner, 0, in.Bytes-r.Bytes); err != nil {
			return err
		}
		var storedExpiry *time.Time
		if !expires.IsZero() {
			storedExpiry = &expires
		}
		_, err := tx.Exec(ctx, `UPDATE provider_resources SET state='ready',remote_id=$2,bytes=$3,metadata=$4,expires_at=$5,updated_at=now() WHERE public_id=$1`, r.PublicID, in.RemoteID, in.Bytes, meta, storedExpiry)
		if store.IsUniqueViolation(err, "") {
			return core.ErrConflict.WithMessage("remote resource already registered")
		}
		if err != nil {
			return err
		}
		out, _, err = read(ctx, tx, `public_id=$1`, r.PublicID)
		return err
	})
	return out, err
}

func (s *Service) MarkUncertain(ctx context.Context, owner core.ResourceOwner, id, op string) error {
	return s.mutate(ctx, owner, id, func(tx pgx.Tx, r core.ProviderResource) error {
		if r.OperationID != op || (r.State != "pending" && r.State != "uncertain") {
			return core.ErrConflict
		}
		_, err := tx.Exec(ctx, `UPDATE provider_resources SET state='uncertain',updated_at=now() WHERE public_id=$1`, id)
		return err
	})
}

// FailCreate accepts only recognized, authenticated provider rejection classes.
// The caller must establish that the response belongs to this exact operation;
// a status code alone, timeout, proxy error, or uncertain result is insufficient.
func (s *Service) FailCreate(ctx context.Context, owner core.ResourceOwner, id, op, evidenceCode string) error {
	switch evidenceCode {
	case "invalid_request_error", "authentication_error", "permission_error":
	default:
		return core.ErrInvalidArgument.WithMessage("creation failure needs confirmed provider rejection evidence")
	}
	return s.mutate(ctx, owner, id, func(tx pgx.Tx, r core.ProviderResource) error {
		if r.OperationID != op || (r.State != "pending" && r.State != "uncertain" && r.State != "failed") {
			return core.ErrConflict
		}
		if r.State == "failed" {
			var old string
			if err := tx.QueryRow(ctx, `SELECT failure_code FROM provider_resources WHERE public_id=$1`, id).Scan(&old); err != nil {
				return err
			}
			if old != evidenceCode {
				return core.ErrConflict
			}
			return nil
		}
		_, err := tx.Exec(ctx, `UPDATE provider_resources SET state='failed',failure_code=$2,updated_at=now() WHERE public_id=$1`, id, evidenceCode)
		return err
	})
}

func (s *Service) BeginDelete(ctx context.Context, owner core.ResourceOwner, id string, binding core.ResourceBinding) (out core.ResourceReservation, err error) {
	err = s.mutate(ctx, owner, id, func(tx pgx.Tx, r core.ProviderResource) error {
		if r.Binding != binding {
			return core.ErrConflict.WithMessage("resource issuer identity changed")
		}
		out.Resource = r
		if r.State != "ready" {
			return nil
		}
		op := uuid.NewString()
		_, e := tx.Exec(ctx, `UPDATE provider_resources SET state='deleting',operation_id=$2,updated_at=now() WHERE public_id=$1`, id, op)
		if e != nil {
			return e
		}
		out.Resource.State = "deleting"
		out.Resource.OperationID = op
		out.Dispatch = true
		return nil
	})
	return
}

// A failed or timed out delete is not evidence that the remote object vanished.
// Retrying requires an explicit reconciliation operation, not BeginDelete.
func (s *Service) FinishDelete(ctx context.Context, owner core.ResourceOwner, id, op string, confirmed bool) error {
	return s.mutate(ctx, owner, id, func(tx pgx.Tx, r core.ProviderResource) error {
		if r.OperationID != op {
			return core.ErrConflict
		}
		if r.State == "deleted" && confirmed {
			return nil
		}
		if r.State != "deleting" && r.State != "delete_uncertain" {
			return core.ErrConflict
		}
		state := "delete_uncertain"
		if confirmed {
			state = "deleted"
		}
		_, err := tx.Exec(ctx, `UPDATE provider_resources SET state=$2,updated_at=now() WHERE public_id=$1`, id, state)
		return err
	})
}
