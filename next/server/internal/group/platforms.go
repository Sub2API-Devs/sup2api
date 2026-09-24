package group

import (
	"context"
	"sort"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// groupTypes returns the distinct account types (plugin key + type id) of the
// live accounts in each of the groups, in one query.
func groupTypes(ctx context.Context, q store.Querier, ids []int64) (map[int64][]core.AccountTypeKey, error) {
	out := map[int64][]core.AccountTypeKey{}
	if len(ids) == 0 {
		return out, nil
	}
	rows, err := q.Query(ctx, `SELECT DISTINCT ag.group_id, a.plugin_key, a.type
		FROM account_groups ag JOIN accounts a ON a.id = ag.account_id
		WHERE ag.group_id = ANY($1) AND a.deleted_at IS NULL`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var k core.AccountTypeKey
		if err := rows.Scan(&id, &k.PluginKey, &k.Type); err != nil {
			return nil, err
		}
		out[id] = append(out[id], k)
	}
	return out, rows.Err()
}

// platformResolver maps account types to the platforms they serve in one
// generation, memoizing per type.
type platformResolver struct {
	gen  core.Generation
	memo map[core.AccountTypeKey][]string
}

func newPlatformResolver(gen core.Generation) *platformResolver {
	return &platformResolver{gen: gen, memo: map[core.AccountTypeKey][]string{}}
}

// typePlatforms returns the platforms the account type declares that exist
// in the generation; none when the type is not registered.
func (r *platformResolver) typePlatforms(k core.AccountTypeKey) []string {
	if ps, ok := r.memo[k]; ok {
		return ps
	}
	var ps []string
	if b, ok := r.gen.AccountType(k.PluginKey, k.Type); ok {
		for _, ap := range b.Type.Platforms {
			if _, ok := r.gen.Platform(ap.Platform); ok {
				ps = append(ps, ap.Platform)
			}
		}
	}
	r.memo[k] = ps
	return ps
}

// platforms returns the sorted, distinct platforms served by the types.
func (r *platformResolver) platforms(types []core.AccountTypeKey) []string {
	out := []string{}
	if r == nil || r.gen == nil {
		return out
	}
	seen := map[string]bool{}
	for _, k := range types {
		for _, p := range r.typePlatforms(k) {
			if !seen[p] {
				seen[p] = true
				out = append(out, p)
			}
		}
	}
	sort.Strings(out)
	return out
}

// groupPlatforms returns, for each group, the platforms its API keys can
// reach: those served by the account types of its live accounts (CONTRACTS
// §13). Every requested id gets a non-nil slice; without a registry or
// generation the slices are empty.
func (s *Service) groupPlatforms(ctx context.Context, ids []int64) (map[int64][]string, error) {
	out := make(map[int64][]string, len(ids))
	var gen core.Generation
	if s.reg != nil {
		gen = s.reg.Current()
	}
	if gen == nil {
		for _, id := range ids {
			out[id] = []string{}
		}
		return out, nil
	}
	types, err := groupTypes(ctx, s.db.Pool, ids)
	if err != nil {
		return nil, err
	}
	r := newPlatformResolver(gen)
	for _, id := range ids {
		out[id] = r.platforms(types[id])
	}
	return out, nil
}
