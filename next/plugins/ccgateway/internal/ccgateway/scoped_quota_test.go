package ccgateway

import (
	"context"
	"strconv"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
)

// upstream429 is a managed account's upstream 429 as the Worker relays it:
// marked as an upstream HTTP answer, with the unified rate-limit headers.
func upstream429(claim string, reset int64) *pluginv1.ClassifyErrorRequest {
	h := map[string]string{sourceHeader: "http", claimHeader: claim, "retry-after": "3600"}
	if reset != 0 {
		h[claimResetHeader] = strconv.FormatInt(reset, 10)
	}
	return &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: h,
		BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"This request would exceed your account's rate limit."}}`)}
}

func TestScoped429Classification(t *testing.T) {
	p, now := quotaTestPlugin()
	for _, tc := range []struct {
		claim, key string
		scoped     bool
	}{
		{"seven_day_overage_included", "7d_fable", true}, {"seven_day_sonnet", "7d_sonnet", true},
		{"five_hour", "5h", false}, {"seven_day", "7d", false},
	} {
		t.Run(tc.claim, func(t *testing.T) {
			reset := now.Add(time.Hour).Unix()
			out, err := p.ClassifyError(context.Background(), upstream429(tc.claim, reset))
			require.NoError(t, err)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.Action)
			require.False(t, out.LocalFailure)
			require.Len(t, out.GetQuota().GetWindows(), 1)
			require.Equal(t, tc.key, out.Quota.Windows[0].Key)
			require.Equal(t, "rejected", out.Quota.Windows[0].Status)
			require.True(t, out.Quota.Windows[0].GetUtilizationUnknown())
			require.Equal(t, reset, out.Quota.Windows[0].ResetsAtUnix)
			require.Equal(t, now.Add(quotaRefresh).Unix(), out.Quota.NextCheckAtUnix)
			if tc.scoped {
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.AccountEffect)
				require.Zero(t, out.CooldownUntilUnix)
				require.Nil(t, out.AutomaticState)
				return
			}
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.AccountEffect)
			require.Equal(t, now.Add(time.Hour).Unix(), out.GetAutomaticState().GetUntilUnix())
		})
	}
}

// A scoped 429 holds the family back until its reset; a query showing the
// window cleared lets it through sooner.
func TestScoped429ActiveZeroRefresh(t *testing.T) {
	p, now := quotaTestPlugin()
	observed, err := p.ClassifyError(context.Background(), upstream429("seven_day_overage_included", now.Add(time.Hour).Unix()))
	require.NoError(t, err)
	require.Len(t, observed.GetQuota().GetWindows(), 1)
	q := &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: append([]*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}}, observed.Quota.Windows...)}
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5", Quota: q}}}
	before, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.Equal(t, pluginv1.ModelAvailability_UNAVAILABLE, before.Results[0].State)
	fresh := quotaAnswer(t, `{"five_hour":{"utilization":0},"seven_day_overage_included":{"utilization":0}}`)
	require.Equal(t, pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED, fresh.ErrorType)
	q.Windows = fresh.Windows
	after, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, after.Results[0].State)
}

// A scoped 429 without a future reset cannot hold the family back by itself
// (model availability would admit it again at once): it disables the whole
// account like any other 429, until retry-after.
func TestScoped429WithoutResetDisablesAccount(t *testing.T) {
	p, now := quotaTestPlugin()
	for _, reset := range []int64{0, now.Unix(), now.Add(-time.Hour).Unix()} {
		out, err := p.ClassifyError(context.Background(), upstream429("seven_day_overage_included", reset))
		require.NoError(t, err)
		require.Len(t, out.GetQuota().GetWindows(), 1)
		require.Equal(t, "7d_fable", out.Quota.Windows[0].Key)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.Action)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.AccountEffect)
		require.Equal(t, now.Add(time.Hour).Unix(), out.CooldownUntilUnix)
		require.Equal(t, now.Add(time.Hour).Unix(), out.GetAutomaticState().GetUntilUnix())
		q := &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: out.Quota.Windows}
		in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5", Quota: q}}}
		admitted, err := p.CheckModelAvailability(context.Background(), in)
		require.NoError(t, err)
		require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, admitted.Results[0].State)
	}
}

// Only a managed account's upstream answer names a limit; anything else is
// an ordinary 429 (the account disabled until it resets) or a local one.
func TestScoped429SpoofsAndUnknownClaimsRemainConservative(t *testing.T) {
	p, _ := quotaTestPlugin()
	for _, tc := range []struct {
		name          string
		mutate        func(*pluginv1.ClassifyErrorRequest)
		local, apikey bool
	}{
		{"missing source", func(in *pluginv1.ClassifyErrorRequest) { delete(in.Headers, sourceHeader) }, false, false},
		{"CLI-side source", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[sourceHeader] = "transport" }, false, false},
		{"source exact case", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[sourceHeader] = "HTTP" }, false, false},
		{"unknown claim", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[claimHeader] = "seven_day_opus" }, false, false},
		{"missing claim", func(in *pluginv1.ClassifyErrorRequest) { delete(in.Headers, claimHeader) }, false, false},
		{"claim whitespace", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[claimHeader] += " " }, false, false},
		{"invalid reset", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[claimResetHeader] = "-1" }, false, false},
		{"reset overflow", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[claimResetHeader] = "9223372036854775808" }, false, false},
		{"gateway concurrency", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[sourceHeader] = "gateway" }, true, false},
		{"API key", func(in *pluginv1.ClassifyErrorRequest) { in.Account.Type = AccountTypeAPIKey }, false, true},
		{"the body cannot claim a scope", func(in *pluginv1.ClassifyErrorRequest) {
			delete(in.Headers, claimHeader)
			in.BodyPrefix = []byte(`{"error":{"type":"rate_limit_error","message":"Fable weekly limit","scope":"Fable"}}`)
		}, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			in := upstream429("seven_day_overage_included", 0)
			tc.mutate(in)
			out, err := p.ClassifyError(context.Background(), in)
			require.NoError(t, err)
			require.Nil(t, out.Quota)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.Action)
			want := pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
			if tc.local || tc.apikey {
				want = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
			}
			require.Equal(t, want, out.AccountEffect)
			require.Equal(t, tc.local, out.LocalFailure)
		})
	}
}

// A claim on another status names nothing: credentials stay the verdict.
func TestScopedClaimDoesNotOverrideAuth(t *testing.T) {
	for _, code := range []int32{401, 403} {
		in := upstream429("seven_day_overage_included", 0)
		in.Status = code
		out, err := New().ClassifyError(context.Background(), in)
		require.NoError(t, err)
		require.Nil(t, out.Quota)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.AccountEffect)
	}
}

// A shared window's 429 carries the window's own utilization: the observation
// records it instead of an unknown value (the console shows 103%).
func Test429RecordsHeaderUtilization(t *testing.T) {
	p, now := quotaTestPlugin()
	in := upstream429("five_hour", now.Add(time.Hour).Unix())
	in.Headers["anthropic-ratelimit-unified-5h-utilization"] = "1.03"
	out, err := p.ClassifyError(context.Background(), in)
	require.NoError(t, err)
	w := out.GetQuota().GetWindows()[0]
	require.False(t, w.GetUtilizationUnknown())
	require.InDelta(t, 103, w.GetUtilization(), 1e-9)
	in.Headers["anthropic-ratelimit-unified-5h-utilization"] = "x"
	out, err = p.ClassifyError(context.Background(), in)
	require.NoError(t, err)
	require.True(t, out.GetQuota().GetWindows()[0].GetUtilizationUnknown())
}
