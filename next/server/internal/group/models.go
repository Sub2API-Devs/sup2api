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
	if _, err := s.load(ctx, id); err != nil {
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

// Offered returns the models a group with these accounts provides, sorted:
// the declared ones and, when an account declares none, every model in priced
// (those with an enabled global price), through the model policy of the
// group.
func (m Models) Offered(priced []string, policy core.GroupInfo) []string {
	names := m.Models
	if m.UnrestrictedAccounts > 0 {
		names = append(slices.Clone(names), priced...)
		slices.Sort(names)
		names = slices.Compact(names)
	}
	out := []string{}
	for _, name := range names {
		if policy.AllowsModel(name) {
			out = append(out, name)
		}
	}
	return out
}

// offeredModels returns the models each of the groups provides
// (Models.Offered), by group id. Of a group it reads the id and the model
// policy.
func offeredModels(ctx context.Context, q store.Querier, groups []core.GroupInfo) (map[int64][]string, error) {
	ids := make([]int64, len(groups))
	for i, g := range groups {
		ids[i] = g.ID
	}
	provided, err := ProvidedModels(ctx, q, ids)
	if err != nil {
		return nil, err
	}
	rows, err := q.Query(ctx, `SELECT model FROM model_prices WHERE enabled`)
	if err != nil {
		return nil, err
	}
	priced, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, err
	}
	out := make(map[int64][]string, len(groups))
	for _, g := range groups {
		out[g.ID] = provided[g.ID].Offered(priced, g)
	}
	return out, nil
}

// groupsProviding returns the ids of the groups that provide model; never nil.
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
	offered, err := offeredModels(ctx, s.db.Pool, groups)
	if err != nil {
		return nil, err
	}
	ids := []int64{}
	for _, g := range groups {
		if slices.Contains(offered[g.ID], model) {
			ids = append(ids, g.ID)
		}
	}
	return ids, nil
}
