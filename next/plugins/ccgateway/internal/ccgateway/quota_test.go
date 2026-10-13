package ccgateway

import (
	"context"
	"fmt"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func quotaTestPlugin() (*Plugin, time.Time) {
	now := time.Date(2026, time.October, 5, 12, 0, 0, 0, time.UTC)
	return &Plugin{now: func() time.Time { return now }}, now
}

func quotaAnswer(t *testing.T, raw string) *pluginv1.QuotaResult {
	t.Helper()
	p, _ := quotaTestPlugin()
	result, err := p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 200, Body: []byte(raw)})
	require.NoError(t, err)
	return result
}

func TestQuotaRuntimeOperation(t *testing.T) {
	p, _ := quotaTestPlugin()
	out, err := p.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{Account: &pluginv1.Account{Type: AccountTypeManaged, CredentialsJson: `{"ignored":"not-read"}`}})
	require.NoError(t, err)
	require.Equal(t, "usage", out.GetRuntimeOperation())
	require.Empty(t, out.GetUrl())
	require.Empty(t, out.GetMethod())
	require.Empty(t, out.GetHeaders())
	require.Empty(t, out.GetBodyJson())
	for _, kind := range []string{AccountTypeAPIKey, "", "unknown"} {
		_, err = p.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{Account: &pluginv1.Account{Type: kind}})
		require.Equal(t, codes.Unimplemented, status.Code(err))
		_, err = p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{Account: &pluginv1.Account{Type: kind}})
		require.Equal(t, codes.Unimplemented, status.Code(err))
	}
}

func TestQuotaRawUsageAndScopedLimits(t *testing.T) {
	for _, fable := range []string{
		`"seven_day_overage_included":{"utilization":100,"resets_at":"2026-10-10T08:00:00Z"}`,
		`"limits":[{"kind":"weekly_scoped","group":"weekly","percent":100,"resets_at":"2026-10-10T08:00:00Z","scope":{"model":{"id":null,"display_name":"Fable"},"surface":null}}]`,
	} {
		out := quotaAnswer(t, `{"five_hour":{"utilization":0,"resets_at":null},"seven_day":{"utilization":42.5,"resets_at":"2026-10-05T12:01:00.5+00:00"},"seven_day_sonnet":{"utilization":9,"resets_at":null},"extra_usage":{"is_enabled":false},`+fable+`}`)
		require.Equal(t, pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED, out.GetErrorType(), out.GetErrorMessage())
		require.Len(t, out.Windows, 4)
		for _, window := range out.Windows {
			require.False(t, window.GetUtilizationUnknown())
		}
		require.Equal(t, "5h", out.Windows[0].Key)
		require.Zero(t, out.Windows[0].Utilization)
		require.Zero(t, out.Windows[0].ResetsAtUnix)
		require.Equal(t, "allowed", out.Windows[0].Status)
		require.Equal(t, "7d_fable", out.Windows[3].Key)
		require.Equal(t, "rejected", out.Windows[3].Status)
		_, now := quotaTestPlugin()
		require.Equal(t, now.Add(61*time.Second).Unix(), out.NextCheckAtUnix)
	}
	out := quotaAnswer(t, `{"limits":[{"kind":"weekly_scoped","percent":6,"scope":{"model":{"display_name":"Sonnet"}}}]}`)
	require.Len(t, out.GetWindows(), 1)
	require.Equal(t, "7d_sonnet", out.Windows[0].Key)
}

func TestQuotaExhaustionRequiresProviderEvidence(t *testing.T) {
	for _, tc := range []struct {
		name, fields, want string
		failure            bool
	}{
		{"extra disabled", `"extra_usage":{"is_enabled":false}`, "rejected", false},
		{"extra available", `"extra_usage":{"is_enabled":true,"monthly_limit":1000,"used_credits":999}`, "allowed", false},
		{"extra exhausted", `"extra_usage":{"is_enabled":true,"monthly_limit":1000,"used_credits":1000}`, "rejected", false},
		{"zero extra budget", `"extra_usage":{"is_enabled":true,"monthly_limit":0,"used_credits":0}`, "rejected", false},
		{"unknown extra", `"extra_usage":null`, "", true},
		{"enabled but budget unknown", `"extra_usage":{"is_enabled":true}`, "", true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out := quotaAnswer(t, `{"five_hour":{"utilization":100,"resets_at":null},`+tc.fields+`}`)
			if tc.failure {
				require.Equal(t, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, out.ErrorType)
				require.Empty(t, out.Windows)
				return
			}
			require.Len(t, out.Windows, 1)
			require.Equal(t, tc.want, out.Windows[0].Status)
		})
	}
	for _, state := range []string{"allowed", "allowed_warning", "rejected"} {
		out := quotaAnswer(t, fmt.Sprintf(`{"five_hour":{"utilization":100,"status":%q},"extra_usage":{"is_enabled":true,"monthly_limit":1000,"used_credits":0}}`, state))
		require.Len(t, out.Windows, 1)
		require.Equal(t, state, out.Windows[0].Status)
	}
}

func TestQuotaMissingAndMalformedNeverProduceZero(t *testing.T) {
	for _, raw := range []string{
		`{}`, `null`, `[]`, `{"five_hour":`, `{"five_hour":{}}`, `{"five_hour":{"utilization":null}}`,
		`{"five_hour":{"utilization":-1}}`, `{"five_hour":{"utilization":"0"}}`,
		`{"five_hour":{"utilization":0,"resets_at":"bad-time"}}`, `{"five_hour":{"utilization":0,"status":"future"}}`,
		`{"five_hour":{"utilization":0},"seven_day":{"resets_at":null}}`,
		`{"five_hour":{"utilization":100,"utilization":0}}`,
		`{"five_hour":{"utilization":100},"five_hour":{"utilization":0}}`,
		`{"seven_day_overage_included":{"utilization":0},"limits":[{"kind":"weekly_scoped","percent":100,"status":"rejected","scope":{"model":{"display_name":"Fable"}}}]}`,
		`{"limits":[{"kind":"weekly_scoped","scope":{"model":{"display_name":"Fable"}}}]}`,
		`{"limits":[{"kind":"weekly_scoped","percent":0,"scope":{"model":{"display_name":"Fable"}}},{"kind":"weekly_scoped","percent":100,"scope":{"model":{"display_name":"Fable"}}}]}`,
	} {
		t.Run(raw, func(t *testing.T) {
			out := quotaAnswer(t, raw)
			require.Equal(t, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT, out.ErrorType)
			require.Empty(t, out.Windows)
			require.NotEmpty(t, out.ErrorMessage)
		})
	}
	out := quotaAnswer(t, `{"seven_day":{"utilization":0}}`)
	require.Len(t, out.Windows, 1)
	require.Equal(t, "7d", out.Windows[0].Key)
	require.Equal(t, "allowed", out.Windows[0].Status)
	out = quotaAnswer(t, `{"five_hour":{"utilization":0},"limits":[{"kind":"weekly_scoped","percent":100,"scope":{"model":{"display_name":"Fable"},"surface":"other"}}]}`)
	require.Len(t, out.Windows, 1)
}

func TestQuotaRuntimeFailures(t *testing.T) {
	p, now := quotaTestPlugin()
	for _, tc := range []struct {
		status          int32
		raw             string
		truncated, auth bool
		message         string
	}{
		{0, "", false, false, "failed"},
		{400, `{"error":{"type":"not_logged_in","message":"do not echo secret"}}`, false, true, "not_logged_in"},
		{400, `{"error":{"code":"token_expired"}}`, false, true, "token_expired"},
		{401, `{"error":{"type":"authentication_error"}}`, false, false, "401"},
		{409, `{"error":{"type":"api_key_account"}}`, false, false, "API key"},
		{409, `{"error":"api_key_account"}`, false, false, "API key"},
		{400, `{"error":"not_logged_in"}`, false, true, "not_logged_in"},
		{409, "", false, false, "synchronized"},
		{404, `{"error":{"type":"not_found_error"}}`, false, false, "upgrade"},
		{429, "", false, false, "429"},
		{502, `{"error":{"type":"upstream_error"}}`, false, false, "502"},
		{200, `{"five_hour":{"utilization":0}}`, true, false, "too large"},
		{200, strings.Repeat(" ", maxQuotaBody+1), false, false, "too large"},
	} {
		out, err := p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: tc.status, Body: []byte(tc.raw), Truncated: tc.truncated})
		require.NoError(t, err)
		kind := pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT
		if tc.auth {
			kind = pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED
		}
		require.Equal(t, kind, out.ErrorType)
		require.Contains(t, out.ErrorMessage, tc.message)
		require.NotContains(t, out.ErrorMessage, "secret")
		require.Empty(t, out.Windows)
		require.Equal(t, now.Add(quotaRetry).Unix(), out.NextCheckAtUnix)
	}
}

func TestQuotaNextCheckUsesRefreshAndObservedResets(t *testing.T) {
	_, now := quotaTestPlugin()
	for _, tc := range []struct {
		reset  int64
		status string
		delay  time.Duration
	}{
		{0, "allowed", quotaRefresh}, {now.Add(time.Hour).Unix(), "rejected", quotaRefresh},
		{now.Add(10 * time.Second).Unix(), "rejected", 11 * time.Second}, {now.Add(-time.Second).Unix(), "rejected", 30 * time.Second},
	} {
		require.Equal(t, now.Add(tc.delay).Unix(), nextQuotaCheck(now, []*pluginv1.QuotaWindow{{Key: "5h", ResetsAtUnix: tc.reset, Status: tc.status}}))
	}
}
