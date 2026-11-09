package codex

import (
	"context"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestClassifyError(t *testing.T) {
	p := newTestPlugin(DefaultEndpoints)
	now := testNow.Unix()
	const (
		ret     = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
		fail    = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		none    = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED
		cool    = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		disable = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
	)
	for _, tc := range []struct {
		name      string
		status    int32
		headers   map[string]string
		body      string
		transport string
		action    pluginv1.ClassifyErrorResponse_Action
		effect    pluginv1.ClassifyErrorResponse_AccountEffect
		until     int64 // 0 = not checked
		code      string
		reason    string // substring
	}{
		{name: "codex usage limit resets_at", status: 429,
			body:   `{"error":{"type":"usage_limit_reached","message":"The usage limit has been reached","plan_type":"plus","resets_at":1800007200,"resets_in_seconds":7200}}`,
			action: fail, effect: cool, until: 1800007200, code: "usage_limit_reached", reason: "Codex usage limit reached"},
		{name: "codex usage limit resets_in_seconds", status: 429,
			body:   `{"error":{"type":"usage_limit_reached","message":"limit","resets_in_seconds":600}}`,
			action: fail, effect: cool, until: now + 600},
		{name: "codex usage limit milliseconds", status: 429,
			body:   `{"error":{"type":"usage_limit_reached","resets_at":1800003600000}}`,
			action: fail, effect: cool, until: 1800003600},
		{name: "codex usage limit without reset", status: 429,
			body:   `{"error":{"type":"usage_limit_reached","message":"limit"}}`,
			action: fail, effect: cool, until: now + 300},
		{name: "siwc limit uses retry-after", status: 429, headers: map[string]string{"retry-after": "120"},
			body:   `{"error":{"code":"subscription_sharing_usage_limit_exceeded","message":"Plan usage limit reached","type":"rate_limit_error"}}`,
			action: fail, effect: cool, until: now + 120, code: "subscription_sharing_usage_limit_exceeded", reason: "ChatGPT plan usage limit reached"},
		{name: "siwc limit default", status: 429,
			body:   `{"error":{"code":"subscription_sharing_usage_limit_exceeded","message":"limit"}}`,
			action: fail, effect: cool, until: now + 300},
		{name: "plain 429 goes back to the client", status: 429, body: `{"error":{"message":"slow down","code":"rate_limit_exceeded"}}`,
			action: ret, effect: none, code: "rate_limit_exceeded", reason: "without a used-up usage window"},
		{name: "429 with windows below 100 goes back", status: 429, headers: map[string]string{
			"x-codex-primary-used-percent": "99.5", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-at": "1800003600",
			"x-codex-secondary-used-percent": "40", "x-codex-secondary-window-minutes": "10080"},
			body: `{"error":{"message":"slow down"}}`, action: ret, effect: none},
		{name: "429 with a full window of another length goes back", status: 429, headers: map[string]string{
			"x-codex-primary-used-percent": "100", "x-codex-primary-window-minutes": "1440"},
			body: `{"error":{"message":"slow down"}}`, action: ret, effect: none},
		{name: "429 with a full 5h header window", status: 429, headers: map[string]string{
			"x-codex-primary-used-percent": "100", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-after-seconds": "1200",
			"x-codex-secondary-used-percent": "30", "x-codex-secondary-window-minutes": "10080", "x-codex-secondary-reset-after-seconds": "86400"},
			body: `{"error":{"message":"slow down"}}`, action: fail, effect: cool, until: now + 1200, reason: "Codex usage limit reached"},
		{name: "429 with a full weekly window in the primary slot", status: 429, headers: map[string]string{
			"X-Codex-Primary-Used-Percent": "100.0", "X-Codex-Primary-Window-Minutes": "10080", "X-Codex-Primary-Reset-At": "1800090000",
			"X-Codex-Secondary-Used-Percent": "12", "X-Codex-Secondary-Window-Minutes": "300", "X-Codex-Secondary-Reset-At": "1800001000"},
			body: `{"error":{"message":"slow down"}}`, action: fail, effect: cool, until: 1800090000},
		{name: "usage limit body reset wins over headers", status: 429, headers: map[string]string{
			"x-codex-primary-used-percent": "100", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-at": "1800001000"},
			body:   `{"error":{"type":"usage_limit_reached","resets_at":1800002000}}`,
			action: fail, effect: cool, until: 1800002000},
		{name: "usage limit reset clamped to a week", status: 429,
			body:   `{"error":{"type":"usage_limit_reached","resets_in_seconds":2000000}}`,
			action: fail, effect: cool, until: now + 7*24*3600},
		{name: "siwc unavailable", status: 503,
			body:   `{"error":{"code":"subscription_sharing_usage_unavailable","message":"try later"}}`,
			action: fail, effect: cool, until: now + 30, code: "subscription_sharing_usage_unavailable"},
		{name: "siwc user unavailable", status: 503,
			body:   `{"error":{"code":"subscription_sharing_user_unavailable"}}`,
			action: fail, effect: cool, until: now + 30},
		{name: "siwc not eligible", status: 403,
			body:   `{"error":{"code":"subscription_sharing_user_not_eligible","message":"not eligible"}}`,
			action: fail, effect: disable, code: "subscription_sharing_user_not_eligible"},
		{name: "chatpass scope", status: 403, body: `{"error":{"code":"chatpass_v2_scope_not_authorized"}}`,
			action: fail, effect: disable},
		{name: "chatpass context", status: 403, body: `{"error":{"code":"chatpass_v2_invalid_authorization_context"}}`,
			action: fail, effect: disable},
		{name: "siwc unsupported capability", status: 400,
			body:   `{"error":{"code":"subscription_sharing_unsupported_capability","message":"temperature is not supported"}}`,
			action: ret, effect: none, code: "subscription_sharing_unsupported_capability"},
		{name: "siwc route", status: 403, body: `{"error":{"code":"subscription_sharing_route_not_supported"}}`,
			action: ret, effect: none},
		{name: "siwc invalid user", status: 401, body: `{"error":{"code":"subscription_sharing_invalid_user"}}`,
			action: fail, effect: cool, until: now + 300, reason: "authorize the account again"},
		{name: "401 token", status: 401, body: `{"detail":"Unauthorized"}`,
			action: fail, effect: cool, until: now + 300, reason: "authorize the account again"},
		{name: "403 edge page", status: 403, headers: map[string]string{"content-type": "text/html"}, body: `<!DOCTYPE html><title>Just a moment...</title>`,
			action: fail, effect: none},
		{name: "403 json", status: 403, body: `{"error":{"message":"forbidden"}}`,
			action: fail, effect: disable},
		{name: "server error", status: 502, body: `bad gateway`, action: fail, effect: cool, until: now + 10},
		{name: "bad request", status: 400, body: `{"error":{"message":"Unsupported parameter: foo","type":"invalid_request_error","code":"unsupported_parameter"}}`,
			action: ret, effect: none, code: "unsupported_parameter"},
		{name: "websocket error event", status: 429,
			body:   `{"type":"error","status":429,"error":{"type":"usage_limit_reached","resets_in_seconds":60}}`,
			action: fail, effect: cool, until: now + 60},
		{name: "transport", status: 0, transport: "connection reset", action: fail, effect: cool, until: now + 10},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
				Meta: &pluginv1.RequestMeta{Protocol: ProtocolResponses}, Status: tc.status, Headers: tc.headers,
				BodyPrefix: []byte(tc.body), TransportError: tc.transport,
			})
			if err != nil {
				t.Fatal(err)
			}
			if r.GetAction() != tc.action || r.GetAccountEffect() != tc.effect {
				t.Fatalf("action/effect = %v %v, want %v %v (%s)", r.GetAction(), r.GetAccountEffect(), tc.action, tc.effect, r.GetReason())
			}
			if tc.until != 0 && r.GetCooldownUntilUnix() != tc.until {
				t.Fatalf("cooldown until %s, want %s (%s)", time.Unix(r.GetCooldownUntilUnix(), 0).UTC(), time.Unix(tc.until, 0).UTC(), r.GetReason())
			}
			if tc.code != "" && r.GetClientErrorCode() != tc.code {
				t.Fatalf("client code = %q, want %q", r.GetClientErrorCode(), tc.code)
			}
			if !strings.Contains(r.GetReason(), tc.reason) {
				t.Fatalf("reason = %q, want %q", r.GetReason(), tc.reason)
			}
		})
	}
}

// TestClassifyUsageWindowDisables checks that a used-up window disables the
// account until it resets (automatic state, CONTRACTS §69) and reports the
// header windows as a quota observation, while other 429s leave the account
// alone.
func TestClassifyUsageWindowDisables(t *testing.T) {
	p := newTestPlugin(DefaultEndpoints)
	now := testNow.Unix()
	classifyErr := func(status int32, headers map[string]string, body string) *pluginv1.ClassifyErrorResponse {
		t.Helper()
		r, err := p.ClassifyError(context.Background(), &pluginv1.ClassifyErrorRequest{
			Meta: &pluginv1.RequestMeta{Protocol: ProtocolResponses}, Account: account(TypeDevice, `{}`),
			Status: status, Headers: headers, BodyPrefix: []byte(body),
		})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}

	t.Run("usage_limit_reached", func(t *testing.T) {
		r := classifyErr(429, map[string]string{
			"x-codex-primary-used-percent": "100", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-at": "1800007200",
			"x-codex-secondary-used-percent": "64.5", "x-codex-secondary-window-minutes": "10080", "x-codex-secondary-reset-after-seconds": "86400",
		}, `{"error":{"type":"usage_limit_reached","message":"The usage limit has been reached","resets_at":1800007200}}`)
		st := r.GetAutomaticState()
		if st.GetAction() != pluginv1.AccountAutomaticState_ACTION_DISABLE || st.GetUntilUnix() != 1800007200 ||
			!strings.HasPrefix(st.GetReason(), "Codex usage limit reached until ") {
			t.Fatalf("automatic state = %+v", st)
		}
		if r.GetCooldownUntilUnix() != 1800007200 || r.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER {
			t.Fatalf("cooldown/action = %d %v", r.GetCooldownUntilUnix(), r.GetAction())
		}
		ws := r.GetQuota().GetWindows()
		if len(ws) != 2 {
			t.Fatalf("quota = %+v", r.GetQuota())
		}
		if w := ws[0]; w.GetKey() != "5h" || w.GetUtilization() != 100 || w.GetStatus() != "rejected" || w.GetResetsAtUnix() != 1800007200 {
			t.Fatalf("5h = %+v", w)
		}
		if w := ws[1]; w.GetKey() != "7d" || w.GetUtilization() != 64.5 || w.GetStatus() != "" || w.GetResetsAtUnix() != now+86400 {
			t.Fatalf("7d = %+v", w)
		}
	})

	t.Run("usage_limit_reached without headers", func(t *testing.T) {
		r := classifyErr(429, nil, `{"error":{"type":"usage_limit_reached","resets_in_seconds":600}}`)
		if r.GetAutomaticState().GetUntilUnix() != now+600 || r.GetQuota() != nil {
			t.Fatalf("automatic state = %+v quota = %+v", r.GetAutomaticState(), r.GetQuota())
		}
	})

	t.Run("other 429", func(t *testing.T) {
		r := classifyErr(429, map[string]string{"x-codex-primary-used-percent": "20", "x-codex-primary-window-minutes": "300"},
			`{"error":{"message":"Too many requests"}}`)
		if r.GetAutomaticState() != nil || r.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED ||
			r.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT || r.GetCooldownUntilUnix() != 0 {
			t.Fatalf("other 429 = %+v", r)
		}
		// The windows still go with it, none marked rejected.
		if ws := r.GetQuota().GetWindows(); len(ws) != 1 || ws[0].GetKey() != "5h" || ws[0].GetStatus() != "" {
			t.Fatalf("quota = %+v", r.GetQuota())
		}
	})

	t.Run("siwc limit stays a cooldown", func(t *testing.T) {
		r := classifyErr(429, nil, `{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}`)
		if r.GetAutomaticState() != nil || r.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN {
			t.Fatalf("siwc limit = %+v", r)
		}
	})
}
