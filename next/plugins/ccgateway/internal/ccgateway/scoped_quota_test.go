package ccgateway

import (
	"context"
	"strconv"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
)

func TestNativeScoped429Classification(t *testing.T) {
	p, now := quotaTestPlugin()
	for _, tc := range []struct {
		kind, key string
		scoped    bool
	}{
		{"seven_day_overage_included", "7d_fable", true}, {"seven_day_sonnet", "7d_sonnet", true},
		{"five_hour", "5h", false}, {"seven_day", "7d", false},
	} {
		t.Run(tc.kind, func(t *testing.T) {
			reset := now.Add(time.Hour).Unix()
			out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: map[string]string{
				"x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", httpfacts.NativeObservedStatusHeader: "429", httpfacts.NativeQuotaTypeHeader: tc.kind, httpfacts.NativeQuotaResetHeader: strconv.FormatInt(reset, 10), "retry-after": "3600",
			}})
			require.NoError(t, err)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.Action)
			require.False(t, out.LocalFailure)
			require.Len(t, out.GetQuota().GetWindows(), 1)
			require.Equal(t, tc.key, out.Quota.Windows[0].Key)
			require.Equal(t, "rejected", out.Quota.Windows[0].Status)
			require.True(t, out.Quota.Windows[0].GetUtilizationUnknown())
			require.Zero(t, out.Quota.Windows[0].GetUtilization())
			require.Zero(t, out.Quota.Windows[0].GetUsed())
			require.Zero(t, out.Quota.Windows[0].GetLimit())
			require.Equal(t, reset, out.Quota.Windows[0].ResetsAtUnix)
			require.Equal(t, now.Add(quotaRefresh).Unix(), out.Quota.NextCheckAtUnix)
			if tc.scoped {
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.AccountEffect)
				require.Zero(t, out.CooldownUntilUnix)
				require.Nil(t, out.AutomaticState)
				return
			}
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.AccountEffect)
			require.Equal(t, reset, out.GetAutomaticState().GetUntilUnix())
		})
	}
}

func TestNativeScoped429ActiveZeroRefresh(t *testing.T) {
	p, now := quotaTestPlugin()
	observed, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
		Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429,
		Headers: map[string]string{"x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", httpfacts.NativeObservedStatusHeader: "429", httpfacts.NativeQuotaTypeHeader: "seven_day_overage_included"},
	})
	require.NoError(t, err)
	require.Len(t, observed.GetQuota().GetWindows(), 1)
	q := &pluginv1.AccountQuotaSnapshot{UpdatedAtUnix: now.Unix(), Windows: append([]*pluginv1.QuotaWindow{{Key: "5h", Status: "allowed"}}, observed.Quota.Windows...)}
	in := &pluginv1.CheckModelAvailabilityRequest{NowUnix: now.Unix(), Candidates: []*pluginv1.ModelAvailabilityCandidate{{AccountId: 1, AccountType: AccountTypeManaged, Model: "claude-fable-5", Quota: q}}}
	before, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.True(t, q.Windows[1].GetUtilizationUnknown())
	require.Equal(t, pluginv1.ModelAvailability_UNAVAILABLE, before.Results[0].State)
	fresh := quotaAnswer(t, `{"five_hour":{"utilization":0},"seven_day_overage_included":{"utilization":0}}`)
	require.Equal(t, pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED, fresh.ErrorType)
	require.Len(t, fresh.Windows, 2)
	q.Windows = fresh.Windows
	for _, window := range q.Windows {
		require.False(t, window.GetUtilizationUnknown())
		require.Zero(t, window.GetUtilization())
	}
	after, err := p.CheckModelAvailability(context.Background(), in)
	require.NoError(t, err)
	require.Equal(t, pluginv1.ModelAvailability_AVAILABLE, after.Results[0].State)
}

func TestScoped429SpoofsAndUnknownScopeRemainConservative(t *testing.T) {
	p, _ := quotaTestPlugin()
	for _, tc := range []struct {
		name          string
		mutate        func(*pluginv1.ClassifyErrorRequest)
		local, apikey bool
	}{
		{"missing source", func(in *pluginv1.ClassifyErrorRequest) { delete(in.Headers, "x-ccgateway-error-source") }, false, false},
		{"upstream source", func(in *pluginv1.ClassifyErrorRequest) { in.Headers["x-ccgateway-error-source"] = "upstream" }, false, false},
		{"missing observed status", func(in *pluginv1.ClassifyErrorRequest) { delete(in.Headers, httpfacts.NativeObservedStatusHeader) }, false, false},
		{"wrong observed status", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[httpfacts.NativeObservedStatusHeader] = "200" }, false, false},
		{"unknown category", func(in *pluginv1.ClassifyErrorRequest) { in.Headers["x-ccgateway-cli-error"] = "unknown" }, false, false},
		{"unknown type", func(in *pluginv1.ClassifyErrorRequest) {
			in.Headers[httpfacts.NativeQuotaTypeHeader] = "seven_day_opus"
		}, false, false},
		{"missing type", func(in *pluginv1.ClassifyErrorRequest) { delete(in.Headers, httpfacts.NativeQuotaTypeHeader) }, false, false},
		{"type whitespace", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[httpfacts.NativeQuotaTypeHeader] += " " }, false, false},
		{"invalid reset", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[httpfacts.NativeQuotaResetHeader] = "-1" }, false, false},
		{"reset overflow", func(in *pluginv1.ClassifyErrorRequest) {
			in.Headers[httpfacts.NativeQuotaResetHeader] = "9223372036854775808"
		}, false, false},
		{"unknown error scope", func(in *pluginv1.ClassifyErrorRequest) { in.Headers[errorScopeHeader] = "future" }, false, false},
		{"local concurrency", func(in *pluginv1.ClassifyErrorRequest) {
			in.BodyPrefix = []byte(`{"error":{"type":"rate_limit_error","message":"Gateway concurrency limit reached"}}`)
		}, true, false},
		{"API key", func(in *pluginv1.ClassifyErrorRequest) { in.Account.Type = AccountTypeAPIKey }, false, true},
		{"body and provider headers cannot claim scope", func(in *pluginv1.ClassifyErrorRequest) {
			in.Headers = map[string]string{"anthropic-ratelimit-unified-7d_oi-status": "rejected", "anthropic-ratelimit-unified-7d_oi-utilization": "1"}
			in.BodyPrefix = []byte(`{"error":{"type":"rate_limit_error","message":"Fable weekly limit","scope":"Fable"}}`)
		}, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			in := &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: map[string]string{"x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", httpfacts.NativeObservedStatusHeader: "429", httpfacts.NativeQuotaTypeHeader: "seven_day_overage_included"}}
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

func TestNativeQuotaDoesNotOverrideAuthOrRequestRefusal(t *testing.T) {
	for _, code := range []int32{401, 403, 429} {
		in := &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: code, Headers: map[string]string{"x-ccgateway-error-source": "cli", "x-ccgateway-cli-error": "rate_limit", httpfacts.NativeObservedStatusHeader: "429", httpfacts.NativeQuotaTypeHeader: "seven_day_overage_included"}}
		if code == 429 {
			in.Headers[errorScopeHeader] = "request"
		}
		out, err := New().ClassifyError(context.Background(), in)
		require.NoError(t, err)
		require.Nil(t, out.Quota)
		if code == 429 {
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.Action)
			require.True(t, out.LocalFailure)
			continue
		}
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.AccountEffect)
	}
}
