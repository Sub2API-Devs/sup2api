package account

import "context"

// fillActions populates the actions field for each view.
func (s *Service) fillActions(ctx context.Context, rows []*row, out []*View) {
	for i, a := range rows {
		if actions := s.visibleActions(ctx, a); len(actions) > 0 {
			out[i].Actions = actions
		}
	}
}
