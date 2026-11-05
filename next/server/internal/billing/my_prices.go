package billing

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// myPrices answers GET /me/prices?group_id= (CONTRACTS §79.4): the models one
// of the caller's groups may use, with their prices, the same data an API key
// of that group reads from GET /key/prices. Without group_id it is the first
// group the caller can see. A group the caller cannot see is a 404.
func (s *Service) myPrices(c *gin.Context) {
	ctx := c.Request.Context()
	uid, _ := core.UserID(ctx)
	var groupID int64
	if raw := c.Query("group_id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || id <= 0 {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid group_id"))
			return
		}
		groupID = id
	}
	var out KeyPrices
	var group core.GroupInfo
	err := s.db.Pool.QueryRow(ctx, `SELECT g.id, g.name, g.rate_multiplier, g.model_allowlist, g.model_filter_mode FROM groups g
		WHERE g.status = 'active' AND ($2::bigint = 0 OR g.id = $2)
		  AND (g.visibility = 'public' OR EXISTS (SELECT 1 FROM user_groups ug WHERE ug.group_id = g.id AND ug.user_id = $1))
		ORDER BY g.id LIMIT 1`, uid, groupID).Scan(&out.Group.ID, &out.Group.Name, &out.RateMultiplier, &group.ModelAllowlist, &group.ModelFilterMode)
	if store.IsNoRows(err) {
		if groupID != 0 {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
		httpapi.OK(c, KeyPrices{Prices: []syncPrice{}, RateMultiplier: decimal.NewFromInt(1)})
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out.Prices = []syncPrice{}
	rows, err := s.db.Pool.Query(ctx, `SELECT model, mode, config, expression FROM model_prices WHERE enabled ORDER BY model`)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var p syncPrice
		if err := rows.Scan(&p.Model, &p.Mode, &p.Config, &p.Expression); err != nil {
			httpapi.Fail(c, err)
			return
		}
		if group.AllowsModel(p.Model) {
			out.Prices = append(out.Prices, p)
		}
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}
