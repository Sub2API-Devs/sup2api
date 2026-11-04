package ccgateway

import (
	"context"
	"net/http"
	"strconv"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/stretchr/testify/require"
)

// An upstream billing refusal disables the account; the CLI-side and the
// gateway's own 400s never do.
func TestBillingClassification(t *testing.T) {
	billing := []byte(`{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the Anthropic API."}}`)
	for _, tc := range []struct {
		name, source string
		disable      bool
	}{
		{"upstream answer", "http", true},
		{"no source", "", true},
		{"gateway refusal", "gateway", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: 400, BodyPrefix: billing, Headers: map[string]string{sourceHeader: tc.source}})
			require.NoError(t, err)
			if tc.disable {
				require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
				require.Equal(t, "upstream credit balance too low", out.GetReason())
				return
			}
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.GetAccountEffect())
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
		{"worker: CLI changed", "gateway", "unavailable", 503, nil, body("api_error", "Claude Code changed from 2.1.304 to 2.1.305; reconcile the runtime"),
			pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, "gateway refused the request (unavailable: Claude Code changed"},
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

func TestRateLimitRetryAfterClassification(t *testing.T) {
	now := time.Date(2026, time.July, 1, 0, 0, 0, 0, time.UTC)
	reset := now.Add(5 * time.Hour)
	for _, retryAfter := range []string{"18000", reset.Format(http.TimeFormat)} {
		t.Run(retryAfter, func(t *testing.T) {
			p := &Plugin{now: func() time.Time { return now }}
			out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Account:    &pluginv1.Account{Type: AccountTypeManaged},
				Status:     http.StatusTooManyRequests,
				BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"rate limited"}}`),
				Headers:    map[string]string{sourceHeader: "http", "retry-after": retryAfter, "anthropic-ratelimit-unified-5h-status": "rejected"},
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

// CC refusing to send without a usable login (the CLI's 401/403 frame,
// source input or transport) disables the account like an upstream 401: it
// needs a new authorization (2026-11-01).
func TestCLILoginRefusalDisables(t *testing.T) {
	for _, tc := range []struct {
		source string
		status int32
		body   string
	}{
		{"transport", 401, `{"type":"error","error":{"type":"authentication_error","code":"oauth_refresh_dead","message":"OAuth refresh token is no longer valid; run /login to re-authenticate"}}`},
		{"input", 401, `{"type":"error","error":{"type":"authentication_error","code":"not_logged_in","message":"CC did not provide OAuth authentication; sign in or configure ANTHROPIC_API_KEY"}}`},
		{"transport", 403, `{"type":"error","error":{"type":"permission_error","code":"oauth_account_on_hold","message":"OAuth account is on hold"}}`},
	} {
		out, err := New().ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Status: tc.status, BodyPrefix: []byte(tc.body),
			Headers: map[string]string{"x-ccgateway-error-source": tc.source}, Account: &pluginv1.Account{Type: AccountTypeManaged}})
		require.NoError(t, err)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction(), tc.body)
		require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect(), tc.body)
		require.False(t, out.GetLocalFailure(), tc.body)
		require.Empty(t, out.GetClientErrorType(), "CC's message reaches the client as written")
	}
}

// Only a limit that is really used up disables the account. Every other
// upstream 429 goes back to the client and leaves the account alone, whatever
// reset time or Retry-After comes with it.
func TestRateLimitDisablesOnlyWhenLimitIsUsedUp(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	reset := strconv.FormatInt(now.Add(3*time.Hour).Unix(), 10)
	far := strconv.FormatInt(now.Add(29*24*time.Hour).Unix(), 10)
	usage := func(fiveHour, week string, extra map[string]string) map[string]string {
		h := map[string]string{sourceHeader: "http",
			"anthropic-ratelimit-unified-5h-utilization": fiveHour, "anthropic-ratelimit-unified-5h-status": "allowed", "anthropic-ratelimit-unified-5h-reset": reset,
			"anthropic-ratelimit-unified-7d-utilization": week, "anthropic-ratelimit-unified-7d-status": "allowed", "anthropic-ratelimit-unified-7d-reset": reset,
			claimResetHeader: reset}
		for k, v := range extra {
			h[k] = v
		}
		return h
	}
	classify := func(h map[string]string) *pluginv1.ClassifyErrorResponse {
		out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: h,
			BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"some refusal"}}`)})
		require.NoError(t, err)
		return out
	}

	for name, h := range map[string]map[string]string{
		"room":                   usage("0.07", "0.27", nil),
		"room, retry after":      usage("0.07", "0.27", map[string]string{"retry-after": "604800"}),
		"room, claim names 7d":   usage("0.07", "0.27", map[string]string{claimHeader: "seven_day"}),
		"room, unified rejected": usage("0.07", "0.27", map[string]string{"anthropic-ratelimit-unified-status": "rejected", claimResetHeader: far}),
		"room, overage rejected": usage("0.07", "0.27", map[string]string{"anthropic-ratelimit-unified-overage-status": "rejected", "anthropic-ratelimit-unified-overage-reset": far}),
		"nothing":                {sourceHeader: "http"},
		"far reset":              {sourceHeader: "http", claimResetHeader: far},
		"retry after only":       {sourceHeader: "http", "retry-after": "10800"},
		"only 5h usage":          {sourceHeader: "http", "anthropic-ratelimit-unified-5h-utilization": "0.07", "retry-after": "10800"},
	} {
		t.Run("returned/"+name, func(t *testing.T) {
			out := classify(h)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.GetAccountEffect())
			require.Zero(t, out.GetCooldownUntilUnix())
			require.Nil(t, out.GetAutomaticState())
			require.Nil(t, out.GetQuota())
			require.Empty(t, out.GetClientMessage(), "the upstream body reaches the client unchanged")
		})
	}

	for name, h := range map[string]map[string]string{
		"7d full":                 usage("0.07", "1.0", map[string]string{claimHeader: "seven_day", "anthropic-ratelimit-unified-7d-status": "rejected"}),
		"5h full":                 usage("1.46", "0.27", map[string]string{claimHeader: "five_hour", "anthropic-ratelimit-unified-5h-status": "rejected"}),
		"7d over, no status":      usage("0.07", "1.03", nil),
		"7d rejected below 1":     usage("0.07", "0.97", map[string]string{"anthropic-ratelimit-unified-7d-status": "rejected"}),
		"claim without its usage": {sourceHeader: "http", claimHeader: "seven_day", claimResetHeader: reset, "anthropic-ratelimit-unified-5h-utilization": "0.07"},
		"unknown claim":           usage("0.07", "0.27", map[string]string{claimHeader: "seven_day_opus"}),
	} {
		t.Run("disabled/"+name, func(t *testing.T) {
			out := classify(h)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
			require.Equal(t, now.Add(3*time.Hour).Unix(), out.GetAutomaticState().GetUntilUnix())
		})
	}

	// A model-scoped limit is judged by its claim: the shared windows having
	// room says nothing about it.
	out := classify(usage("0.07", "0.27", map[string]string{claimHeader: "seven_day_overage_included"}))
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
	require.Nil(t, out.GetAutomaticState())
	require.Equal(t, "scoped quota rejected: 7d_fable", out.GetReason())

	// Only an upstream answer counts: without the marker the usual path runs.
	h := usage("0.07", "0.27", map[string]string{"retry-after": "10800"})
	delete(h, sourceHeader)
	require.Equal(t, now.Add(3*time.Hour).Unix(), classify(h).GetAutomaticState().GetUntilUnix())
}

// The answers as production saw them (2026-11-04 request logs).
func TestRateLimitProductionHeaders(t *testing.T) {
	now := time.Unix(1793758483, 0)
	p := &Plugin{now: func() time.Time { return now }}
	classify := func(msg string, h map[string]string) *pluginv1.ClassifyErrorResponse {
		h[sourceHeader] = "http"
		out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: h,
			BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"` + msg + `"}}`)})
		require.NoError(t, err)
		return out
	}
	exceeded := "This request would exceed your account's rate limit. Please try again later."

	out := classify(exceeded, map[string]string{
		"anthropic-ratelimit-unified-5h-reset": "1793774400", "anthropic-ratelimit-unified-5h-status": "rejected", "anthropic-ratelimit-unified-5h-utilization": "1.46",
		"anthropic-ratelimit-unified-7d-reset": "1794243600", "anthropic-ratelimit-unified-7d-status": "allowed", "anthropic-ratelimit-unified-7d-utilization": "0.4",
		"anthropic-ratelimit-unified-overage-status": "rejected", claimHeader: "five_hour", claimResetHeader: "1793774400", "anthropic-ratelimit-unified-status": "rejected",
		"retry-after": "15917", "x-should-retry": "true"})
	require.Equal(t, int64(1793774400), out.GetAutomaticState().GetUntilUnix(), "5h full")

	out = classify(exceeded, map[string]string{
		"anthropic-ratelimit-unified-5h-reset": "1793770000", "anthropic-ratelimit-unified-5h-status": "allowed", "anthropic-ratelimit-unified-5h-utilization": "0.07",
		"anthropic-ratelimit-unified-7d-reset": "1793898000", "anthropic-ratelimit-unified-7d-status": "rejected", "anthropic-ratelimit-unified-7d-utilization": "1.0",
		claimHeader: "seven_day", claimResetHeader: "1793898000", "anthropic-ratelimit-unified-status": "rejected", "retry-after": "139517"})
	require.Equal(t, int64(1793898000), out.GetAutomaticState().GetUntilUnix(), "7d full")

	out = classify("Usage credits are required for long context requests.", map[string]string{
		"anthropic-ratelimit-unified-credits-can-purchase": "true", "anthropic-ratelimit-unified-credits-exhausted-included": "false",
		"anthropic-ratelimit-unified-credits-has-payment-method": "false", "anthropic-ratelimit-unified-overage-disabled-reason": "org_level_disabled",
		claimResetHeader: "1796083200", "x-should-retry": "false"})
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.GetAction(), "long context")
	require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.GetAccountEffect())
	require.Nil(t, out.GetAutomaticState())
	require.Nil(t, out.GetQuota())
}
