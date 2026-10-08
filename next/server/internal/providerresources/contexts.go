package providerresources

import (
	"context"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

func validResourceContext(in core.ResourceContext) bool {
	return validOwner(in.Owner) && validBinding(in.Binding) && bounded(in.PluginKey) && in.Kind == "ptc" && bounded(in.ParentID)
}
func contextArgs(in core.ResourceContext) []any {
	return []any{in.Owner.UserID, in.Owner.GroupID, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, in.PluginKey, in.Kind, in.ParentID}
}

const contextPredicate = `user_id=$1 AND group_id=$2 AND account_id=$3 AND principal_id=$4 AND generation=$5 AND plugin_key=$6 AND kind=$7 AND parent_id=$8`

func (s *Service) contextQuota(ctx context.Context, tx pgx.Tx, owner core.ResourceOwner, extra int, at time.Time, renewID string) error {
	var count int64
	err := tx.QueryRow(ctx, `SELECT count(*) FROM provider_resource_contexts c JOIN provider_resources r ON r.public_id=c.resource_id WHERE c.user_id=$1 AND c.group_id=$2 AND r.kind='container' AND r.state='ready' AND (r.expires_at>$3 OR r.public_id=$4)`, owner.UserID, owner.GroupID, at, renewID).Scan(&count)
	if err != nil {
		return err
	}
	if count+int64(extra) > int64(s.limits.MaxContexts) {
		return core.ErrRateLimited.WithMessage("resource context quota exceeded")
	}
	return nil
}

func contextTarget(ctx context.Context, q store.Querier, in core.ResourceContext, id string) (core.ProviderResource, error) {
	r, _, err := read(ctx, q, `user_id=$1 AND group_id=$2 AND public_id=$3`, in.Owner.UserID, in.Owner.GroupID, id)
	if store.IsNoRows(err) {
		return r, core.ErrNotFound
	}
	if err != nil {
		return r, err
	}
	if r.Binding != in.Binding || r.PluginKey != in.PluginKey || r.Kind != "container" || r.State != "ready" || r.ExpiresAt.IsZero() || !r.ExpiresAt.After(time.Now()) {
		return core.ProviderResource{}, core.ErrNotFound
	}
	return r, nil
}

func (s *Service) BindContext(ctx context.Context, in core.ResourceContext) error {
	if !validResourceContext(in) || !bounded(in.ResourceID) {
		return core.ErrInvalidArgument
	}
	return s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockOwner(ctx, tx, in.Owner); err != nil {
			return err
		}
		// Parent IDs belong to the provider identity, not to a tenant namespace.
		// Serialize across owners before checking the existing binding.
		if err := lockRemote(ctx, tx, in.PluginKey, "context:"+in.Kind, in.Binding, in.ParentID); err != nil {
			return err
		}
		if _, err := contextTarget(ctx, tx, in, in.ResourceID); err != nil {
			return err
		}
		var existing string
		var owner core.ResourceOwner
		err := tx.QueryRow(ctx, `SELECT resource_id,user_id,group_id FROM provider_resource_contexts WHERE account_id=$1 AND principal_id=$2 AND generation=$3 AND plugin_key=$4 AND kind=$5 AND parent_id=$6`, in.Binding.AccountID, in.Binding.PrincipalID, in.Binding.Generation, in.PluginKey, in.Kind, in.ParentID).Scan(&existing, &owner.UserID, &owner.GroupID)
		if err == nil {
			if existing != in.ResourceID || owner != in.Owner {
				return core.ErrConflict.WithMessage("parent call is already bound to another resource")
			}
			return nil
		}
		if !store.IsNoRows(err) {
			return err
		}
		if err = s.contextQuota(ctx, tx, in.Owner, 1, time.Now(), ""); err != nil {
			return err
		}
		args := append(contextArgs(in), in.ResourceID)
		_, err = tx.Exec(ctx, `INSERT INTO provider_resource_contexts(user_id,group_id,account_id,principal_id,generation,plugin_key,kind,parent_id,resource_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, args...)
		if store.IsUniqueViolation(err, "") {
			return core.ErrConflict
		}
		return err
	})
}
func (s *Service) ResolveContext(ctx context.Context, in core.ResourceContext) (out core.ProviderResource, err error) {
	if !validResourceContext(in) {
		return out, core.ErrInvalidArgument
	}
	err = s.db.Tx(ctx, func(tx pgx.Tx) error {
		if err := lockOwner(ctx, tx, in.Owner); err != nil {
			return err
		}
		var id string
		err := tx.QueryRow(ctx, `SELECT resource_id FROM provider_resource_contexts WHERE `+contextPredicate, contextArgs(in)...).Scan(&id)
		if store.IsNoRows(err) {
			return core.ErrNotFound
		}
		if err != nil {
			return err
		}
		out, err = contextTarget(ctx, tx, in, id)
		return err
	})
	return
}
