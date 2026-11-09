package codex

import (
	"context"
	"net/http"
	"regexp"
	"slices"
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
	// serverErrorCooldown is the cooldown of a 408 / 5xx / transport failure.
	serverErrorCooldown = 10 * time.Second
)

// resetsAtMillis: a resets_at above this is Unix milliseconds, not seconds
// (1e11 seconds is the year 5138; 1e11 milliseconds is 1973).
const resetsAtMillis = 1e11

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
	// reauthorizeHint ends the reason of a refused token. Reasons are plain
	// English, like the SDK's own (classify).
	reauthorizeHint = "; refresh the token or authorize the account again"
)

// hasCode matches an upstream error whose code or type is one of codes (the
// Codex backend reports usage_limit_reached as the error type).
func hasCode(codes ...string) classify.Match {
	return classify.Any(classify.CodeIn(codes...), typeIn(codes...))
}

// typeIn matches an upstream error whose type is one of types (the SDK
// matches codes only, classify.CodeIn).
func typeIn(types ...string) classify.Match {
	return func(in *classify.Input) bool { return slices.Contains(types, in.Error.Type) }
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
		// A used-up Codex usage window (5 h or weekly): the account is
		// disabled until the window resets (ClassifyError adds the
		// automatic state), the request moves to another account.
		{When: windowFull, Effect: classify.Cooldown, Until: windowReset, Reason: usageLimitReason},
		// A refused access token: usually expired; the core renews it.
		{When: classify.Status(http.StatusUnauthorized), Effect: classify.Cooldown, Cooldown: authCooldown, Reason: "upstream rejected the access token (%d)" + reauthorizeHint},
		// Other 403s with a vendor error body: the account may not use this.
		{When: classify.Status(http.StatusForbidden), Effect: classify.Disable, Reason: "upstream refused the account (%d)"},
		// Any other 429 goes back to the client as is: no cooldown, no
		// disable (only a used-up 5 h / weekly window takes an account out).
		{When: classify.Status(http.StatusTooManyRequests), Return: true, Reason: "upstream 429 without a used-up usage window"},
		classify.ServerErrors(serverErrorCooldown),
	},
}

// ClassifyError implements pluginsdk.Platform. The upstream error code is
// passed on to the client (client_error_code) when it is a plain code.
//
// A used-up usage window (windowFull) disables the account until the window
// resets: automatic_state DISABLE with the release time, which the core
// applies with or without a published failure policy (CONTRACTS §69) and
// undoes by itself at that time; the cooldown to the same time is the
// fallback where the account may not be disabled. The x-codex-* windows of
// any error answer go with it as a quota observation (CONTRACTS §44.7); the
// core stores one only for types declaring modelAvailability, which this
// plugin does not, so today the usage query (quota.go) is what fills the
// snapshot.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	now := p.now()
	resp := Policy.Classify(now, in)
	if in.GetStatus() != 0 {
		if ws := headerWindows(lowerHeaders(in.GetHeaders()), now); len(ws) > 0 {
			resp.Quota = quotaResult(now, ws)
		}
		if strings.HasPrefix(resp.GetReason(), usageLimitReason+" until ") && resp.GetCooldownUntilUnix() > now.Unix() {
			resp.AutomaticState = &pluginv1.AccountAutomaticState{
				Action:  pluginv1.AccountAutomaticState_ACTION_DISABLE,
				Reason:  resp.GetReason(),
				Release: &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: resp.GetCooldownUntilUnix()},
			}
		}
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

// usageLimitReason starts the reason of a used-up usage window.
const usageLimitReason = "Codex usage limit reached"

// windowFull reports whether the failure is a used-up usage window: the
// Codex backend's usage_limit_reached error (any status), or a 429 whose
// x-codex-* headers show the 5 h or the weekly window at 100 %. Other
// windows (an unknown length) and reset times alone do not count.
func windowFull(in *classify.Input) bool {
	if hasCode(codeCodexUsageLimit)(in) {
		return true
	}
	if in.Status != http.StatusTooManyRequests {
		return false
	}
	for _, w := range headerWindows(in.Headers, in.Now) {
		if (w.Key == QuotaKey5h || w.Key == QuotaKey7d) && w.full() {
			return true
		}
	}
	return false
}

// windowReset works out when a used-up window resets: the body's reset
// (bodyReset); then the latest reset of the used-up 5 h / weekly windows in
// the x-codex-* headers; then retry-after(-ms); otherwise usageCooldown.
func windowReset(in *classify.Input) (time.Time, string, bool) {
	if t, src, ok := bodyReset(in); ok {
		return t, src, true
	}
	var latest int64
	for _, w := range headerWindows(in.Headers, in.Now) {
		if (w.Key == QuotaKey5h || w.Key == QuotaKey7d) && w.full() && w.ResetAt > latest {
			latest = w.ResetAt
		}
	}
	if latest > in.Now.Unix() {
		return time.Unix(latest, 0), "x-codex window reset", true
	}
	if t, src, ok := classify.RetryAfter(in); ok {
		return t, src, true
	}
	return in.Now.Add(usageCooldown), "default " + usageCooldown.String(), true
}

// lowerHeaders lower-cases header names and trims values (the core already
// sends them lower-cased).
func lowerHeaders(h map[string]string) map[string]string {
	out := make(map[string]string, len(h))
	for k, v := range h {
		out[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	return out
}

// usageReset works out when a usage-limited account may be used again:
// the body's reset (bodyReset); then retry-after(-ms); otherwise
// usageCooldown.
func usageReset(in *classify.Input) (time.Time, string, bool) {
	if t, src, ok := bodyReset(in); ok {
		return t, src, true
	}
	if t, src, ok := classify.RetryAfter(in); ok {
		return t, src, true
	}
	return in.Now.Add(usageCooldown), "default " + usageCooldown.String(), true
}

// bodyReset reads the body's resets_at (Unix seconds, or milliseconds) or
// resets_in_seconds, in the error object or at the top level.
func bodyReset(in *classify.Input) (time.Time, string, bool) {
	for _, path := range []string{"error.resets_at", "resets_at"} {
		if r := gjson.GetBytes(in.Body, path); r.Exists() {
			if v := r.Float(); v > 0 {
				if v > resetsAtMillis {
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
	return time.Time{}, "", false
}
