package ccgateway

import (
	"context"
	"net/http"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
)

func TestNativeBillingClassification(t *testing.T) {
	for _, tc := range []struct {
		name, source, category, scope string
		status                        int32
		disable                       bool
	}{
		{"native billing", "cli", "billing_error", "", 400, true},
		{"private request scope", "cli", "billing_error", "request", 400, false},
		{"unknown category", "cli", "future_error", "", 400, false},
		{"missing category", "cli", "", "", 400, false},
		{"category exact case", "cli", "Billing_Error", "", 400, false},
		{"category exact whitespace", "cli", "billing_error ", "", 400, false},
		{"body only", "", "", "", 400, false},
		{"source spoof", "upstream", "billing_error", "", 400, false},
		{"missing source", "", "billing_error", "", 400, false},
		{"source exact case", "CLI", "billing_error", "", 400, false},
		{"source exact whitespace", "cli ", "billing_error", "", 400, false},
		{"other status", "cli", "billing_error", "", 402, false},
		{"unknown status", "cli", "billing_error", "", 499, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Status:     tc.status,
				BodyPrefix: []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Claude Code native error: billing_error"}}`),
				Headers: map[string]string{
					"x-ccgateway-error-source": tc.source,
					"x-ccgateway-cli-error":    tc.category,
					errorScopeHeader:           tc.scope,
				},
			})
			require.NoError(t, err)
			if tc.disable {
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
				require.Equal(t, "upstream credit balance too low", out.GetReason())
			} else {
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.GetAction())
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.GetAccountEffect())
			}
			require.Equal(t, tc.scope == "request", out.GetLocalFailure())
			require.Zero(t, out.GetCooldownUntilUnix())
			require.Nil(t, out.GetAutomaticState())
		})
	}
}

func TestLegacyBillingClassification(t *testing.T) {
	out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
		Status:     http.StatusBadRequest,
		BodyPrefix: []byte(`{"error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}`),
	})
	require.NoError(t, err)
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
}

// The core answers an unsynchronized account runtime with this body
// (server/internal/ccgateway notSynchronizedResponse): another account takes
// the request and the body stays the client's error if none can.
func TestRuntimeNotSynchronizedFailsOver(t *testing.T) {
	out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
		Status:     http.StatusServiceUnavailable,
		BodyPrefix: []byte(`{"error":{"message":"The account runtime is not ready yet; try again shortly.","type":"api_error"},"type":"error"}`),
	})
	require.NoError(t, err)
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, out.GetAccountEffect())
	require.Empty(t, out.GetClientErrorType())
	require.Empty(t, out.GetClientMessage())
}

func TestNativeQuotaRetryAfterClassification(t *testing.T) {
	now := time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC)
	reset := now.Add(5 * time.Hour)
	for _, retryAfter := range []string{"18000", reset.Format(http.TimeFormat)} {
		t.Run(retryAfter, func(t *testing.T) {
			p := &Plugin{now: func() time.Time { return now }}
			out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Account:    &pluginv1.Account{Type: AccountTypeManaged},
				Status:     http.StatusTooManyRequests,
				BodyPrefix: []byte(`{"error":{"type":"rate_limit_error","message":"Claude Code native error: rate_limit_error"}}`),
				Headers: map[string]string{
					"x-ccgateway-error-source": "cli",
					"x-ccgateway-cli-error":    "rate_limit_error",
					"retry-after":              retryAfter,
				},
			})
			require.NoError(t, err)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
			require.Equal(t, reset.Unix(), out.GetCooldownUntilUnix())
			require.Equal(t, reset.Unix(), out.GetAutomaticState().GetUntilUnix())
			require.False(t, out.GetLocalFailure())
		})
	}
}
