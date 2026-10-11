package account

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type accountStatsSample struct {
	RequestID    string
	AccountID    int64
	CompletedAt  time.Time
	Revision     uint64
	Success      bool
	Tokens       int64
	UsagePending bool
}

func (v accountStatsSample) sample() core.ObservationMetricSample {
	metrics := map[string]int64{}
	if v.Success {
		metrics[observation.SuccessRequests] = 1
		metrics[observation.SuccessTokens] = v.Tokens
		metrics[observation.PendingUsage] = 0
		if v.UsagePending {
			metrics[observation.SuccessTokens] = 0
			metrics[observation.PendingUsage] = 1
		}
	}
	return core.ObservationMetricSample{Namespace: observation.CoreNamespace, ID: v.RequestID, AccountID: v.AccountID, At: v.CompletedAt, Revision: v.Revision, Metrics: metrics}
}

func (s *Stats) flushSamples(ctx context.Context, values []accountStatsSample) error {
	samples := make([]core.ObservationMetricSample, 0, len(values))
	for _, value := range values {
		samples = append(samples, value.sample())
	}
	return s.flush(ctx, samples)
}

func (s *Stats) observeSample(value accountStatsSample) { s.RecordObservationMetrics(value.sample()) }

func TestAccountStatsSuccessWindowAndCorrections(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	a, b := NewStats(rdb, nil, nil, nil), NewStats(rdb, nil, nil, nil)
	a.now, b.now = func() time.Time { return now }, func() time.Time { return now }
	ctx := context.Background()
	sample := accountStatsSample{RequestID: "success", AccountID: 7, CompletedAt: now.Add(-10 * time.Second), Revision: 1, Success: true, Tokens: 120}
	require.NoError(t, a.flushSamples(ctx, []accountStatsSample{
		sample,
		{RequestID: "failed", AccountID: 7, CompletedAt: now, Revision: 1, Success: false, Tokens: 999},
		{RequestID: "old", AccountID: 7, CompletedAt: now.Add(-60 * time.Second), Revision: 1, Success: true, Tokens: 1000},
		{RequestID: "pending", AccountID: 8, CompletedAt: now, Revision: 1, Success: true, Tokens: 888, UsagePending: true},
	}))
	get := func(s *Stats, seconds int, requests, tokens int64) {
		t.Helper()
		out, err := s.AccountStats(ctx, []int64{7}, seconds)
		require.NoError(t, err)
		require.Len(t, out.Accounts, 1)
		v := out.Accounts[0]
		require.NotNil(t, v.SuccessRequests)
		require.Equal(t, requests, *v.SuccessRequests)
		require.Equal(t, tokens, *v.SuccessTokens)
		require.Equal(t, float64(requests)*60/float64(seconds), *v.RPM)
		require.Equal(t, float64(tokens)*60/float64(seconds), *v.TPM)
	}
	get(b, 60, 1, 120)
	get(b, 120, 2, 1120)
	require.NoError(t, b.flushSamples(ctx, []accountStatsSample{sample, sample}))
	get(a, 60, 1, 120)
	sample.Revision, sample.Tokens = 3, 80
	require.NoError(t, b.flushSamples(ctx, []accountStatsSample{sample}))
	sample.Revision, sample.Tokens = 2, 500
	require.NoError(t, a.flushSamples(ctx, []accountStatsSample{sample}))
	get(a, 60, 1, 80)
	sample.Revision, sample.Success = 4, false
	require.NoError(t, a.flushSamples(ctx, []accountStatsSample{sample}))
	get(b, 60, 0, 0)
	out, err := a.AccountStats(ctx, []int64{8}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 1, *out.Accounts[0].SuccessRequests)
	require.Zero(t, *out.Accounts[0].SuccessTokens)
	require.EqualValues(t, 1, *out.Accounts[0].PendingUsage)
	require.NoError(t, b.flushSamples(ctx, []accountStatsSample{{RequestID: "pending", AccountID: 8, CompletedAt: now.Add(20 * time.Second), Revision: 2, Success: true, Tokens: 35}}))
	out, err = a.AccountStats(ctx, []int64{8}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 1, *out.Accounts[0].SuccessRequests)
	require.EqualValues(t, 35, *out.Accounts[0].SuccessTokens)
	require.Zero(t, *out.Accounts[0].PendingUsage)
	now = now.Add(61 * time.Second)
	mr.SetTime(now)
	get(a, 60, 0, 0)
}

type statsTestNode string

func (n statsTestNode) NodeID() string { return string(n) }
func (n statsTestNode) BootID() string { return string(n) }

func TestAccountStatsSharedConcurrencyAndCanceledRelease(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	a := cluster.NewSlots(rdb, statsTestNode("a"), cluster.SlotOptions{})
	b := cluster.NewSlots(rdb, statsTestNode("b"), cluster.SlotOptions{})
	s := NewStats(rdb, nil, b, nil)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	releaseA, ok, err := a.Acquire(ctx, "account", 1, 0, "request")
	require.NoError(t, err)
	require.True(t, ok)
	defer releaseA()
	releaseB, ok, err := b.Acquire(context.Background(), "account", 1, 0, "request")
	require.NoError(t, err)
	require.True(t, ok)
	defer releaseB()
	check := func(want int) {
		t.Helper()
		out, err := s.AccountStats(context.Background(), []int64{1}, 60)
		require.NoError(t, err)
		require.Equal(t, want, *out.Accounts[0].InUse)
		require.Zero(t, *out.Accounts[0].SuccessRequests)
	}
	check(2)
	cancel()
	releaseA()
	releaseA()
	check(1)
	releaseB()
	check(0)
}

func TestAccountStatsWarmWindowAndSharedClock(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	s := NewStats(rdb, nil, nil, nil)
	s.now = func() time.Time { return now.Add(24 * time.Hour) }
	ctx := context.Background()
	require.NoError(t, s.flushSamples(ctx, nil))
	out, err := s.AccountStats(ctx, []int64{1}, 60)
	require.NoError(t, err)
	require.Equal(t, "warming", out.Status)
	require.Equal(t, now, *out.ObservedSince)
	now = now.Add(time.Minute)
	mr.SetTime(now)
	require.NoError(t, s.flushSamples(ctx, []accountStatsSample{{AccountID: 1, RequestID: "skew", Success: true, Tokens: 10, CompletedAt: s.now().Add(-10 * time.Second)}}))
	out, err = s.AccountStats(ctx, []int64{1}, 60)
	require.NoError(t, err)
	require.Equal(t, "ok", out.Status)
	require.EqualValues(t, 1, *out.Accounts[0].RPM)
	require.EqualValues(t, 10, *out.Accounts[0].TPM)
	out, err = s.AccountStats(ctx, []int64{1}, 300)
	require.NoError(t, err)
	require.Equal(t, "warming", out.Status)
	require.InDelta(t, 0.2, *out.Accounts[0].RPM, 1e-9)
}

func TestAccountStatsLateCorrectionsAndQueueOverflow(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	now := time.Date(2026, 10, 1, 12, 0, 30, 0, time.UTC)
	mr.SetTime(now)
	s := NewStats(rdb, nil, nil, nil)
	s.now = func() time.Time { return now }
	ctx := context.Background()
	v := accountStatsSample{RequestID: "retracted", AccountID: 1, CompletedAt: now, Revision: 2}
	require.NoError(t, s.flushSamples(ctx, []accountStatsSample{v}))
	v.Revision, v.Success, v.Tokens = 1, true, 30
	require.NoError(t, s.flushSamples(ctx, []accountStatsSample{v}))
	out, err := s.AccountStats(ctx, []int64{1}, 60)
	require.NoError(t, err)
	require.Zero(t, *out.Accounts[0].SuccessRequests)
	v.RequestID = "expired"
	v.CompletedAt = now.Add(-3601 * time.Second)
	require.NoError(t, s.flushSamples(ctx, []accountStatsSample{v}))
	out, err = s.AccountStats(ctx, []int64{1}, 3600)
	require.NoError(t, err)
	require.Zero(t, *out.Accounts[0].SuccessTokens)
	for i := range cap(s.queue) + 1 {
		s.observeSample(accountStatsSample{RequestID: fmt.Sprint(i), AccountID: 1, Success: true, CompletedAt: now})
	}
	require.True(t, s.gap.Load())
	require.NoError(t, s.flushSamples(ctx, nil))
	out, err = s.AccountStats(ctx, []int64{1}, 60)
	require.NoError(t, err)
	require.Equal(t, "incomplete", out.Status)
}

func TestAccountStatsRoutesAndSettings(t *testing.T) {
	authz := fakeAuthz{keys: map[int64][]string{}}
	e := setupWith(t, authz)
	admin, owner, other := e.uid, e.addUser("stats-owner@x.com"), e.addUser("stats-other@x.com")
	authz.keys[admin] = append(append([]string{}, adminKeys...), "settings:read", "settings:manage")
	authz.keys[owner], authz.keys[other] = supplierKeys, supplierKeys
	a := e.createAs(owner, "owner stats", nil)
	b := e.createAs(other, "other stats", nil)
	id1, id2 := int64(a["id"].(float64)), int64(b["id"].(float64))
	e.svc.d.Stats = NewStats(e.svc.d.Redis, e.db, e.svc.d.Slots, e.bus)
	code, out := e.do("PUT", "/settings/account-stats", map[string]any{"window_seconds": 90})
	require.Equal(t, 200, code, out)
	require.EqualValues(t, 90, data(out)["window_seconds"])
	for _, value := range []int{4, 3601} {
		code, _ = e.do("PUT", "/settings/account-stats", map[string]any{"window_seconds": value})
		require.Equal(t, 400, code)
	}
	code, _ = e.doAs(owner, "PUT", "/settings/account-stats", map[string]any{"window_seconds": 60})
	require.Equal(t, 403, code)
	require.NoError(t, e.svc.d.Stats.flushSamples(context.Background(), []accountStatsSample{{RequestID: "own", AccountID: id1, CompletedAt: time.Now(), Revision: 1, Success: true, Tokens: 90}}))
	code, out = e.doAs(owner, "GET", fmt.Sprintf("/accounts/stats?ids=%d,%d,%d", id1, id2, id1), nil)
	require.Equal(t, 200, code, out)
	items := data(out)["accounts"].([]any)
	require.Len(t, items, 1)
	require.EqualValues(t, id1, items[0].(map[string]any)["account_id"])
	require.EqualValues(t, 60, items[0].(map[string]any)["tpm"])
	code, _ = e.doAs(owner, "GET", fmt.Sprintf("/accounts/%d/stats", id2), nil)
	require.Equal(t, 404, code)
	code, out = e.do("GET", fmt.Sprintf("/accounts/%d/stats?window_seconds=60", id1), nil)
	require.Equal(t, 200, code, out)
	require.EqualValues(t, 60, data(out)["window_seconds"])
	ctx := context.Background()
	var pluginKey string
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT plugin_key FROM accounts WHERE id=$1`, id1).Scan(&pluginKey))
	query := &pluginv1.ReadObservationMetricsRequest{Namespace: "core", AccountIds: []int64{id1, id2}, Metrics: []string{observation.SuccessRequests, observation.SuccessTokens}, WindowSeconds: 60}
	own, err := e.svc.ReadPluginObservationMetrics(ctx, pluginKey, false, query)
	require.NoError(t, err)
	require.Len(t, own.Accounts, 2)
	require.EqualValues(t, 90, own.Accounts[0].Metrics[1].Sum)
	denied, err := e.svc.ReadPluginObservationMetrics(ctx, "unrelated", false, query)
	require.NoError(t, err)
	require.Empty(t, denied.Accounts)
	all, err := e.svc.ReadPluginObservationMetrics(ctx, "unrelated", true, query)
	require.NoError(t, err)
	require.Len(t, all.Accounts, 2)
	for _, path := range []string{"/accounts/stats?ids=0", "/accounts/stats?ids=1&window_seconds=4", "/accounts/stats?ids=" + strings.Repeat("1,", 200) + "1"} {
		code, _ = e.do("GET", path, nil)
		require.Equal(t, 400, code, path)
	}
}

func TestAccountStatsAsyncAndUnavailable(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr(), MaxRetries: -1})
	t.Cleanup(func() { _ = rdb.Close() })
	s := NewStats(rdb, nil, nil, nil)
	s.Start()
	for i := range 10 {
		s.observeSample(accountStatsSample{RequestID: string(rune('a' + i)), AccountID: 4, CompletedAt: time.Now(), Revision: 1, Success: true, Tokens: 2})
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	s.Close(ctx)
	out, err := s.AccountStats(ctx, []int64{4}, 60)
	require.NoError(t, err)
	require.EqualValues(t, 10, *out.Accounts[0].SuccessRequests)
	require.EqualValues(t, 20, *out.Accounts[0].SuccessTokens)
	s.observeSample(accountStatsSample{RequestID: "after-close", AccountID: 4, Success: true})
	mr.SetError("ERR unavailable")
	out, err = s.AccountStats(ctx, []int64{4}, 60)
	require.NoError(t, err)
	require.Equal(t, "unavailable", out.Status)
	require.Nil(t, out.Accounts[0].RPM)
	require.Nil(t, out.Accounts[0].TPM)
	require.Nil(t, out.Accounts[0].InUse)
	_, err = s.AccountStats(ctx, []int64{4}, 4)
	require.Error(t, err)
	_, err = s.AccountStats(ctx, []int64{4}, 3601)
	require.Error(t, err)
}
