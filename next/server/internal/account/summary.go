package account

import (
	"context"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Counts are the live accounts by the console's three statuses: available
// (active and schedulable), auto-disabled (a legacy "error" and an active
// account out of scheduling read so too) and disabled.
type Counts struct {
	Total        int64 `json:"total"`
	Available    int64 `json:"available"`
	AutoDisabled int64 `json:"auto_disabled"`
	Disabled     int64 `json:"disabled"`
}

// CountAccounts counts the live accounts in scope (nil = all, otherwise the
// ones the user created; core.OwnerScope), for GET /accounts/summary and the
// usage overview.
func CountAccounts(ctx context.Context, q store.Querier, scope *int64) (Counts, error) {
	var c Counts
	err := q.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE a.status = 'active' AND a.schedulable),
		count(*) FILTER (WHERE a.status IN ('auto_disabled', 'error') OR (a.status = 'active' AND NOT a.schedulable)),
		count(*) FILTER (WHERE a.status = 'disabled')
		FROM accounts a WHERE a.deleted_at IS NULL AND `+scoped("$1"), scope).
		Scan(&c.Total, &c.Available, &c.AutoDisabled, &c.Disabled)
	return c, err
}

// summary is GET /accounts/summary: the caller's account counts, over every
// account with account:read, its own ones with account:own:read only.
func (s *Service) summary(c *gin.Context) {
	ctx := c.Request.Context()
	counts, err := CountAccounts(ctx, s.d.DB.Pool, core.OwnerScope(ctx, "account:read"))
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, counts)
}
