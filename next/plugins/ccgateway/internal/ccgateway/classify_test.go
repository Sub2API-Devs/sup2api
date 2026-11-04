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
				Headers:    map[string]string{sourceHeader: "http", "retry-after": retryAfter},
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

// A long context request refused for lack of usage credits says nothing about
// the account: whatever reset headers come with it, the account stays usable.
func TestLongContextCreditsRequiredLeavesAccountAlone(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	reset := strconv.FormatInt(now.Add(29*24*time.Hour).Unix(), 10)
	for _, tc := range []struct {
		name    string
		headers map[string]string
	}{
		{"no limit headers", map[string]string{sourceHeader: "http"}},
		{"far reset on the unified limit", map[string]string{sourceHeader: "http",
			"anthropic-ratelimit-unified-status": "rejected", "anthropic-ratelimit-unified-reset": reset,
			"anthropic-ratelimit-unified-representative-claim": "seven_day"}},
		{"retry after", map[string]string{sourceHeader: "http", "retry-after": "604800"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: tc.headers,
				BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"Usage credits are required for long context requests."}}`),
			})
			require.NoError(t, err)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, out.GetAccountEffect())
			require.Zero(t, out.GetCooldownUntilUnix())
			require.Nil(t, out.GetAutomaticState())
			require.Nil(t, out.GetQuota())
		})
	}
}

// Only a window that is really full disables the account: a 429 whose own usage
// headers show room gets a short cooldown, whatever reset times come with it.
func TestRateLimitDisablesOnlyWhenWindowIsFull(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	p := &Plugin{now: func() time.Time { return now }}
	reset := now.Add(3 * time.Hour)
	far := strconv.FormatInt(now.Add(29*24*time.Hour).Unix(), 10)
	usage := func(fiveHour, week string, extra map[string]string) map[string]string {
		h := map[string]string{sourceHeader: "http",
			"anthropic-ratelimit-unified-5h-utilization": fiveHour, "anthropic-ratelimit-unified-5h-status": "allowed",
			"anthropic-ratelimit-unified-7d-utilization": week, "anthropic-ratelimit-unified-7d-status": "allowed",
			"anthropic-ratelimit-unified-7d-reset": strconv.FormatInt(reset.Unix(), 10),
			"anthropic-ratelimit-unified-5h-reset": strconv.FormatInt(reset.Unix(), 10),
			claimResetHeader:                       strconv.FormatInt(reset.Unix(), 10)}
		for k, v := range extra {
			h[k] = v
		}
		return h
	}
	classify := func(h map[string]string) *pluginv1.ClassifyErrorResponse {
		out, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{Account: &pluginv1.Account{Type: AccountTypeManaged}, Status: 429, Headers: h,
			BodyPrefix: []byte(`{"type":"error","error":{"type":"rate_limit_error","message":"some other refusal"}}`)})
		require.NoError(t, err)
		return out
	}

	for name, tc := range map[string]struct {
		extra    map[string]string
		cooldown time.Duration
	}{
		"plain":             {nil, defaultRateLimitCooldown},
		"short retry after": {map[string]string{"retry-after": "5"}, 5 * time.Second},
		"long retry after":  {map[string]string{"retry-after": "604800"}, defaultRateLimitCooldown},
		"claim names 7d":    {map[string]string{claimHeader: "seven_day"}, defaultRateLimitCooldown},
		"far unified reset": {map[string]string{"anthropic-ratelimit-unified-status": "rejected", claimResetHeader: far}, defaultRateLimitCooldown},
		"overage rejected":  {map[string]string{"anthropic-ratelimit-unified-overage-status": "rejected", "anthropic-ratelimit-unified-overage-reset": far}, defaultRateLimitCooldown},
	} {
		t.Run("room/"+name, func(t *testing.T) {
			out := classify(usage("0.07", "0.27", tc.extra))
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACTION_FAILOVER, out.GetAction())
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, out.GetAccountEffect())
			require.Equal(t, now.Add(tc.cooldown).Unix(), out.GetCooldownUntilUnix())
			require.Nil(t, out.GetAutomaticState())
			require.Nil(t, out.GetQuota())
		})
	}

	for name, h := range map[string]map[string]string{
		"7d full":     usage("0.07", "1.0", map[string]string{claimHeader: "seven_day", "anthropic-ratelimit-unified-7d-status": "rejected"}),
		"5h full":     usage("1.0", "0.27", map[string]string{claimHeader: "five_hour", "anthropic-ratelimit-unified-5h-status": "rejected"}),
		"7d over":     usage("0.07", "1.03", nil),
		"7d rejected": usage("0.07", "0.97", map[string]string{"anthropic-ratelimit-unified-7d-status": "rejected"}),
		"no 7d usage": {sourceHeader: "http", "anthropic-ratelimit-unified-5h-utilization": "0.07", "retry-after": "10800"},
		"no usage":    {sourceHeader: "http", "retry-after": "10800"},
	} {
		t.Run("disable/"+name, func(t *testing.T) {
			out := classify(h)
			require.Equal(t, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, out.GetAccountEffect())
			require.Equal(t, reset.Unix(), out.GetAutomaticState().GetUntilUnix())
		})
	}

	// A model-scoped limit is judged by its claim: the shared windows having
	// room says nothing about it.
	out := classify(usage("0.07", "0.27", map[string]string{claimHeader: "seven_day_overage_included"}))
	require.Nil(t, out.GetAutomaticState())
	require.Equal(t, "scoped quota rejected: 7d_fable", out.GetReason())

	// Only an upstream answer counts: without the marker the usual path runs.
	h := usage("0.07", "0.27", map[string]string{"retry-after": "10800"})
	delete(h, sourceHeader)
	require.Equal(t, reset.Unix(), classify(h).GetAutomaticState().GetUntilUnix())
}
