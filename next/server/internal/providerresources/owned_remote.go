package providerresources

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// FindOwnedRemote is an exact read of a verified provider response identity.
// Ownership, issuer, readiness and expiry remain part of the SQL predicate;
// callers cannot use this method to discover or register workspace resources.
func (s *Service) FindOwnedRemote(ctx context.Context, owner core.ResourceOwner, binding core.ResourceBinding, kind, id string) (core.ProviderResource, error) {
	if !validOwner(owner) || !validBinding(binding) || !bounded(kind) || !bounded(id) {
		return core.ProviderResource{}, core.ErrInvalidArgument
	}
	r, _, err := read(ctx, s.db.Pool, `user_id=$1 AND group_id=$2 AND plugin_key='ccgateway' AND kind=$3 AND account_id=$4 AND principal_id=$5 AND generation=$6 AND remote_id=$7 AND state='ready' AND (expires_at IS NULL OR expires_at>now())`, owner.UserID, owner.GroupID, kind, binding.AccountID, binding.PrincipalID, binding.Generation, id)
	if store.IsNoRows(err) {
		err = core.ErrNotFound
	}
	return r, err
}
