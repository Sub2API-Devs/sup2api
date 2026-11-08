package codex

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/classify"
)

// Cooldowns (docs/PLUGIN-CODEX.md §4).
const (
	// usageCooldown is the cooldown of a usage limit whose reset is unknown.
	usageCooldown = 5 * time.Minute
	// authCooldown keeps an account whose access token was refused out of
	// scheduling while the core renews the token (refresh, CONTRACTS §48).
	authCooldown = 5 * time.Minute
	// unavailableCooldown is the short backoff of the plan service being
	// temporarily unavailable.
	unavailableCooldown = 30 * time.Second
)

// Sign in with ChatGPT error codes (structured Responses errors).
const (
	codeSharingLimit       = "subscription_sharing_usage_limit_exceeded"
	codeSharingUnavailable = "subscription_sharing_usage_unavailable"
	codeSharingUserUnavail = "subscription_sharing_user_unavailable"
	codeSharingNotEligible = "subscription_sharing_user_not_eligible"
	codeSharingUnsupported = "subscription_sharing_unsupported_capability"
	codeSharingRoute       = "subscription_sharing_route_not_supported"
	codeSharingInvalidUser = "subscription_sharing_invalid_user"
	codeChatpassScope      = "chatpass_v2_scope_not_authorized"
	codeChatpassInvalidCtx = "chatpass_v2_invalid_authorization_context"
	codeCodexUsageLimit    = "usage_limit_reached"
	reauthorizeHint        = "; refresh the token or authorize the account again / 请刷新令牌或重新授权"
)

// hasCode matches an upstream error whose code or type is one of codes (the
// Codex backend reports usage_limit_reached as the error type).
func hasCode(codes ...string) classify.Match {
	return func(in *classify.Input) bool {
		for _, c := range codes {
			if in.Error.Code == c || in.Error.Type == c {
				return true
			}
		}
		return false
	}
}

// Policy classifies the failures of both account types. The first matching
// rule wins; an unmatched 4xx is the client's request and is returned as is.
var Policy = classify.Policy{
	Parse:     parseError,
	ErrorType: errorType,
	Detail:    classify.DetailCodeMessage,
	Rules: []classify.Rule{
		// A CDN / WAF page is not the account's fault.
		classify.EdgeBlock(),
		// Sign in with ChatGPT plan errors.
		{When: hasCode(codeSharingLimit), Effect: classify.Cooldown, Until: usageReset, Reason: "ChatGPT plan usage limit reached"},
		{When: hasCode(codeSharingUnavailable, codeSharingUserUnavail), Effect: classify.Cooldown, Cooldown: unavailableCooldown, Reason: "ChatGPT plan usage temporarily unavailable (%d)"},
		{When: hasCode(codeSharingNotEligible, codeChatpassScope, codeChatpassInvalidCtx), Effect: classify.Disable, Reason: "the ChatGPT account cannot use its plan here (%d); authorize it again or check the plan"},
		{When: hasCode(codeSharingUnsupported, codeSharingRoute), Return: true},
		{When: hasCode(codeSharingInvalidUser), Effect: classify.Cooldown, Cooldown: authCooldown, Reason: "upstream rejected the ChatGPT user (%d)" + reauthorizeHint},
		// The Codex backend's plan limit, which says when it resets.
		{When: hasCode(codeCodexUsageLimit), Effect: classify.Cooldown, Until: usageReset, Reason: "Codex usage limit reached"},
		// A refused access token: usually expired; the core renews it.
		{When: classify.Status(http.StatusUnauthorized), Effect: classify.Cooldown, Cooldown: authCooldown, Reason: "upstream rejected the access token (%d)" + reauthorizeHint},
		// Other 403s with a vendor error body: the account may not use this.
		{When: classify.Status(http.StatusForbidden), Effect: classify.Disable, Reason: "upstream refused the account (%d)"},
		{When: classify.Status(http.StatusTooManyRequests), Effect: classify.Cooldown, Until: usageReset, Reason: "rate limited"},
		classify.ServerErrors(10 * time.Second),
	},
}

// ClassifyError implements pluginsdk.Platform. The upstream error code is
// passed on to the client (client_error_code) when it is a plain code.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	resp := Policy.Classify(p.now(), in)
	if in.GetStatus() != 0 {
		e := parseError(in.GetBodyPrefix())
		code := e.Code
		if code == "" && e.Type == codeCodexUsageLimit {
			code = e.Type
		}
		if clientCode.MatchString(code) {
			resp.ClientErrorCode = code
		}
	}
	return resp, nil
}

// clientCode is the shape the host accepts for client_error_code.
var clientCode = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$`)

// parseError reads an OpenAI-style error body ({"error":{"message","type",
// "code"}}), a WebSocket error event carrying the same object, a plain
// {"error":"..."} or a {"detail":"..."} answer.
func parseError(body []byte) classify.Error {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return classify.Error{}
	}
	e := gjson.GetBytes(body, "error")
	switch {
	case e.IsObject():
		return classify.Error{Message: e.Get("message").String(), Type: e.Get("type").String(), Code: e.Get("code").String()}
	case e.Type == gjson.String:
		return classify.Error{Message: e.String()}
	}
	if d := gjson.GetBytes(body, "detail"); d.Type == gjson.String {
		return classify.Error{Message: d.String()}
	}
	return classify.Error{Message: gjson.GetBytes(body, "message").String(), Code: gjson.GetBytes(body, "code").String()}
}

func errorType(in *classify.Input) string {
	switch {
	case in.Status == http.StatusUnauthorized:
		return "authentication_error"
	case in.Status == http.StatusForbidden:
		return "permission_error"
	case in.Status == http.StatusTooManyRequests:
		return "rate_limit_error"
	case in.Status == 0 || in.Status >= 500:
		return "server_error"
	case in.Error.Type != "" && strings.HasSuffix(in.Error.Type, "_error"):
		return in.Error.Type
	default:
		return "invalid_request_error"
	}
}

// usageReset works out when a usage-limited account may be used again:
// the body's resets_at (Unix seconds, or milliseconds) or resets_in_seconds,
// in the error object or at the top level; then retry-after(-ms); otherwise
// 5 minutes.
func usageReset(in *classify.Input) (time.Time, string, bool) {
	for _, path := range []string{"error.resets_at", "resets_at"} {
		if r := gjson.GetBytes(in.Body, path); r.Exists() {
			if v := r.Float(); v > 0 {
				if v > 1e11 {
					v /= 1000
				}
				return time.Unix(int64(v), 0), "resets_at", true
			}
		}
	}
	for _, path := range []string{"error.resets_in_seconds", "resets_in_seconds"} {
		if r := gjson.GetBytes(in.Body, path); r.Exists() && r.Float() > 0 {
			return in.Now.Add(time.Duration(r.Float() * float64(time.Second))), "resets_in_seconds", true
		}
	}
	if t, src, ok := classify.RetryAfter(in); ok {
		return t, src, true
	}
	return in.Now.Add(usageCooldown), "default 5m", true
}
