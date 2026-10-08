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
	if len(prefixes) > wire.MaxChainDepth {
		return out, core.ErrInvalidArgument
	}
	seen := map[string]bool{}
	for _, prefix := range prefixes {
		if !wire.ValidDigest(prefix) || seen[prefix] {
			return out, core.ErrInvalidArgument
		}
		seen[prefix] = true
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
		if len(found) != len(prefixes) || len(namespaces) != 1 {
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
