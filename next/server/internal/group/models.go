package group

import (
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
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
	rows, err := s.db.Pool.Query(ctx, `SELECT a.models FROM account_groups ag JOIN accounts a ON a.id=ag.account_id WHERE ag.group_id=$1 AND a.deleted_at IS NULL`, id)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	out := Models{Models: []string{}}
	seen := map[string]bool{}
	for rows.Next() {
		var ids []string
		if err := rows.Scan(&ids); err != nil {
			httpapi.Fail(c, err)
			return
		}
		if len(ids) == 0 {
			out.UnrestrictedAccounts++
		}
		for _, model := range ids {
			model = strings.TrimSpace(model)
			if model != "" && !seen[model] {
				seen[model] = true
				out.Models = append(out.Models, model)
			}
		}
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	sort.Strings(out.Models)
	httpapi.OK(c, out)
}
