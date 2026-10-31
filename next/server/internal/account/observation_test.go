package account

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestObservationWindowRevisionsAndNamespaceIsolation(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	s := NewStats(rdb, nil, nil, nil)
	s.now = func() time.Time { return now }
	ctx := context.Background()
	v := core.ObservationMetricSample{Namespace: "plugin.probe", ID: "request", AccountID: 7, At: now, Revision: 1, Metrics: map[string]int64{"x": 50, "y": 5}}
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v}))
	v.Revision, v.Metrics = 3, map[string]int64{"x": 30}
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v, v}))
	v.Revision, v.Metrics = 2, map[string]int64{"x": 900, "y": 900}
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v}))
	out, err := s.ReadObservationMetrics(ctx, "plugin.probe", []int64{7}, []string{"x", "y"}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 30, out.Accounts[0].Metrics[0].Sum)
	require.EqualValues(t, 1, out.Accounts[0].Metrics[0].Count)
	require.Zero(t, out.Accounts[0].Metrics[1].Sum)
	require.Zero(t, out.Accounts[0].Metrics[1].Count)
	coreOut, err := s.AccountStats(ctx, []int64{7}, 60)
	require.NoError(t, err)
	require.Zero(t, *coreOut.Accounts[0].SuccessRequests)
	now = now.Add(61 * time.Second)
	mr.SetTime(now)
	v.At, v.Revision, v.Metrics = now, 4, map[string]int64{"x": 100}
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v}))
	out, err = s.ReadObservationMetrics(ctx, "plugin.probe", []int64{7}, []string{"x"}, 60)
	require.NoError(t, err)
	require.Zero(t, out.Accounts[0].Metrics[0].Sum)
}

func TestObservationAggregateOverflowCannotPoisonOtherConsumers(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	s := NewStats(rdb, nil, nil, nil)
	ctx := context.Background()
	v := core.ObservationMetricSample{Namespace: "plugin.probe", ID: "large", AccountID: 7, At: time.Now(), Revision: 1, Metrics: map[string]int64{"x": observation.MaxValue}}
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v}))
	v.ID = "overflow"
	builtin := (accountStatsSample{RequestID: "success", AccountID: 7, CompletedAt: time.Now(), Success: true, Tokens: 20}).sample()
	require.NoError(t, s.flush(ctx, []core.ObservationMetricSample{v, builtin}))
	out, err := s.ReadObservationMetrics(ctx, "plugin.probe", []int64{7}, []string{"x"}, 60)
	require.NoError(t, err)
	require.Equal(t, "incomplete", out.Status)
	require.EqualValues(t, observation.MaxValue, out.Accounts[0].Metrics[0].Sum)
	require.EqualValues(t, 1, out.Accounts[0].Metrics[0].Count)
	coreOut, err := s.AccountStats(ctx, []int64{7}, 60)
	require.NoError(t, err)
	require.NotEqual(t, "incomplete", coreOut.Status)
	require.EqualValues(t, 1, *coreOut.Accounts[0].SuccessRequests)
	require.EqualValues(t, 20, *coreOut.Accounts[0].SuccessTokens)
}

// The success rate's failure side (CONTRACTS §73): every finished attempt that
// failed counts once, except 400s, client cancellations and the gateway's own
// rate limiting; successes keep coming from usage_finalized.
func TestStatsConsumerCountsFailedAttemptsForSuccessRate(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	s := NewStats(rdb, nil, nil, nil)
	s.now = func() time.Time { return now }
	ctx := context.Background()

	attempt := func(id string, success, canceled bool, status int32, errorType string) *pluginv1.RequestObservation {
		return &pluginv1.RequestObservation{Id: id, Phase: observation.AttemptFinished, AccountId: 7, Revision: 1, Success: success, Canceled: canceled, StatusCode: status, ErrorType: errorType}
	}
	batch := &pluginv1.ObservationBatch{Observations: []*pluginv1.RequestObservation{
		attempt("ok", true, false, 200, ""),
		attempt("bad-request", false, false, 400, "invalid_request"),
		attempt("canceled", false, true, 499, "client_canceled"),
		attempt("gateway-limited", false, false, 429, "rate_limited"),
		attempt("upstream-429", false, false, 429, "upstream_error"),
		attempt("upstream-500", false, false, 500, "upstream_error"),
		// A local failure is not the account's fault; a mapped client status
		// does not hide the upstream's 400.
		{Id: "local", Phase: observation.AttemptFinished, AccountId: 7, Revision: 1, StatusCode: 502, ErrorType: "gateway_credit_storage", LocalFailure: true},
		{Id: "mapped-400", Phase: observation.AttemptFinished, AccountId: 7, Revision: 1, StatusCode: 502, UpstreamStatusCode: 400, ErrorType: "upstream_error"},
		{Id: "req:usage_finalized", Phase: observation.UsageFinalized, AccountId: 7, Revision: 1, Success: true, TotalTokens: 10},
	}}
	out, err := StatsConsumer{}.OnObservations(ctx, batch)
	require.NoError(t, err)
	samples := make([]core.ObservationMetricSample, 0, len(out.Contributions))
	for _, c := range out.Contributions {
		samples = append(samples, core.ObservationMetricSample{Namespace: observation.CoreNamespace, ID: c.ObservationId, AccountID: 7, At: now, Revision: 1, Metrics: c.Metrics})
	}
	require.NoError(t, s.flush(ctx, samples))

	stats, err := s.AccountStats(ctx, []int64{7}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 1, *stats.Accounts[0].SuccessRequests)
	require.EqualValues(t, 2, *stats.Accounts[0].FailedRequests)
}
