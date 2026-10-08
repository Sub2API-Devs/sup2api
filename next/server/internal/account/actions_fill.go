package account

import (
	"context"
)

// fillActions populates the actions field for each view.
func (s *Service) fillActions(ctx context.Context, rows []*row, out []*View) {
	for i, a := range rows {
		actions := s.listAccountActions(ctx, a.PluginKey, a.Type)
		// Filter by permission.
		filtered := make([]AccountAction, 0, len(actions))
		for _, action := range actions {
			if action.Permission == "" || s.can(ctx, action.Permission) || s.can(ctx, "account:own:update") {
				filtered = append(filtered, action)
			}
		}
		if len(filtered) > 0 {
			out[i].Actions = filtered
		}
	}
}
