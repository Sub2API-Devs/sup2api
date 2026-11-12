package group

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"slices"
	"sort"
	"strings"
)

// Models contains only request model IDs; it never exposes account credentials.
type Models struct {
	Models               []string `json:"models"`
	UnrestrictedAccounts int      `json:"unrestricted_accounts"`
}

func (s *Service) models(c *gin.Context) {
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	ctx := c.Request.Context()
	if _, err := s.loadRow(ctx, id); err != nil {
		httpapi.Fail(c, err)
		return
	}
	byGroup, err := ProvidedModels(ctx, s.db.Pool, []int64{id})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, byGroup[id])
}

// ProvidedModels returns, for each of the groups, the request models its
// accounts declare, sorted, and how many of its accounts declare none (they
// serve every model). Deleted accounts do not count. Every asked group has an
// entry.
func ProvidedModels(ctx context.Context, q store.Querier, groupIDs []int64) (map[int64]Models, error) {
	rows, err := q.Query(ctx, `SELECT ag.group_id, a.models FROM account_groups ag JOIN accounts a ON a.id=ag.account_id
		WHERE ag.group_id = ANY($1) AND a.deleted_at IS NULL`, groupIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	sets := make(map[int64]map[string]bool, len(groupIDs))
	out := make(map[int64]Models, len(groupIDs))
	for _, id := range groupIDs {
		sets[id] = map[string]bool{}
		out[id] = Models{Models: []string{}}
	}
	for rows.Next() {
		var groupID int64
		var ids []string
		if err := rows.Scan(&groupID, &ids); err != nil {
			return nil, err
		}
		m := out[groupID]
		if len(ids) == 0 {
			m.UnrestrictedAccounts++
		}
		for _, model := range ids {
			model = strings.TrimSpace(model)
			if model != "" && !sets[groupID][model] {
				sets[groupID][model] = true
				m.Models = append(m.Models, model)
			}
		}
		out[groupID] = m
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	for _, m := range out {
		sort.Strings(m.Models)
	}
	return out, nil
}

// Offers reports whether a group with these accounts provides model: an
// account declares it, or one declares none and the model has an enabled
// global price (priced), and the model policy of the group allows it. It is
// the one place the rule is written. Models must be sorted, as
// ProvidedModels returns them.
func (m Models) Offers(model string, priced bool, policy core.GroupInfo) bool {
	_, declared := slices.BinarySearch(m.Models, model)
	return (declared || priced && m.UnrestrictedAccounts > 0) && policy.AllowsModel(model)
}

// Offered returns the models a group with these accounts provides (Offers),
// sorted; priced are the models with an enabled global price.
func (m Models) Offered(priced []string, policy core.GroupInfo) []string {
	out := []string{}
	keep := func(names []string, havePrice bool) {
		for _, name := range names {
			if m.Offers(name, havePrice, policy) {
				out = append(out, name)
			}
		}
	}
	keep(m.Models, false)
	keep(priced, true)
	slices.Sort(out)
	return slices.Compact(out)
}

// OfferedModels returns the models each of the groups provides
// (Models.Offered), by group id; priced are the models with an enabled global
// price. Of a group it reads the id and the model policy.
func OfferedModels(ctx context.Context, q store.Querier, groups []core.GroupInfo, priced []string) (map[int64][]string, error) {
	provided, err := providedModels(ctx, q, groups)
	if err != nil {
		return nil, err
	}
	out := make(map[int64][]string, len(groups))
	for _, g := range groups {
		out[g.ID] = provided[g.ID].Offered(priced, g)
	}
	return out, nil
}

// providedModels returns ProvidedModels of the groups.
func providedModels(ctx context.Context, q store.Querier, groups []core.GroupInfo) (map[int64]Models, error) {
	ids := make([]int64, len(groups))
	for i, g := range groups {
		ids[i] = g.ID
	}
	return ProvidedModels(ctx, q, ids)
}

// offeredModels returns OfferedModels of the groups against the models that
// have an enabled global price now.
func offeredModels(ctx context.Context, q store.Querier, groups []core.GroupInfo) (map[int64][]string, error) {
	rows, err := q.Query(ctx, `SELECT model FROM model_prices WHERE enabled`)
	if err != nil {
		return nil, err
	}
	priced, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, err
	}
	return OfferedModels(ctx, q, groups, priced)
}

// groupsProviding returns the ids of the groups that provide model
// (Models.Offers); never nil.
func (s *Service) groupsProviding(ctx context.Context, model string) ([]int64, error) {
	rows, err := s.db.Pool.Query(ctx, `SELECT id, model_allowlist, model_filter_mode FROM groups`)
	if err != nil {
		return nil, err
	}
	groups, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (g core.GroupInfo, err error) {
		err = r.Scan(&g.ID, &g.ModelAllowlist, &g.ModelFilterMode)
		return g, err
	})
	if err != nil {
		return nil, err
	}
	provided, err := providedModels(ctx, s.db.Pool, groups)
	if err != nil {
		return nil, err
	}
	var priced bool
	if err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM model_prices WHERE model = $1 AND enabled)`, model).Scan(&priced); err != nil {
		return nil, err
	}
	ids := []int64{}
	for _, g := range groups {
		if provided[g.ID].Offers(model, priced, g) {
			ids = append(ids, g.ID)
		}
	}
	return ids, nil
}
