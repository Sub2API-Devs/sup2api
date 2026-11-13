package account

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// fillActions populates the actions field for each view; out already has
// its groups, which the caller's update scope may depend on.
func (s *Service) fillActions(ctx context.Context, rows []*row, out []*View) {
	update := s.scopeOf(ctx, perm.AccountUpdate)
	for i, a := range rows {
		if actions := s.visibleActions(ctx, a, update.AllowsRow(a.ID, a.CreatedBy, out[i].GroupIDs)); len(actions) > 0 {
			out[i].Actions = actions
		}
	}
}
