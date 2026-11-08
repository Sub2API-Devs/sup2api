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
		{name: "plain 429", status: 429, body: `{"error":{"message":"slow down"}}`,
			action: fail, effect: cool, until: now + 300},
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
