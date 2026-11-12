package account

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
)

// fillActions populates the actions field for each view.
func (s *Service) fillActions(ctx context.Context, rows []*row, out []*View) {
	for i, a := range rows {
		actions := s.listAccountActions(ctx, a.PluginKey, a.Type)
		// Filter by permission.
		filtered := make([]AccountAction, 0, len(actions))
		for _, action := range actions {
			if action.Permission == "" || core.Can(ctx, s.d.Authorizer, perm.Key(action.Permission)) || core.Can(ctx, s.d.Authorizer, "account:own:update") {
				filtered = append(filtered, action)
			}
		}
		if len(filtered) > 0 {
			out[i].Actions = filtered
		}
	}
}
