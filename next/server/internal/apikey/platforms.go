package apikey

import (
	"context"
	"sort"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The group module computes the same view for GET /groups; modules do not
// import each other (CONTRACTS §1), so the small helper is duplicated.

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

// platformsOf returns the sorted, distinct platforms of the generation that
// the account types declare; unregistered types serve none.
func platformsOf(gen core.Generation, types []core.AccountTypeKey) []string {
	out := []string{}
	if gen == nil {
		return out
	}
	seen := map[string]bool{}
	for _, k := range types {
		b, ok := gen.AccountType(k.PluginKey, k.Type)
		if !ok {
			continue
		}
		for _, ap := range b.Type.Platforms {
			if seen[ap.Platform] {
				continue
			}
			if _, ok := gen.Platform(ap.Platform); ok {
				seen[ap.Platform] = true
				out = append(out, ap.Platform)
			}
		}
	}
	sort.Strings(out)
	return out
}

// fillPlatforms sets Platforms of the keys to the platforms of their groups
// (CONTRACTS §13), with one query. Without a registry or generation the
// lists are empty.
func (s *Service) fillPlatforms(ctx context.Context, keys []*APIKey) error {
	var gen core.Generation
	if s.reg != nil {
		gen = s.reg.Current()
	}
	byGroup := map[int64][]string{}
	if gen != nil && len(keys) > 0 {
		ids := make([]int64, 0, len(keys))
		seen := map[int64]bool{}
		for _, k := range keys {
			if !seen[k.GroupID] {
				seen[k.GroupID] = true
				ids = append(ids, k.GroupID)
			}
		}
		types, err := groupTypes(ctx, s.db.Pool, ids)
		if err != nil {
			return err
		}
		for _, id := range ids {
			byGroup[id] = platformsOf(gen, types[id])
		}
	}
	for _, k := range keys {
		if ps, ok := byGroup[k.GroupID]; ok {
			k.Platforms = ps
		} else {
			k.Platforms = []string{}
		}
	}
	return nil
}
