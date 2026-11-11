package account

import (
	"cmp"
	"context"
	"slices"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// RateModels is GET /accounts/:id/rate-models (CONTRACTS §68.7), the
// breakdown by client model of an account's limits cell, as new-api's channel
// RPM / TPM / TPD / SPM popover: the account's own figures, then each model's,
// the busiest first, all read from Redis. Sessions and requests in flight of
// the models need not add up to the account's: a session spans models.
type RateModels struct {
	Total  core.ModelRates   `json:"total"`
	Models []core.ModelRates `json:"models"`
}

func (s *Service) getRateModels(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	a, err := s.loadRow(ctx, s.d.DB.Pool, id, core.OwnerScope(ctx, "account:read"), false)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out, err := s.rateModels(ctx, core.AccountRef{ID: id, SPMWindowSeconds: a.SPMWindowSeconds}, time.Now())
	if err != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithCause(err))
		return
	}
	httpapi.OK(c, out)
}

func (s *Service) rateModels(ctx context.Context, ref core.AccountRef, now time.Time) (*RateModels, error) {
	rows := []core.ModelRates{{}}
	if s.d.Limiter != nil {
		var err error
		if rows, err = s.d.Limiter.ModelRates(ctx, ref, dayStart(now, core.TimeZone(ctx))); err != nil {
			return nil, err
		}
	}
	if err := s.fillModelInFlight(ctx, ref.ID, rows); err != nil {
		return nil, err
	}
	models := rows[1:]
	slices.SortStableFunc(models, func(a, b core.ModelRates) int {
		return cmp.Or(cmp.Compare(b.InUse, a.InUse), cmp.Compare(b.RPM, a.RPM), cmp.Compare(b.TPM, a.TPM), cmp.Compare(b.TPD, a.TPD))
	})
	return &RateModels{Total: rows[0], Models: models}, nil
}

// fillModelInFlight sets InUse of rows: the account's slots for the first
// (Model ""), each model's own for the others. Without Slots they stay 0.
func (s *Service) fillModelInFlight(ctx context.Context, id int64, rows []core.ModelRates) error {
	if s.d.Slots == nil {
		return nil
	}
	errs := make([]error, len(rows))
	tasks := make([]func(), len(rows))
	for i := range rows {
		kind := core.ModelSlots(rows[i].Model)
		if rows[i].Model == "" {
			kind = "account"
		}
		tasks[i] = func() { rows[i].InUse, errs[i] = s.d.Slots.InUse(ctx, kind, id) }
	}
	runParallel(ctx, modelInUseParallel, tasks...)
	return cmp.Or(errs...)
}
