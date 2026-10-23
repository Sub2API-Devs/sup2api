package ccgateway

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/requestfailure"

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
	// The gateway's own refusals (the core before any Worker, or the Worker
	// before the CLI) carry their source and reason (contracts/requestfailure,
	// audit C2/A6): they are never the upstream's verdict on the account.
	source := requestfailure.SourceOf(headerValues(in.GetHeaders(), sourceHeader))
	local := requestfailure.Local(source)
	localReason := requestfailure.ReasonOf(in.GetHeaders()["x-ccgateway-error-reason"])

	switch {
	case code == 0:
		cooldown(serverErrorCooldown, "transport error: "+truncate(in.GetTransportError(), 200))
		resp.LocalFailure = true
		resp.ClientStatus = http.StatusBadGateway
		if resp.ClientMessage == "" {
			resp.ClientMessage = "upstream connection failed"
		}
	case local && code == http.StatusTooManyRequests:
		// The Worker's concurrency limit: free again in a moment.
		resp.LocalFailure = true
		until, src := rateLimitReset(in.GetHeaders(), now)
		cooldown(until.Sub(now), "gateway concurrency limit until "+until.UTC().Format(time.RFC3339)+" ("+src+")")
	case local && (code == http.StatusUnauthorized || code == http.StatusForbidden || code == http.StatusConflict || code >= 500):
		// The runtime refused for a reason of its own (a stale Worker key the
		// core re-reads, a policy its CLI cannot carry, an account state, a
		// Worker not ready): try another account, cool this one down briefly,
		// and say why. The account's credentials are not in question.
		resp.LocalFailure = true
		why := localReason
		if why == "" {
			why = fmt.Sprintf("status %d", code)
		}
		if msg != "" {
			why += ": " + truncate(msg, 200)
		}
		cooldown(serverErrorCooldown, "gateway refused the request ("+why+")")
	case local:
		// The Worker found the request itself unusable (400, 404, 405, 413):
		// another account would answer the same.
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
		resp.LocalFailure = true
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
		classifyRateLimit(resp, in, source, now, cooldown)
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

// classifyRateLimit handles an upstream 429. A managed account's answer names
// the limit it hit the way Claude Code reads it (the representative claim): a
// model-scoped weekly limit only moves the request to another account, the
// account stays usable for other models; any other limit disables the
// account until it resets.
//
// Only an upstream HTTP answer names a limit: the Worker marks it
// (requestfailure.SourceHTTP) and never relays a provider's x-ccgateway-*
// headers (httpfacts.Apply), so a provider cannot claim the source.
func classifyRateLimit(resp *pluginv1.ClassifyErrorResponse, in *pluginv1.ClassifyErrorRequest, source string, now time.Time, cooldown func(time.Duration, string)) {
	if source == requestfailure.SourceHTTP {
		resp.Quota = rejectedQuota(in, now)
	}
	if window := resp.GetQuota().GetWindows(); len(window) == 1 && scopedQuota(window[0].GetKey()) {
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.Reason = "scoped quota rejected: " + window[0].GetKey()
		return
	}
	until, src := rateLimitReset(in.GetHeaders(), now)
	cooldown(until.Sub(now), "rate limited until "+until.UTC().Format(time.RFC3339)+" ("+src+")")
	if in.GetAccount().GetType() == AccountTypeManaged {
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE
		resp.AutomaticState = &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE,
			Reason: resp.Reason, Release: &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: until.Unix()}}
	}
}

func scopedQuota(key string) bool { return key == "7d_fable" || key == "7d_sonnet" }

// sourceHeader is requestfailure.SourceHeader as the host passes headers
// (lowercase).
const sourceHeader = "x-ccgateway-error-source"

// claimHeader is the limit a rejected request hit, as Claude Code reads it
// (rateLimitType); claimResetHeader is when the unified limit resets.
const (
	claimHeader      = "anthropic-ratelimit-unified-representative-claim"
	claimResetHeader = "anthropic-ratelimit-unified-reset"
)

// rejectedQuota is the quota window a managed account's 429 names, or nil.
func rejectedQuota(in *pluginv1.ClassifyErrorRequest, now time.Time) *pluginv1.QuotaResult {
	h := in.GetHeaders()
	if in.GetAccount().GetType() != AccountTypeManaged {
		return nil
	}
	key := quotaClaimKey(h[claimHeader])
	if key == "" {
		return nil
	}
	window := &pluginv1.QuotaWindow{Key: key, Status: "rejected", UtilizationUnknown: true}
	if raw := h[claimResetHeader]; raw != "" {
		reset, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || reset <= 0 || reset > 253402300799 || strconv.FormatInt(reset, 10) != raw {
			return nil
		}
		window.ResetsAtUnix = reset
	}
	windows := []*pluginv1.QuotaWindow{window}
	return &pluginv1.QuotaResult{Windows: windows, NextCheckAtUnix: nextQuotaCheck(now, windows)}
}

// quotaClaimKey maps a representative claim to the plugin's quota key.
func quotaClaimKey(claim string) string {
	switch claim {
	case "five_hour":
		return "5h"
	case "seven_day":
		return "7d"
	case "seven_day_sonnet":
		return "7d_sonnet"
	case "seven_day_overage_included":
		return "7d_fable"
	default:
		return ""
	}
}

// headerValues is the single-valued header map as header values.
func headerValues(h map[string]string, name string) []string {
	if v, ok := h[name]; ok && v != "" {
		return []string{v}
	}
	return nil
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
