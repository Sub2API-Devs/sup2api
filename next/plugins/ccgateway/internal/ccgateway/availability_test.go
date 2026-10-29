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

func checkManaged(t *testing.T, p *Plugin, now time.Time, model string, q *pluginv1.AccountQuotaSnapshot) *pluginv1.ModelAvailability {
	t.Helper()
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: model, Quota: q}}}
	before := proto.Clone(in)
	out, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.Len(t, out.Results, 1)
	require.True(t, proto.Equal(before, in))
	return out.Results[0]
}

// Only a model family's own exhausted window holds that family back, and only
// until its reset; shared windows never do (CONTRACTS §44.7).
func TestModelAvailabilityScopedWindows(t *testing.T) {
	p, now := quotaTestPlugin()
	reset := now.Add(time.Hour).Unix()
	for _, shared := range []string{"", "5h", "7d"} {
		for _, tc := range []struct {
			model   string
			blocked string
		}{
			{"claude-fable-5", "7d_fable"}, {"claude-fable-5-1", "7d_fable"}, {"claude-sonnet-5", "7d_sonnet"},
			{"claude-opus-5", ""}, {"claude-haiku-4-5-20251001", ""}, {"prefix-claude-fable-5", ""},
			{"claude-fable", ""}, {"claude-fableish-5", ""}, {"Claude-fable-5", ""},
		} {
			t.Run(shared+"/"+tc.model, func(t *testing.T) {
				windows := []*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}, {Key: "7d", Status: "allowed"}, {Key: "7d_fable", Status: "rejected", ResetsAtUnix: reset}, {Key: "7d_sonnet", Status: "rejected", ResetsAtUnix: reset}}
				for _, window := range windows {
					if window.Key == shared {
						window.Status = "rejected"
					}
				}
				result := checkManaged(t, p, now, tc.model, &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Revision: 2, Windows: windows})
				if tc.blocked == "" {
					require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, result.State, result.Reason)
					require.Equal(t, "quota_not_enforced", result.Reason)
					require.Zero(t, result.RetryAtUnix)
					return
				}
				require.Equal(t, pluginv1.ModelAvailability_UNAVAILABLE, result.State, result.Reason)
				require.Equal(t, "quota_rejected:"+tc.blocked, result.Reason)
				require.Equal(t, reset, result.RetryAtUnix)
			})
		}
	}
}

// What the core stores for the plugin's expired-token usage error.
const expiredTokenError = "transient: token_expired: the access token expired; Claude Code renews it on its next request"

// No quota state holds a managed account back: an exhausted window answers
// with an upstream 429 that cools the account down until its reset, a refused
// authorization with a 401 the core's automatic disable rule acts on.
func TestModelAvailabilityQuotaNotEnforced(t *testing.T) {
	p, now := quotaTestPlugin()
	healthy := func() *pluginv1.AccountQuotaSnapshot {
		return &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: []*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}}}
	}
	rejected := func(q *pluginv1.AccountQuotaSnapshot) {
		q.Windows[0].Status = "rejected"
		q.Windows[0].ResetsAtUnix = now.Add(time.Hour).Unix()
	}
	for _, tc := range []struct {
		name   string
		mutate func(*pluginv1.AccountQuotaSnapshot)
	}{
		{"fresh", func(*pluginv1.AccountQuotaSnapshot) {}},
		{"rejected 5h", rejected},
		{"rejected 7d", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows = append(q.Windows, &pluginv1.QuotaWindow{Key: "7d", Status: "rejected", ResetsAtUnix: now.Add(72 * time.Hour).Unix()})
		}},
		{"rejection past its reset", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows[0].Status = "rejected"
			q.Windows[0].ResetsAtUnix = now.Add(-time.Minute).Unix()
		}},
		{"rejected without utilization", func(q *pluginv1.AccountQuotaSnapshot) {
			rejected(q)
			q.Windows[0].UtilizationUnknown = true
		}},
		{"unobserved", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix = 0; q.Windows = nil }},
		{"future observation", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix++ }},
		{"empty windows", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows = nil }},
		{"stale", func(q *pluginv1.AccountQuotaSnapshot) { q.UpdatedAtUnix -= 86400 }},
		{"stale rejection", func(q *pluginv1.AccountQuotaSnapshot) { rejected(q); q.UpdatedAtUnix -= 86400 }},
		{"refresh failed", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "transient: usage runtime returned 502"
			q.UpdatedAtUnix -= 86400
		}},
		{"refresh failed keeps a rejection", func(q *pluginv1.AccountQuotaSnapshot) {
			rejected(q)
			q.Error = "transient: usage runtime returned 502"
			q.UpdatedAtUnix -= 86400
		}},
		{"refresh failed before any observation", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "transient: usage runtime returned 502"
			q.UpdatedAtUnix = 0
			q.Windows = nil
		}},
		{"expired token", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = expiredTokenError; q.UpdatedAtUnix -= 86400 }},
		{"expired token with a rejection", func(q *pluginv1.AccountQuotaSnapshot) { rejected(q); q.Error = expiredTokenError }},
		{"signed out", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "auth_rejected: not_logged_in: Claude Code is not signed in"
		}},
		{"revoked", func(q *pluginv1.AccountQuotaSnapshot) { q.Error = "auth_rejected: token_revoked: refused" }},
		{"revoked with a rejection", func(q *pluginv1.AccountQuotaSnapshot) {
			rejected(q)
			q.Error = "auth_rejected: token_revoked: refused"
		}},
		{"revoked before any observation", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Error = "auth_rejected: token_revoked: refused"
			q.UpdatedAtUnix = 0
			q.Windows = nil
		}},
		{"unknown status", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Status = "" }},
		{"unknown utilization", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].UtilizationUnknown = true }},
		{"nan", func(q *pluginv1.AccountQuotaSnapshot) { q.Windows[0].Utilization = math.NaN() }},
		{"duplicate windows", func(q *pluginv1.AccountQuotaSnapshot) {
			q.Windows = append(q.Windows, &pluginv1.QuotaWindow{Key: "5h", Status: "rejected"})
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			q := healthy()
			tc.mutate(q)
			for _, model := range []string{"claude-fable-5", "claude-opus-5"} {
				result := checkManaged(t, p, now, model, q)
				require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, result.State, result.Reason)
				require.Equal(t, "quota_not_enforced", result.Reason)
				require.Zero(t, result.RetryAtUnix)
			}
		})
	}
	result := checkManaged(t, p, now, "claude-fable-5", nil)
	require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, result.State, result.Reason)
}

// A scoped rejection holds its family back until the reset, whatever else the
// snapshot says, and not past it; one the plugin cannot trust holds nothing.
func TestModelAvailabilityScopedRejectionUntilReset(t *testing.T) {
	p, now := quotaTestPlugin()
	reset := now.Add(time.Hour).Unix()
	fable := func(mutate func(*pluginv1.QuotaWindow)) *pluginv1.AccountQuotaSnapshot {
		window := &pluginv1.QuotaWindow{Key: "7d_fable", Status: "rejected", ResetsAtUnix: reset, UtilizationUnknown: true}
		if mutate != nil {
			mutate(window)
		}
		return &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: []*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}, window}}
	}
	for _, tc := range []struct {
		name    string
		q       *pluginv1.AccountQuotaSnapshot
		blocked bool
	}{
		{"future reset", fable(nil), true},
		{"stale snapshot", func() *pluginv1.AccountQuotaSnapshot { q := fable(nil); q.UpdatedAtUnix -= 86400; return q }(), true},
		{"refresh failed", func() *pluginv1.AccountQuotaSnapshot {
			q := fable(nil)
			q.Error = "transient: usage runtime returned 502"
			return q
		}(), true},
		{"revoked", func() *pluginv1.AccountQuotaSnapshot {
			q := fable(nil)
			q.Error = "auth_rejected: token_revoked: refused"
			return q
		}(), true},
		{"reset now", fable(func(w *pluginv1.QuotaWindow) { w.ResetsAtUnix = now.Unix() }), false},
		{"reset passed", fable(func(w *pluginv1.QuotaWindow) { w.ResetsAtUnix = now.Add(-time.Hour).Unix() }), false},
		{"no reset time", fable(func(w *pluginv1.QuotaWindow) { w.ResetsAtUnix = 0 }), false},
		{"invalid window", fable(func(w *pluginv1.QuotaWindow) { w.Utilization = 100 }), false},
		{"allowed", fable(func(w *pluginv1.QuotaWindow) { w.Status = "allowed" }), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			result := checkManaged(t, p, now, "claude-fable-5", tc.q)
			if !tc.blocked {
				require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, result.State, result.Reason)
				require.Zero(t, result.RetryAtUnix)
				return
			}
			require.Equal(t, pluginv1.ModelAvailability_UNAVAILABLE, result.State, result.Reason)
			require.Equal(t, "quota_rejected:7d_fable", result.Reason)
			require.Equal(t, reset, result.RetryAtUnix)
			other := checkManaged(t, p, now, "claude-opus-5", tc.q)
			require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, other.State, other.Reason)
		})
	}
	// Two rejections of the family: the later reset decides.
	q := fable(nil)
	q.Windows = append(q.Windows, &pluginv1.QuotaWindow{Key: "7d_fable", Status: "rejected", ResetsAtUnix: reset + 60})
	require.Equal(t, reset+60, checkManaged(t, p, now, "claude-fable-5", q).RetryAtUnix)
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
		if i == 1 || i == 2 {
			want = pluginv1.ModelAvailability_AVAILABLE
		}
		require.Equal(t, want, out.Results[i].State)
		require.NotEmpty(t, out.Results[i].Reason)
	}
	require.Equal(t, "quota_not_enforced", out.Results[1].Reason)
	require.Equal(t, "subscription_not_required", out.Results[2].Reason)
	require.Equal(t, "unsupported_account_type", out.Results[3].Reason)
	require.Equal(t, "duplicate_candidate", out.Results[4].Reason)
	require.Equal(t, "duplicate_candidate", out.Results[5].Reason)
	require.Equal(t, "invalid_candidate", out.Results[6].Reason)
	in.NowUnix = 0
	out, err = p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	for _, result := range out.Results {
		require.Equal(t, pluginv1.ModelAvailability_UNKNOWN, result.State)
		require.Equal(t, "invalid_candidate", result.Reason)
	}
	out, err = p.CheckModelAvailability(context.Background(), nil)
	require.NoError(t, err)
	require.Empty(t, out.Results)
}
