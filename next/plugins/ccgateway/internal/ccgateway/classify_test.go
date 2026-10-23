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

// The gateway's own refusals (X-CCGateway-Error-Source core/gateway) are
// never the upstream's verdict on the account (audit C2/A6): a refused
// configuration or a stale Worker key cools the account down and fails over
// with the stated reason, a Worker 401 never disables the account, the
// Worker's concurrency limit frees in a moment, and a request the Worker
// found unusable goes back to the client.
func TestGatewayRefusalsAreLocal(t *testing.T) {
	body := func(kind, msg string) []byte {
		return []byte(`{"type":"error","error":{"type":"` + kind + `","message":"` + msg + `"}}`)
	}
	for _, tc := range []struct {
		name, source, reason string
		status               int32
		headers              map[string]string
		body                 []byte
		action               pluginv1.ClassifyErrorResponse_Action
		effect               pluginv1.ClassifyErrorResponse_AccountEffect
		reasonText           string
	}{
		{"core: capability missing", "core", "configuration_error", 503, nil, body("api_error", "The feature policy cannot be applied: the account Worker/CLI lacks request_levels_v1 (update the Worker and CLI in place)."),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (configuration_error: The feature policy cannot be applied"},
		{"core: account deleted", "core", "account_deleted", 503, nil, body("api_error", "The account has been deleted."),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (account_deleted: The account has been deleted.)"},
		{"worker: stale key", "gateway", "unauthorized", 401, nil, body("authentication_error", "Invalid gateway API key"),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (unauthorized: Invalid gateway API key)"},
		{"worker: mode mismatch", "gateway", "configuration_error", 409, nil, body("configuration_error", "Loaded CLI does not support the requested mode"),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (configuration_error: Loaded CLI does not support the requested mode)"},
		{"worker: not ready", "gateway", "unavailable", 503, nil, body("api_error", "Claude Code tool catalog is not ready"),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (unavailable: Claude Code tool catalog is not ready)"},
		{"worker: concurrency", "gateway", "concurrency_limit", 429, map[string]string{"retry-after": "1"}, body("rate_limit_error", "Gateway concurrency limit reached"),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway concurrency limit until"},
		{"worker: bad body", "gateway", "invalid_request", 400, nil, body("invalid_request_error", "Cannot read body"),
			pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, ""},
		{"worker: too large", "gateway", "request_too_large", 413, nil, body("request_too_large", "Request exceeds 32 MiB"),
			pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			headers := map[string]string{"x-ccgateway-error-source": tc.source, "x-ccgateway-error-reason": tc.reason}
			for k, v := range tc.headers {
				headers[k] = v
			}
			out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: tc.status, BodyPrefix: tc.body, Headers: headers,
				Account: &pluginv1.Account{Type: AccountTypeManaged}})
			require.NoError(t, err)
			require.True(t, out.GetLocalFailure(), "never the upstream's verdict")
			require.Equal(t, tc.action, out.GetAction())
			require.Equal(t, tc.effect, out.GetAccountEffect())
			require.Nil(t, out.GetAutomaticState(), "never disabled")
			if tc.reasonText != "" {
				require.Contains(t, out.GetReason(), tc.reasonText)
			}
			require.Empty(t, out.GetClientErrorType(), "the gateway's own body reaches the client as written")
		})
	}
	// An upstream answer never carries the marker: the Worker strips it
	// (httpfacts.Apply), and a spoofed or unknown value is not local.
	for _, spoof := range []string{"upstream", "Core", "gateway,core", ""} {
		out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 401, BodyPrefix: body("authentication_error", "invalid x-api-key"),
			Headers: map[string]string{"x-ccgateway-error-source": spoof}, Account: &pluginv1.Account{Type: AccountTypeManaged}})
		require.NoError(t, err)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect(), spoof)
		require.False(t, out.GetLocalFailure(), spoof)
	}
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
