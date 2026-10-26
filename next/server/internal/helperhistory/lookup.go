package helperhistory

import (
	"context"
	"errors"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5"
)

// Lookup intentionally ignores the currently proposed account and namespace.
// A known old chain must not disappear merely because routing/config changed.
func (s *Service) Lookup(ctx context.Context, owner core.ResourceOwner, prefixes []string) (out core.HelperHistoryLookup, err error) {
	seen := map[string]bool{}
	for _, prefix := range prefixes {
		if !wire.ValidDigest(prefix) || seen[prefix] {
			return out, core.ErrInvalidArgument
		}
		seen[prefix] = true
	}
	if !validOwner(owner) || s.db == nil || s.cipher == nil {
		return out, core.ErrInvalidArgument
	}
	// Most requests mention no stored public prefix at all, and for them the
	// answer is Unknown; the advisory lock and the transaction below exist to
	// read a chain consistently with its writers, which an empty answer does
	// not need. One unlocked read first keeps those requests at one round
	// trip. A Commit that lands between this read and the request's use of the
	// answer can only make the request look unknown (it is forwarded as an
	// ordinary one; a later request sees the chain). It can never fabricate a
	// hit — KnownReady/KnownUnrestorable are still decided inside the locked
	// transaction — and never crosses owners: user_id and group_id are in the
	// query.
	known, err := s.anyPrefix(ctx, owner, prefixes)
	if err != nil || !known {
		if err == nil {
			out.State = core.HelperHistoryUnknown
		}
		return out, err
	}
	err = s.transaction(ctx, owner, func(tx pgx.Tx) error {
		namespaces, found, e := discoverPrefixes(ctx, tx, owner, prefixes)
		if e != nil {
			return e
		}
		if len(found) == 0 {
			out.State = core.HelperHistoryUnknown
			return nil
		}
		out.State = core.HelperHistoryKnownUnrestorable
		if len(prefixes) > wire.MaxChainDepth || len(found) != len(prefixes) || len(namespaces) != 1 {
			return nil
		}
		namespace := ""
		for n := range namespaces {
			namespace = n
		}
		chain, e := s.resolve(ctx, tx, owner, prefixes, namespace, s.now())
		if e != nil {
			// Known missing/expired/ambiguous/corrupt state is not an unknown lookup.
			// Infrastructure errors still propagate, so callers cannot silently reroute.
			var ce *core.Error
			if errors.As(e, &ce) && (ce.Code == core.ErrNotFound.Code || ce.Code == core.ErrConflict.Code || ce.Code == core.ErrRateLimited.Code) {
				return nil
			}
			return e
		}
		out = core.HelperHistoryLookup{State: core.HelperHistoryKnownReady, Chain: chain, Namespace: namespace}
		return nil
	})
	return
}

// anyPrefix is the unlocked probe of Lookup: does any of prefixes belong to a
// record of this owner at all? It reads what Lookup's transaction would read
// first, just without the lock.
func (s *Service) anyPrefix(ctx context.Context, o core.ResourceOwner, prefixes []string) (bool, error) {
	var found bool
	err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM provider_helper_records WHERE user_id=$1 AND group_id=$2 AND public_prefix_digest=ANY($3))`,
		o.UserID, o.GroupID, prefixes).Scan(&found)
	return found, err
}
func discoverPrefixes(ctx context.Context, q store.Querier, o core.ResourceOwner, prefixes []string) (map[string]bool, map[string]bool, error) {
	namespaces, found := map[string]bool{}, map[string]bool{}
	rows, e := q.Query(ctx, `SELECT DISTINCT namespace,public_prefix_digest FROM provider_helper_records WHERE user_id=$1 AND group_id=$2 AND public_prefix_digest=ANY($3)`, o.UserID, o.GroupID, prefixes)
	if e != nil {
		return nil, nil, e
	}
	defer rows.Close()
	for rows.Next() {
		var namespace, prefix string
		if e = rows.Scan(&namespace, &prefix); e != nil {
			return nil, nil, e
		}
		namespaces[namespace] = true
		found[prefix] = true
	}
	return namespaces, found, rows.Err()
}
