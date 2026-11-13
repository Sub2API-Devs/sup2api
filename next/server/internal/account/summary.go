package account

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Counts are the live accounts by the console's three statuses: available
// (active and schedulable), auto-disabled (including a legacy "error" and an
// active account out of scheduling) and disabled. Accounts of a disabled or
// uninstalled plugin count, as in the usage overview.
type Counts struct {
	Total        int64 `json:"total"`
	Available    int64 `json:"available"`
	AutoDisabled int64 `json:"auto_disabled"`
	Disabled     int64 `json:"disabled"`
}

// CountAccounts counts the live accounts in scope (core.AllScope for the
// usage overview), for GET /accounts/summary.
func CountAccounts(ctx context.Context, q store.Querier, scope core.DataScope) (Counts, error) {
	var c Counts
	err := q.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE a.status = 'active' AND a.schedulable),
		count(*) FILTER (WHERE a.status IN ('auto_disabled', 'error') OR (a.status = 'active' AND NOT a.schedulable)),
		count(*) FILTER (WHERE a.status = 'disabled')
		FROM accounts a WHERE a.deleted_at IS NULL AND `+core.AccountRows.SQL(1), core.AccountRows.Args(scope)...).
		Scan(&c.Total, &c.Available, &c.AutoDisabled, &c.Disabled)
	return c, err
}

// summary is GET /accounts/summary: the caller's account counts, over the
// accounts its account:read scope reaches.
func (s *Service) summary(c *gin.Context) {
	ctx := c.Request.Context()
	counts, err := CountAccounts(ctx, s.d.DB.Pool, s.scopeOf(ctx, perm.AccountRead))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, counts)
}
