package account

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type StatsConsumer struct{}

func (StatsConsumer) OnObservations(_ context.Context, in *pluginv1.ObservationBatch) (*pluginv1.ObservationResult, error) {
	out := &pluginv1.ObservationResult{}
	for _, event := range in.GetObservations() {
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
