package ccgateway

import (
	"context"
	"math"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/proto"
)

func TestModelAvailabilityMappedScopeAndSharedOverride(t *testing.T) {
	p, now := quotaTestPlugin()
	for _, shared := range []string{"", "5h", "7d"} {
		for _, tc := range []struct {
			model, client string
			blocked       bool
		}{
			{"claude-fable-5", "alias", true}, {"claude-fable-5-1", "claude-opus-5", true},
			{"claude-sonnet-5", "claude-fable-5", true}, {"claude-opus-5", "claude-fable-5", false},
			{"claude-haiku-4-5-20251001", "alias", false}, {"prefix-claude-fable-5", "", false},
			{"claude-fable", "", false}, {"claude-fableish-5", "", false}, {"Claude-fable-5", "", false},
		} {
			t.Run(shared+"/"+tc.model, func(t *testing.T) {
				windows := []*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}, {Key: "7d", Status: "allowed"}, {Key: "7d_fable", Status: "rejected", ResetsAtUnix: now.Add(time.Hour).Unix()}, {Key: "7d_sonnet", Status: "rejected", ResetsAtUnix: now.Add(time.Hour).Unix()}}
				if shared != "" {
					for _, window := range windows {
						if window.Key == shared {
							window.Status = "rejected"
						}
					}
				}
				out, err := p.CheckModelAvailability(context.Background(), &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: tc.model, ClientModel: tc.client, Quota: &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Revision: 2, Windows: windows}}}})
				require.NoError(t, err)
				require.Len(t, out.Results, 1)
				want := pluginv1.ModelAvailability_AVAILABLE
				if tc.blocked || shared != "" {
					want = pluginv1.ModelAvailability_UNAVAILABLE
				}
				require.Equal(t, want, out.Results[0].State, out.Results[0].Reason)
				if shared != "" {
					require.Equal(t, "quota_rejected:"+shared, out.Results[0].Reason)
				}
			})
		}
	}
}

// What the core stores for the plugin's expired-token usage error.
const expiredTokenError = "transient: token_expired: the access token expired; Claude Code renews it on its next request"

func TestModelAvailabilitySnapshots(t *testing.T) {
	p, now := quotaTestPlugin()
	healthy := func() *pluginv1.AccountQuotaSnapshot {
		return &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: []*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed", Utilization: 0}}}
	}
	for _, tc := range []struct {
		name   string
		mutate func(*pluginv1.AccountQuotaSnapshot)
		want   pluginv1.ModelAvailability_State
	}{
		{"fresh true zero", func(*pluginv1.AccountQuotaSnapshot) {}, pluginv1.ModelAvailability_AVAILABLE},
		{"unknown allowed", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].UtilizationUnknown = true }, pluginv1.ModelAvailability_UNKNOWN},
		{"unknown warning", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].UtilizationUnknown = true
			q.Windows[0].Status = "allowed_warning"
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"unknown rejected", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].UtilizationUnknown = true
			q.Windows[0].Status = "rejected"
		}, pluginv1.ModelAvailability_UNAVAILABLE},
		{"unknown contradicts utilization", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].UtilizationUnknown = true
			q.Windows[0].Utilization = 100
			q.Windows[0].Status = "rejected"
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"unknown contradicts used", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].UtilizationUnknown = true
			q.Windows[0].Used = 1
			q.Windows[0].Status = "rejected"
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"unknown contradicts limit", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].UtilizationUnknown = true
			q.Windows[0].Limit = 1
			q.Windows[0].Status = "rejected"
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"no observation", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix = 0 }, pluginv1.ModelAvailability_UNKNOWN},
		{"future observation", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix++ }, pluginv1.ModelAvailability_UNKNOWN},
		{"empty windows", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows = nil }, pluginv1.ModelAvailability_UNKNOWN},
		{"failed refresh", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = "transient" }, pluginv1.ModelAvailability_UNKNOWN},
		// The container refreshes an expired OAuth token only on a model request.
		{"expired token lets the request refresh it", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = expiredTokenError
			q.UpdatedAtUnix -= 86400
		}, pluginv1.ModelAvailability_AVAILABLE},
		{"expired token before any observation", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = expiredTokenError
			q.UpdatedAtUnix = 0
			q.Windows = nil
		}, pluginv1.ModelAvailability_AVAILABLE},
		{"expired token keeps a known exhaustion", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = expiredTokenError
			q.Windows[0].Status = "rejected"
		}, pluginv1.ModelAvailability_UNAVAILABLE},
		{"expired token keeps an invalid snapshot unknown", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = expiredTokenError
			q.Windows[0].Utilization = math.NaN()
		}, pluginv1.ModelAvailability_UNKNOWN},
		// Signed out or refused for good: held back until authorized again.
		{"signed out", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "auth_rejected: not_logged_in: Claude Code is not signed in"
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"revoked", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = "auth_rejected: token_revoked: refused" }, pluginv1.ModelAvailability_UNKNOWN},
		{"revoked before any observation", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "auth_rejected: token_revoked: refused"
			q.UpdatedAtUnix = 0
			q.Windows = nil
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"core without the reason", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = "auth_rejected: quota query failed" }, pluginv1.ModelAvailability_UNKNOWN},
		{"other transient failure", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = "transient: usage runtime returned 502" }, pluginv1.ModelAvailability_UNKNOWN},
		{"stale", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix -= int64(quotaRefresh.Seconds()) }, pluginv1.ModelAvailability_UNKNOWN},
		{"allowed reset elapsed", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].ResetsAtUnix = now.Unix() }, pluginv1.ModelAvailability_UNKNOWN},
		{"unknown status", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Status = "" }, pluginv1.ModelAvailability_UNKNOWN},
		{"old utilization alone", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Status = ""; q.Windows[0].Utilization = 100 }, pluginv1.ModelAvailability_UNKNOWN},
		{"extra usage allowed", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Utilization = 125 }, pluginv1.ModelAvailability_AVAILABLE},
		{"nan", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Utilization = math.NaN() }, pluginv1.ModelAvailability_UNKNOWN},
		{"negative reset", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].ResetsAtUnix = -1 }, pluginv1.ModelAvailability_UNKNOWN},
		{"duplicate healthy windows", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows = append(q.Windows, &pluginv1.QuotaWindow{Key: "5h", Status: "allowed"})
		}, pluginv1.ModelAvailability_UNKNOWN},
		{"duplicate cannot erase rejection", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows = append([]*pluginv1.QuotaWindow{{Key: "5h", Status: "rejected"}}, q.Windows...)
		}, pluginv1.ModelAvailability_UNAVAILABLE},
		{"expired rejection retained", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].Status = "rejected"
			q.Windows[0].ResetsAtUnix = now.Add(-time.Hour).Unix()
			q.UpdatedAtUnix -= 86400
			q.Error = "refresh failed"
		}, pluginv1.ModelAvailability_UNAVAILABLE},
	} {
		t.Run(tc.name, func(t *testing.T) {
			q := healthy()
			tc.mutate(q)
			in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5", Quota: q}}}
			before := proto.Clone(in)
			out, err := p.CheckModelAvailability(context.Background(), in)
			require.NoError(t, err)
			require.Equal(t, tc.want, out.Results[0].State, out.Results[0].Reason)
			require.Zero(t, out.Results[0].RetryAtUnix)
			require.True(t, proto.Equal(before, in))
		})
	}
}

func TestModelAvailabilityUnknownUtilizationBatch(t *testing.T) {
	p, now := quotaTestPlugin()
	q := &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: []*pluginv1.QuotaWindow{
		{Key: "5h", Status: "allowed"}, {Key: "7d_fable", Status: "allowed", UtilizationUnknown: true},
	}}
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{
		{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5", ClientModel: "alias", Quota: q},
		{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-opus-5", ClientModel: "claude-fable-5", Quota: q},
		{AccountId: 2, AccountType: AccountTypeAPIKey, Model: "claude-fable-5", Quota: q},
	}}
	for _, state := range []string{"allowed", "allowed_warning", "rejected"} {
		q.Windows[1].Status = state
		out, err := p.CheckModelAvailability(context.Background(), in)
		require.NoError(t, err)
		require.Len(t, out.Results, len(in.Candidates))
		want := pluginv1.ModelAvailability_UNKNOWN
		if state == "rejected" {
			want = pluginv1.ModelAvailability_UNAVAILABLE
		}
		require.Equal(t, want, out.Results[0].State)
		require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, out.Results[1].State)
		require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, out.Results[2].State)
		for i, candidate := range in.Candidates {
			require.Equal(t, candidate.AccountId, out.Results[i].AccountId)
			require.Equal(t, candidate.Model, out.Results[i].Model)
		}
	}
}

func TestModelAvailabilityMixedBatchValidation(t *testing.T) {
	p, now := quotaTestPlugin()
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{
		nil,
		{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5"},
		{AccountId: 2, AccountType: AccountTypeAPIKey, Model: "claude-fable-5"},
		{AccountId: 3, AccountType: "other", Model: "claude-fable-5"},
		{AccountId: 4, AccountType: AccountTypeAPIKey, Model: "claude-fable-5"},
		{AccountId: 4, AccountType: AccountTypeAPIKey, Model: "claude-fable-5"},
		{AccountId: 5, AccountType: AccountTypeAPIKey, Model: ""},
		{AccountId: 6, AccountType: AccountTypeAPIKey, Model: "claude-fable-5\n"},
	}}
	out, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.Len(t, out.Results, len(in.Candidates))
	for i, candidate := range in.Candidates {
		require.Equal(t, candidate.GetAccountId(), out.Results[i].AccountId)
		require.Equal(t, candidate.GetModel(), out.Results[i].Model)
		want := pluginv1.ModelAvailability_UNKNOWN
		if i == 2 {
			want = pluginv1.ModelAvailability_AVAILABLE
		}
		require.Equal(t, want, out.Results[i].State)
		require.NotEmpty(t, out.Results[i].Reason)
	}
	require.Equal(t, "duplicate_candidate", out.Results[4].Reason)
	require.Equal(t, "duplicate_candidate", out.Results[5].Reason)
	in.NowUnix = 0
	out, err = p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	for _, result := range out.Results {
		require.Equal(t, pluginv1.ModelAvailability_UNKNOWN, result.State)
	}
	out, err = p.CheckModelAvailability(context.Background(), nil)
	require.NoError(t, err)
	require.Empty(t, out.Results)
}
