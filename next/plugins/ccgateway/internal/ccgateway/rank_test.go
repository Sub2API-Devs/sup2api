package ccgateway

import (
	"context"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
)

func TestRankAccountsLoad(t *testing.T) {
	now := time.Unix(1_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	future, past := now.Add(time.Hour).Unix(), now.Add(-time.Hour).Unix()
	window := func(key string, used float64, reset int64) *pluginv1.QuotaWindow {
		return &pluginv1.QuotaWindow{Key: key, Utilization: used, ResetsAtUnix: reset}
	}
	both := []*pluginv1.QuotaWindow{window("5h", 90, future), window("7d", 40, future), window("7d_fable", 70, future)}
	for _, tc := range []struct {
		name    string
		model   string
		windows []*pluginv1.QuotaWindow
		load    int32
	}{
		{"other models use 7d", "claude-opus-5-5", both, 40},
		{"Fable uses 7d Fable", "claude-fable-5", both, 70},
		{"Fable without its window uses 7d", "claude-fable-5", []*pluginv1.QuotaWindow{window("7d", 40, future)}, 40},
		{"Fable past its reset uses 7d", "claude-fable-5", []*pluginv1.QuotaWindow{window("7d", 40, future), window("7d_fable", 70, past)}, 40},
		{"7d past its reset is no load", "claude-opus-5-5", []*pluginv1.QuotaWindow{window("7d", 40, past)}, 0},
		{"no window is no load", "claude-opus-5-5", []*pluginv1.QuotaWindow{window("5h", 90, future)}, 0},
		{"overage stays within 100", "claude-opus-5-5", []*pluginv1.QuotaWindow{window("7d", 130, future)}, 100},
		{"no reset is still known", "claude-opus-5-5", []*pluginv1.QuotaWindow{window("7d", 12.6, 0)}, 13},
	} {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := p.RankAccounts(context.Background(), &pluginv1.RankAccountsRequest{
				Meta: &pluginv1.RequestMeta{Model: tc.model},
				Candidates: []*pluginv1.RankCandidate{{AccountId: 7, TypePluginKey: pluginKey, Priority: 3, Weight: 5,
					Quota: &pluginv1.AccountQuotaSnapshot{Windows: tc.windows}}},
			})
			require.NoError(t, err)
			if tc.load == 0 {
				require.Empty(t, resp.GetAccounts())
				return
			}
			require.Len(t, resp.GetAccounts(), 1)
			got := resp.GetAccounts()[0]
			require.Equal(t, tc.load, got.GetLoad())
			require.Equal(t, int32(3), got.GetPriority(), "priority and weight are echoed back")
			require.Equal(t, int32(5), got.GetWeight())
		})
	}

	// Other plugins' accounts and accounts already out of the request are left alone.
	full := &pluginv1.AccountQuotaSnapshot{Windows: []*pluginv1.QuotaWindow{window("7d", 90, future)}}
	resp, err := p.RankAccounts(context.Background(), &pluginv1.RankAccountsRequest{
		Meta: &pluginv1.RequestMeta{Model: "claude-opus-5-5"},
		Candidates: []*pluginv1.RankCandidate{
			{AccountId: 1, TypePluginKey: "anthropic", Weight: 1, Quota: full},
			{AccountId: 2, TypePluginKey: pluginKey, Weight: 0, Quota: full},
		},
	})
	require.NoError(t, err)
	require.Empty(t, resp.GetAccounts())
}
