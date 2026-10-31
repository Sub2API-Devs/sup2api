package account

import (
	"context"
	"net/http"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type StatsConsumer struct{}

func (StatsConsumer) OnObservations(_ context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	out := &pluginv1.ObservationResult{}
	for _, event := range in.GetObservations() {
		if event.GetPhase() == observation.AttemptFinished {
			// A failure of the success rate (CONTRACTS §73.1) is what
			// dynweight counts too (observation.AccountFailure), with the
			// upstream's 400 exempt: the request itself is wrong. Only the
			// upstream's own status is judged, so a failure without an
			// upstream response counts whatever status the client got.
			// Cancellations and local failures (the gateway's own rate
			// limiting among them) never count.
			if observation.AccountFailure(event, http.StatusBadRequest) {
				out.Contributions = append(out.Contributions, &pluginv1.ObservationContribution{ObservationId: event.Id, Metrics: map[string]int64{observation.FailedRequests: 1}})
			}
			continue
		}
		if event.GetPhase() != observation.UsageFinalized || (!event.Success && event.Revision <= 1) {
			continue
		}
		metrics := map[string]int64{}
		if event.Success && !event.Canceled {
			metrics[observation.SuccessRequests] = 1
			metrics[observation.SuccessTokens] = 0
			metrics[observation.PendingUsage] = 0
			if event.UsagePending || event.TotalTokens < 0 || event.TotalTokens > observation.MaxValue {
				metrics[observation.PendingUsage] = 1
			} else {
				metrics[observation.SuccessTokens] = event.TotalTokens
			}
		}
		out.Contributions = append(out.Contributions, &pluginv1.ObservationContribution{ObservationId: event.Id, Metrics: metrics})
	}
	return out, nil
}

// outcomesWindowSeconds is the window of the success-rate column: one minute,
// rolling, whatever window the account statistics settings choose.
const outcomesWindowSeconds = 60

// Outcomes is the success-rate figure of one account (CONTRACTS §73).
type Outcomes struct {
	Success int64 `json:"success"`
	Failed  int64 `json:"failed"`
}

// fillOutcomes sets View.Outcomes from the observation statistics, leaving it
// null when they cannot be read (no Redis, or a read error).
func (s *Service) fillOutcomes(ctx context.Context, out []*View) {
	if s.d.Stats == nil || len(out) == 0 {
		return
	}
	byID := make(map[int64]*View, len(out))
	ids := make([]int64, 0, len(out))
	for _, v := range out {
		byID[v.ID] = v
		ids = append(ids, v.ID)
	}
	for start := 0; start < len(ids); start += statsMaxAccounts {
		chunk := ids[start:min(start+statsMaxAccounts, len(ids))]
		snap, err := s.d.Stats.AccountStats(ctx, chunk, outcomesWindowSeconds)
		if err != nil || snap.Status == "unavailable" {
			continue
		}
		for _, row := range snap.Accounts {
			v := byID[row.AccountID]
			if v == nil || row.SuccessRequests == nil || row.FailedRequests == nil {
				continue
			}
			v.Outcomes = &Outcomes{Success: *row.SuccessRequests, Failed: *row.FailedRequests}
		}
	}
}

func (s *Service) ReadPluginObservationMetrics(ctx context.Context, key string, all bool, in *pluginv1.ReadObservationMetricsRequest) (*pluginv1.ReadObservationMetricsResponse, error) {
	if s.d.DB == nil || s.d.Stats == nil {
		return nil, core.ErrUnavailable
	}
	if in == nil || len(in.AccountIds) > statsMaxAccounts {
		return nil, core.ErrInvalidArgument
	}
	for _, id := range in.AccountIds {
		if id <= 0 {
			return nil, core.ErrInvalidArgument
		}
	}
	namespace := observation.PluginNamespace(key)
	if in.Namespace == "core" {
		namespace = observation.CoreNamespace
	} else if in.Namespace != "plugin" {
		return nil, core.ErrInvalidArgument
	}
	rows, err := s.d.DB.Pool.Query(ctx, `SELECT a.id FROM accounts a WHERE a.id=ANY($1) AND a.deleted_at IS NULL AND ($2::boolean OR a.plugin_key=$3) ORDER BY a.id`, in.AccountIds, all, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := make([]int64, 0, len(in.AccountIds))
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	rows.Close()
	return s.d.Stats.ReadObservationMetrics(ctx, namespace, ids, in.Metrics, int(in.WindowSeconds))
}
