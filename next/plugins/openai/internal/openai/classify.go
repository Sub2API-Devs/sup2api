package openai

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
	serverErrorCooldown      = 10 * time.Second
	maxCooldown              = 7 * 24 * time.Hour
)

// OpenAI error types used when the upstream body has none.
const (
	errInvalidRequest = "invalid_request_error"
	errAuthentication = "authentication_error"
	errPermission     = "permission_error"
	errRateLimit      = "rate_limit_error"
	errServer         = "server_error"
)

// errorTypeForStatus maps an HTTP status to an OpenAI error type.
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

// upstreamError is the relevant part of an OpenAI error body
// {"error": {"message", "type", "param", "code"}}.
type upstreamError struct {
	Message, Type, Code string
}

func parseError(body []byte) upstreamError {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return upstreamError{}
	}
	e := gjson.GetBytes(body, "error")
	if e.Type == gjson.String { // some compatible servers: {"error": "message"}
		return upstreamError{Message: e.String()}
	}
	return upstreamError{
		Message: e.Get("message").String(),
		Type:    e.Get("type").String(),
		Code:    e.Get("code").String(),
	}
}

// isQuotaExhausted detects 429 insufficient_quota: the account has no
// credit left (not a rate limit), so it is disabled rather than cooled down.
func isQuotaExhausted(e upstreamError) bool {
	return e.Code == "insufficient_quota" || e.Type == "insufficient_quota" ||
		strings.Contains(strings.ToLower(e.Message), "exceeded your current quota")
}

// ClassifyError implements pluginsdk.Platform:
//   - transport errors and 408/5xx: fail over, cool the account down 10 s;
//   - 401/403: fail over, disable the account (bad key, revoked, region);
//   - 429 insufficient_quota: fail over, disable the account;
//   - 429: fail over, cool down until retry-after / x-ratelimit-reset-*
//     (default 60 s);
//   - 400 and other 4xx: the client's fault, returned as-is.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	now := p.now()
	code := int(in.GetStatus())
	ue := parseError(in.GetBodyPrefix())
	resp := &pluginv1.ClassifyErrorResponse{ClientErrorType: errorTypeForStatus(code), ClientMessage: ue.Message}
	if ue.Type != "" && code != 0 {
		resp.ClientErrorType = ue.Type
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
		resp.Reason = reason
		if ue.Message != "" {
			resp.Reason += ": " + truncate(ue.Message, 200)
		}
	}

	switch {
	case code == 0:
		cooldown(serverErrorCooldown, "transport error: "+truncate(in.GetTransportError(), 200))
		resp.ClientStatus = http.StatusBadGateway
		if resp.ClientMessage == "" {
			resp.ClientMessage = "upstream connection failed"
		}
	case code == http.StatusUnauthorized || code == http.StatusForbidden:
		disable(fmt.Sprintf("upstream rejected credentials (%d)", code))
	case code == http.StatusTooManyRequests && isQuotaExhausted(ue):
		disable("upstream quota exhausted (insufficient_quota)")
	case code == http.StatusTooManyRequests:
		until, src := rateLimitReset(in.GetHeaders(), now)
		cooldown(until.Sub(now), "rate limited until "+until.UTC().Format(time.RFC3339)+" ("+src+")")
	case code == http.StatusRequestTimeout || code >= 500:
		cooldown(serverErrorCooldown, fmt.Sprintf("upstream server error (%d)", code))
	default:
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
//  1. retry-after-ms, then retry-after (seconds or HTTP date);
//  2. x-ratelimit-reset-{requests,tokens} of the exhausted limits
//     (x-ratelimit-remaining-* == 0), the latest one;
//  3. otherwise the earliest x-ratelimit-reset-*;
//  4. otherwise 60 s.
//
// Reset values are Go-style durations ("1s", "6m0s", "20ms"). The result is
// clamped to [now+1s, now+7d].
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
	var exhausted, earliest time.Duration
	found := false
	for _, kind := range []string{"requests", "tokens"} {
		d, err := time.ParseDuration(h["x-ratelimit-reset-"+kind])
		if err != nil || d < 0 {
			continue
		}
		if h["x-ratelimit-remaining-"+kind] == "0" && d > exhausted {
			exhausted = d
		}
		if !found || d < earliest {
			earliest, found = d, true
		}
	}
	switch {
	case exhausted > 0:
		return clamp(now.Add(exhausted)), "x-ratelimit reset"
	case found:
		return clamp(now.Add(earliest)), "x-ratelimit reset"
	default:
		return now.Add(defaultRateLimitCooldown), "default"
	}
}
