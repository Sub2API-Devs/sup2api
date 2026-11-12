package group

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
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
