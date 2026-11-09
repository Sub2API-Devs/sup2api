package account

import (
	"cmp"
	"context"
	"slices"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// The breakdown by client model of an account's limits cell (CONTRACTS
// §68.7), as new-api's channel RPM / TPM / TPD / SPM popover: requests in
// flight and the last minute's figures from the shared windows and slots,
// today's tokens from the usage records, which also name the models.
const (
	// rateModelsScan is how far back the usage records name the models: a
	// request's tokens settle in the window when it ends, up to this long
	// after it started (usage's realtimeScan).
	rateModelsScan = time.Hour
	// maxRateModels bounds the models one answer lists, the busiest today first.
	maxRateModels = 100
)

// RateFigures are one row of GET /accounts/:id/rate-models.
type RateFigures struct {
	Model    string `json:"model,omitempty"`
	InUse    int    `json:"in_use"`
	RPM      int64  `json:"rpm"`
	TPM      int64  `json:"tpm"`
	TPD      int64  `json:"tpd"` // throughput tokens today
	Sessions int64  `json:"sessions"`
}

// RateModels is GET /accounts/:id/rate-models: the account's own figures,
// then each model's, the busiest first. Sessions and requests in flight of
// the models do not add up to the account's: a session spans models.
type RateModels struct {
	Total  RateFigures   `json:"total"`
	Models []RateFigures `json:"models"`
}

func (s *Service) getRateModels(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	if _, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false); err != nil {
		httpapi.Fail(c, err)
		return
	}
	out, err := s.rateModels(ctx, id, time.Now())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) rateModels(ctx context.Context, id int64, now time.Time) (*RateModels, error) {
	rows, err := modelTokensToday(ctx, s.d.DB.Pool, id, dayStart(now, core.TimeZone(ctx)), now.Add(-rateModelsScan))
	if err != nil {
		return nil, err
	}
	out := &RateModels{Models: rows}
	for _, r := range rows {
		out.Total.TPD += r.TPD
	}
	if err := s.fillModelRates(ctx, id, out); err != nil {
		return nil, err
	}
	slices.SortStableFunc(out.Models, func(a, b RateFigures) int {
		return cmp.Or(cmp.Compare(b.InUse, a.InUse), cmp.Compare(b.RPM, a.RPM), cmp.Compare(b.TPM, a.TPM), cmp.Compare(b.TPD, a.TPD))
	})
	return out, nil
}

// fillModelRates sets the windows' figures and the requests in flight of the
// account and of each listed model. Without Redis they stay 0.
func (s *Service) fillModelRates(ctx context.Context, id int64, out *RateModels) error {
	models := make([]string, len(out.Models))
	figures, kinds := []*RateFigures{&out.Total}, []string{"account"}
	for i := range out.Models {
		models[i] = out.Models[i].Model
		figures, kinds = append(figures, &out.Models[i]), append(kinds, core.ModelSlots(models[i]))
	}
	if s.d.Limiter != nil {
		used, err := s.d.Limiter.ModelUsage(ctx, id, models)
		if err != nil {
			return core.ErrUnavailable.WithCause(err)
		}
		for i, u := range used {
			figures[i].RPM, figures[i].TPM, figures[i].Sessions = u.RPM, u.TPM, u.Sessions
		}
	}
	if s.d.Slots == nil {
		return nil
	}
	errs := make([]error, len(kinds))
	tasks := make([]func(), len(kinds))
	for i, kind := range kinds {
		tasks[i] = func() { figures[i].InUse, errs[i] = s.d.Slots.InUse(ctx, kind, id) }
	}
	runParallel(ctx, modelInUseParallel, tasks...)
	if err := cmp.Or(errs...); err != nil {
		return core.ErrUnavailable.WithCause(err)
	}
	return nil
}

// modelTokensToday names the models the account served since the earlier of
// midnight and since, with their throughput tokens since midnight.
func modelTokensToday(ctx context.Context, q store.Querier, id int64, midnight, since time.Time) ([]RateFigures, error) {
	rows, err := q.Query(ctx, `SELECT u.model, COALESCE(sum(`+core.ThroughputSQL+`) FILTER (WHERE u.created_at >= $2), 0) AS tpd
		FROM usage_logs u
		WHERE u.account_id = $1 AND u.created_at >= LEAST($2, $3) AND u.model <> ''
		GROUP BY u.model ORDER BY tpd DESC, u.model LIMIT $4`, id, midnight, since, maxRateModels)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RateFigures{}
	for rows.Next() {
		var r RateFigures
		if err := rows.Scan(&r.Model, &r.TPD); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}
