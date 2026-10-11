package ccgateway

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

// Error classification follows the anthropic plugin (ccgateways answer with
// Anthropic error bodies and rate-limit headers). Cooldown defaults
// (ARCHITECTURE 15.1).
const (
	defaultRateLimitCooldown = 60 * time.Second
	overloadedCooldown       = 30 * time.Second
	serverErrorCooldown      = 10 * time.Second
	maxCooldown              = 7 * 24 * time.Hour
)

// StatusOverloaded is Anthropic's "overloaded" status code.
const StatusOverloaded = 529

// errorScopeHeader (lowercase, as the host passes headers) marks a gateway
// error that belongs to the request alone (companions/engine requestRefusal).
const errorScopeHeader = "x-ccgateway-error-scope"

// errorTypeForStatus maps an HTTP status to the Anthropic error type.
func errorTypeForStatus(code int) string {
	switch {
	case code == http.StatusBadRequest:
		return "invalid_request_error"
	case code == http.StatusUnauthorized:
		return "authentication_error"
	case code == http.StatusForbidden:
		return "permission_error"
	case code == http.StatusNotFound:
		return "not_found_error"
	case code == http.StatusRequestEntityTooLarge:
		return "request_too_large"
	case code == http.StatusTooManyRequests:
		return "rate_limit_error"
	case code == StatusOverloaded:
		return "overloaded_error"
	case code == 0 || code >= 500:
		return "api_error"
	default:
		return "invalid_request_error"
	}
}

// upstreamMessage extracts error.message from an Anthropic error body.
func upstreamMessage(body []byte) string {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return ""
	}
	return gjson.GetBytes(body, "error.message").String()
}

// isAccountBillingError detects 400s that are really account problems
// ("Your credit balance is too low ..."), which should fail over.
func isAccountBillingError(msg string) bool {
	m := strings.ToLower(msg)
	return strings.Contains(m, "credit balance is too low")
}

// ClassifyError implements pluginsdk.Platform.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	now := p.now()
	code := int(in.GetStatus())
	msg := upstreamMessage(in.GetBodyPrefix())
	resp := &pluginv1.ClassifyErrorResponse{}
	// An upstream error body reaches the client unchanged: no client type or
	// message lets the host pass it through instead of rendering its own
	// envelope. Only bodies that are not Anthropic errors are described.
	if !gjson.GetBytes(in.GetBodyPrefix(), "error.type").Exists() {
		resp.ClientErrorType = errorTypeForStatus(code)
		resp.ClientMessage = msg
	}
	cooldown := func(d time.Duration, reason string) {
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		resp.CooldownUntilUnix = now.Add(d).Unix()
		resp.Reason = reason
	}

	switch {
	case in.GetHeaders()[errorScopeHeader] == "request":
		// The gateway refused this request itself (its history or features
		// could not be carried exactly): another account would refuse it the
		// same way, and the account is not at fault.
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
		resp.LocalFailure = true
	case code == 0:
		cooldown(serverErrorCooldown, "transport error: "+truncate(in.GetTransportError(), 200))
		resp.LocalFailure = true
		resp.ClientStatus = http.StatusBadGateway
		if resp.ClientMessage == "" {
			resp.ClientMessage = "upstream connection failed"
		}
	case code == http.StatusBadRequest && isAccountBillingError(msg):
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
		resp.Reason = "upstream credit balance too low"
	case code == http.StatusUnauthorized || code == http.StatusForbidden:
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
		resp.Reason = fmt.Sprintf("upstream rejected credentials (%d)", code)
		if msg != "" {
			resp.Reason += ": " + truncate(msg, 200)
		}
	case code == http.StatusTooManyRequests:
		until, src := rateLimitReset(in.GetHeaders(), now)
		cooldown(until.Sub(now), "rate limited until "+until.UTC().Format(time.RFC3339)+" ("+src+")")
		resp.LocalFailure = msg == "Gateway concurrency limit reached"
		if in.GetAccount().GetType() == AccountTypeManaged && !resp.LocalFailure {
			resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
			resp.AutomaticState = &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE,
				Reason: resp.Reason, Release: &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: until.Unix()}}
		}
	case code == StatusOverloaded:
		cooldown(overloadedCooldown, "upstream overloaded (529)")
	case code == http.StatusRequestTimeout || code >= 500:
		cooldown(serverErrorCooldown, fmt.Sprintf("upstream server error (%d)", code))
	default:
		// 400 and the other 4xx are the client's fault: return as-is.
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
//  1. anthropic-ratelimit-*-reset of exhausted limits (remaining == 0,
//     status == rejected, or unified utilization >= 1), the latest one;
//  2. retry-after (seconds or HTTP date), taking the later of it and 1;
//  3. otherwise the earliest future anthropic-ratelimit-*-reset;
//  4. otherwise 60 s.
//
// Reset values are RFC 3339 timestamps or unix seconds. The result is
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
	var exhausted, earliest time.Time
	for k, v := range h {
		if !strings.HasPrefix(k, "anthropic-ratelimit-") || !strings.HasSuffix(k, "-reset") {
			continue
		}
		t, ok := parseReset(v)
		if !ok {
			continue
		}
		base := strings.TrimSuffix(k, "-reset")
		used, _ := strconv.ParseFloat(h[base+"-utilization"], 64)
		if h[base+"-remaining"] == "0" || strings.EqualFold(h[base+"-status"], "rejected") || (strings.HasPrefix(base, "anthropic-ratelimit-unified") && used >= 1) {
			if t.After(exhausted) {
				exhausted = t
			}
		}
		if t.After(now) && (earliest.IsZero() || t.Before(earliest)) {
			earliest = t
		}
	}
	var retry time.Time
	if v := h["retry-after"]; v != "" {
		if secs, err := strconv.ParseFloat(v, 64); err == nil && secs >= 0 {
			retry = now.Add(time.Duration(min(secs, maxCooldown.Seconds()) * float64(time.Second)))
		} else if t, err := http.ParseTime(v); err == nil {
			retry = t
		}
	}
	if !retry.IsZero() && retry.After(exhausted) {
		return clamp(retry), "retry-after"
	}
	if !exhausted.IsZero() {
		return clamp(exhausted), "anthropic-ratelimit reset"
	}
	if !earliest.IsZero() {
		return clamp(earliest), "anthropic-ratelimit reset"
	}
	return now.Add(defaultRateLimitCooldown), "default"
}

func parseReset(v string) (time.Time, bool) {
	if v == "" {
		return time.Time{}, false
	}
	if t, err := time.Parse(time.RFC3339, v); err == nil {
		return t, true
	}
	if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
		return time.Unix(n, 0), true
	}
	return time.Time{}, false
}
