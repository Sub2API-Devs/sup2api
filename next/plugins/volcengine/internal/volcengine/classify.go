package volcengine

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Cooldown defaults.
const (
	defaultRateLimitCooldown = 60 * time.Second
	// transientCooldown is used for server errors and for Ark's "come back
	// in a moment" 429s (ServerOverloaded, ModelLoadingError).
	transientCooldown = 10 * time.Second
	maxCooldown       = 7 * 24 * time.Hour
)

// OpenAI error types. The account type serves the built-in openai platform,
// whose errorFormat is "openai", so the type reported to the client is an
// OpenAI one derived from the status; Ark's own type field ("Unauthorized",
// "BadRequest", "TooManyRequests") is an HTTP phrase that OpenAI SDKs do not
// recognise, and its code goes into the reason instead.
const (
	errInvalidRequest = "invalid_request_error"
	errAuthentication = "authentication_error"
	errPermission     = "permission_error"
	errRateLimit      = "rate_limit_error"
	errServer         = "server_error"
)

// Anthropic's error vocabulary differs from OpenAI's in two of the values this
// plugin can produce, and the gateway uses a plugin's type VERBATIM when it is
// set (it only derives the right vocabulary itself when the plugin said
// nothing). So on the Anthropic surface the OpenAI words would reach the
// client as-is: "server_error" is not an Anthropic type at all, and a 404
// carries its own name there rather than being folded into invalid_request.
const (
	errAnthropicAPI      = "api_error"
	errAnthropicNotFound = "not_found_error"
)

// Ark error codes (火山方舟 公共错误码) that need more than their HTTP
// status. The codes handled by the status alone are AuthenticationError
// (401), AccessDenied (403), MissingParameter / InvalidParameter (400),
// InvalidEndpoint.NotFound (404), RateLimitExceeded.Endpoint{RPM,TPM}Exceeded
// and ModelAccount{Rpm,Tpm}RateLimitExceeded (429) and InternalServiceError
// (500).
const (
	codeAccountOverdue = "AccountOverdueError" // 403, account in arrears
	codeQuotaExceeded  = "QuotaExceeded"       // 429, free trial quota used up
	codeModelLoading   = "ModelLoadingError"   // 429, model is warming up
	codeOverloaded     = "ServerOverloaded"    // 429, upstream saturated
	codeBurstTooFast   = "RequestBurstTooFast" // 429, traffic ramped up too fast
	// codeModelNotOpen (404) and codeClosedEndpoint (400) are account state,
	// not client mistakes: see isAccountResource.
	codeModelNotOpen   = "ModelNotOpen"
	codeClosedEndpoint = "InvalidEndpoint.ClosedEndpoint"
)

// errorTypeForStatus maps an HTTP status to an OpenAI error type. 404 is
// invalid_request_error, as OpenAI itself reports an unknown model.
func errorTypeForStatus(code int) string {
	switch {
	case code == http.StatusUnauthorized:
		return errAuthentication
	case code == http.StatusForbidden:
		return errPermission
	case code == http.StatusTooManyRequests:
		return errRateLimit
	case code == 0 || code >= 500:
		return errServer
	default:
		return errInvalidRequest
	}
}

// errorTypeFor translates a status into the vocabulary of the protocol the
// client spoke. Every surface this plugin serves but one is OpenAI-shaped; the
// Anthropic one needs its own two words (see the constants above).
func errorTypeFor(protocol string, code int) string {
	t := errorTypeForStatus(code)
	if protocol != ProtocolMessages && protocol != ProtocolCountTokens {
		return t
	}
	switch {
	case t == errServer:
		return errAnthropicAPI
	case code == http.StatusNotFound:
		return errAnthropicNotFound
	default:
		// invalid_request_error, authentication_error, permission_error and
		// rate_limit_error are spelled the same in both vocabularies.
		return t
	}
}

// upstreamError is the relevant part of an Ark error body
// {"error": {"message", "code", "param", "type"}}.
type upstreamError struct {
	Message, Code string
}

func parseError(body []byte) upstreamError {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return upstreamError{}
	}
	e := gjson.GetBytes(body, "error")
	if e.Type == gjson.String { // some compatible relays answer {"error": "message"}
		return upstreamError{Message: e.String()}
	}
	return upstreamError{
		Message: e.Get("message").String(),
		Code:    e.Get("code").String(),
	}
}

// isAccountResource reports whether the code means "this account cannot
// serve this model", as opposed to "the model does not exist": the model was
// never enabled on the account (Ark enables models one by one) or the
// inference endpoint behind it was closed. Another account of the group may
// well have it, so the request fails over without punishing this account.
func isAccountResource(code string) bool {
	return code == codeModelNotOpen || code == codeClosedEndpoint ||
		strings.HasPrefix(code, "InvalidEndpointOrModel")
}

// ClassifyError implements pluginsdk.Platform:
//   - transport errors, 408 and 5xx: fail over, cool the account down 10 s;
//   - 401 and 403: fail over, disable the account (bad key, revoked,
//     no permission, account in arrears);
//   - 429 QuotaExceeded: fail over, disable the account (the free trial
//     quota is used up; waiting does not help, the model must be opened);
//   - 429 ServerOverloaded / ModelLoadingError / RequestBurstTooFast: fail
//     over, cool down 10 s;
//   - other 429: fail over, cool down until retry-after (default 60 s);
//   - ModelNotOpen and a closed endpoint: fail over with no account effect,
//     another account of the group may have the model enabled;
//   - 404 and the other 4xx: the client's fault, returned as-is.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	now := p.now()
	code := int(in.GetStatus())
	ue := parseError(in.GetBodyPrefix())
	resp := &pluginv1.ClassifyErrorResponse{
		ClientErrorType: errorTypeFor(in.GetMeta().GetProtocol(), code),
		ClientMessage:   ue.Message,
	}

	// reasonText names the Ark code so the console shows why an account was
	// cooled down or disabled.
	reasonText := func(s string) string {
		if ue.Code != "" {
			s += " [" + ue.Code + "]"
		}
		if ue.Message != "" {
			s += ": " + truncate(ue.Message, 200)
		}
		return s
	}
	cooldown := func(d time.Duration, reason string) {
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		resp.CooldownUntilUnix = now.Add(d).Unix()
		resp.Reason = reason
	}
	disable := func(reason string) {
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
		resp.Reason = reasonText(reason)
	}

	switch {
	case code == 0:
		cooldown(transientCooldown, "transport error: "+truncate(in.GetTransportError(), 200))
		resp.ClientStatus = http.StatusBadGateway
		if resp.ClientMessage == "" {
			resp.ClientMessage = "upstream connection failed"
		}
	case isAccountResource(ue.Code):
		// No account effect: the account is healthy, it just does not serve
		// this model.
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.Reason = reasonText("model not available on this account")
	case code == http.StatusUnauthorized:
		disable("upstream rejected the API key (401)")
	case code == http.StatusForbidden:
		switch ue.Code {
		case codeAccountOverdue:
			disable("Volcengine account in arrears (403)")
		default:
			disable("upstream denied access (403)")
		}
	case code == http.StatusTooManyRequests && ue.Code == codeQuotaExceeded:
		disable("Ark quota exhausted, the model must be enabled or topped up")
	case code == http.StatusTooManyRequests && (ue.Code == codeOverloaded || ue.Code == codeModelLoading || ue.Code == codeBurstTooFast):
		cooldown(transientCooldown, reasonText("upstream busy (429)"))
	case code == http.StatusTooManyRequests:
		until, src := rateLimitReset(in.GetHeaders(), now)
		cooldown(until.Sub(now), reasonText("rate limited until "+until.UTC().Format(time.RFC3339)+" ("+src+")"))
	case code == http.StatusRequestTimeout || code >= 500:
		cooldown(transientCooldown, reasonText(fmt.Sprintf("upstream server error (%d)", code)))
	default:
		// 400 (bad parameters, context too long, moderated content) and 404
		// (the model or endpoint id does not exist) are the client's fault:
		// failing over would only repeat them on every account.
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
	}
	return resp, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}

// rateLimitReset works out when a 429'd account can be used again:
// retry-after-ms, then retry-after (seconds or an HTTP date), else 60 s.
// The result is clamped to [now+1s, now+7d].
func rateLimitReset(headers map[string]string, now time.Time) (time.Time, string) {
	clamp := func(t time.Time) time.Time {
		if t.Before(now.Add(time.Second)) {
			return now.Add(time.Second)
		}
		if t.After(now.Add(maxCooldown)) {
			return now.Add(maxCooldown)
		}
		return t
	}
	h := make(map[string]string, len(headers))
	for k, v := range headers {
		h[strings.ToLower(k)] = strings.TrimSpace(v)
	}
	if v := h["retry-after-ms"]; v != "" {
		if ms, err := strconv.ParseFloat(v, 64); err == nil && ms >= 0 {
			return clamp(now.Add(time.Duration(ms * float64(time.Millisecond)))), "retry-after-ms"
		}
	}
	if v := h["retry-after"]; v != "" {
		if secs, err := strconv.ParseFloat(v, 64); err == nil && secs >= 0 {
			return clamp(now.Add(time.Duration(secs * float64(time.Second)))), "retry-after"
		}
		if t, err := http.ParseTime(v); err == nil {
			return clamp(t), "retry-after"
		}
	}
	return now.Add(defaultRateLimitCooldown), "default"
}
