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

// The success rate's failure side (CONTRACTS §73.1): every finished attempt
// that failed counts once, judged by the upstream's status like dynweight:
// the upstream's 400, client cancellations and local failures (the gateway's
// own rate limiting is one) are left out, a failure without an upstream
// response counts; successes keep coming from usage_finalized.
func TestStatsConsumerCountsFailedAttemptsForSuccessRate(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	s := NewStats(rdb, nil, nil, nil)
	s.now = func() time.Time { return now }
	ctx := context.Background()

	attempt := func(id string, status, upstream int32, errorType string) *pluginv1.RequestObservation {
		return &pluginv1.RequestObservation{Id: id, Phase: observation.AttemptFinished, AccountId: 7, Revision: 1, Success: status == 200,
			StatusCode: status, UpstreamStatusCode: upstream, ErrorType: errorType, LocalFailure: errorType != "" && errorType != "upstream_error"}
	}
	canceled := attempt("canceled", 499, 0, "upstream_error")
	canceled.Canceled = true
	batch := &pluginv1.ObservationBatch{Observations: []*pluginv1.RequestObservation{
		attempt("ok", 200, 200, ""),
		attempt("bad-request", 400, 400, "upstream_error"),
		canceled,
		attempt("gateway-limited", 429, 0, "rate_limited"),
		attempt("local", 502, 200, "gateway_credit_storage"),
		attempt("upstream-429", 429, 429, "upstream_error"),
		attempt("upstream-500", 500, 500, "upstream_error"),
		// No upstream response: the client's status is not judged.
		attempt("transport", 400, 0, "upstream_error"),
		// A mapped client status does not hide the upstream's 400.
		attempt("mapped-400", 502, 400, "upstream_error"),
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
	require.EqualValues(t, 3, *stats.Accounts[0].FailedRequests)
}
