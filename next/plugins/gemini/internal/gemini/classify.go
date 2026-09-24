package gemini

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata" // daily quotas reset at midnight America/Los_Angeles

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Cooldown defaults.
const (
	defaultRateLimitCooldown = 60 * time.Second
	transportCooldown        = 10 * time.Second
	maxCooldown              = 7 * 24 * time.Hour
)

// Google API status names (google.rpc.Code) used as client error types.
const (
	statusInvalidArgument    = "INVALID_ARGUMENT"
	statusFailedPrecondition = "FAILED_PRECONDITION"
	statusUnauthenticated    = "UNAUTHENTICATED"
	statusPermissionDenied   = "PERMISSION_DENIED"
	statusNotFound           = "NOT_FOUND"
	statusResourceExhausted  = "RESOURCE_EXHAUSTED"
	statusInternal           = "INTERNAL"
	statusUnavailable        = "UNAVAILABLE"
	statusDeadlineExceeded   = "DEADLINE_EXCEEDED"
)

// statusForCode maps an HTTP status to the Google API status name.
func statusForCode(code int) string {
	switch {
	case code == http.StatusBadRequest:
		return statusInvalidArgument
	case code == http.StatusUnauthorized:
		return statusUnauthenticated
	case code == http.StatusForbidden:
		return statusPermissionDenied
	case code == http.StatusNotFound:
		return statusNotFound
	case code == http.StatusTooManyRequests:
		return statusResourceExhausted
	case code == 0 || code == http.StatusServiceUnavailable:
		return statusUnavailable
	case code == http.StatusGatewayTimeout || code == http.StatusRequestTimeout:
		return statusDeadlineExceeded
	case code >= 500:
		return statusInternal
	default:
		return statusFailedPrecondition
	}
}

// upstreamError is the relevant part of a Google API error body
// {"error": {"code", "message", "status", "details": [...]}} (a stream
// without alt=sse wraps it in an array).
type upstreamError struct {
	Message, Status string
	Reasons         []string      // ErrorInfo.reason, e.g. API_KEY_INVALID
	QuotaIDs        []string      // QuotaFailure.violations[].quotaId
	RetryDelay      time.Duration // RetryInfo.retryDelay, 0 = absent
}

func parseError(body []byte) upstreamError {
	var ue upstreamError
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return ue
	}
	root := gjson.ParseBytes(body)
	if root.IsArray() {
		root = root.Get("0")
	}
	e := root.Get("error")
	ue.Message = e.Get("message").String()
	ue.Status = e.Get("status").String()
	for _, d := range e.Get("details").Array() {
		typ := d.Get(`\@type`).String()
		switch {
		case strings.HasSuffix(typ, "google.rpc.ErrorInfo"):
			ue.Reasons = append(ue.Reasons, d.Get("reason").String())
		case strings.HasSuffix(typ, "google.rpc.QuotaFailure"):
			for _, v := range d.Get("violations").Array() {
				ue.QuotaIDs = append(ue.QuotaIDs, v.Get("quotaId").String())
			}
		case strings.HasSuffix(typ, "google.rpc.RetryInfo"):
			if dd, err := time.ParseDuration(d.Get("retryDelay").String()); err == nil && dd > 0 {
				ue.RetryDelay = dd
			}
		}
	}
	return ue
}

func (ue upstreamError) hasReason(r string) bool {
	for _, x := range ue.Reasons {
		if x == r {
			return true
		}
	}
	return false
}

// isKeyInvalid detects the 400 Google returns for bad or expired keys.
func (ue upstreamError) isKeyInvalid() bool {
	m := strings.ToLower(ue.Message)
	return ue.hasReason("API_KEY_INVALID") || ue.hasReason("API_KEY_EXPIRED") ||
		strings.Contains(m, "api key not valid") || strings.Contains(m, "api key expired")
}

// isLocationUnsupported detects 400 FAILED_PRECONDITION "User location is
// not supported": the account (its egress) cannot be used at all.
func (ue upstreamError) isLocationUnsupported() bool {
	return strings.Contains(strings.ToLower(ue.Message), "location is not supported")
}

// ClassifyError implements pluginsdk.Platform (Gemini semantics):
//   - transport errors: fail over, cool the account down 10 s;
//   - 400 API_KEY_INVALID / unsupported location, 401, 403: fail over,
//     disable the account;
//   - 429 RESOURCE_EXHAUSTED: fail over, cool down until retry-after /
//     RetryInfo.retryDelay, the next midnight Pacific time for daily
//     quotas, default 60 s;
//   - 408/5xx: fail over (no account effect: usually per request/model);
//   - 400 INVALID_ARGUMENT and other 4xx: returned to the client.
func (p *Plugin) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	now := p.now()
	code := int(in.GetStatus())
	ue := parseError(in.GetBodyPrefix())
	resp := &pluginv1.ClassifyErrorResponse{ClientErrorType: statusForCode(code), ClientMessage: ue.Message}
	if ue.Status != "" && code != 0 {
		resp.ClientErrorType = ue.Status
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
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		resp.CooldownUntilUnix = now.Add(transportCooldown).Unix()
		resp.Reason = "transport error: " + truncate(in.GetTransportError(), 200)
		resp.ClientStatus = http.StatusBadGateway
		if resp.ClientMessage == "" {
			resp.ClientMessage = "upstream connection failed"
		}
	case code == http.StatusBadRequest && ue.isKeyInvalid():
		disable("upstream rejected the API key (400)")
	case code == http.StatusBadRequest && ue.isLocationUnsupported():
		disable("upstream does not serve this location (400)")
	case code == http.StatusUnauthorized || code == http.StatusForbidden:
		disable(fmt.Sprintf("upstream rejected credentials (%d)", code))
	case code == http.StatusTooManyRequests:
		until, src := rateLimitReset(in.GetHeaders(), ue, now)
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
		resp.AccountEffect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
		resp.CooldownUntilUnix = until.Unix()
		resp.Reason = "rate limited until " + until.UTC().Format(time.RFC3339) + " (" + src + ")"
	case code == http.StatusRequestTimeout || code >= 500:
		resp.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
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

// pacific is where Gemini's daily quotas reset (midnight).
var pacific = func() *time.Location {
	if loc, err := time.LoadLocation("America/Los_Angeles"); err == nil {
		return loc
	}
	return time.FixedZone("PST", -8*3600)
}()

// rateLimitReset works out when a 429'd account can be used again:
//  1. retry-after (seconds or HTTP date);
//  2. RetryInfo.retryDelay in the error body;
//  3. a daily quota (QuotaFailure quotaId containing "PerDay"): the next
//     midnight America/Los_Angeles;
//  4. otherwise 60 s.
//
// The result is clamped to [now+1s, now+7d].
func rateLimitReset(headers map[string]string, ue upstreamError, now time.Time) (time.Time, string) {
	clamp := func(t time.Time) time.Time {
		if t.Before(now.Add(time.Second)) {
			return now.Add(time.Second)
		}
		if t.After(now.Add(maxCooldown)) {
			return now.Add(maxCooldown)
		}
		return t
	}
	for k, v := range headers {
		if !strings.EqualFold(k, "retry-after") {
			continue
		}
		v = strings.TrimSpace(v)
		if secs, err := strconv.ParseFloat(v, 64); err == nil && secs >= 0 {
			return clamp(now.Add(time.Duration(secs * float64(time.Second)))), "retry-after"
		}
		if t, err := http.ParseTime(v); err == nil {
			return clamp(t), "retry-after"
		}
	}
	if ue.RetryDelay > 0 {
		return clamp(now.Add(ue.RetryDelay)), "retryDelay"
	}
	for _, q := range ue.QuotaIDs {
		if strings.Contains(q, "PerDay") {
			local := now.In(pacific)
			midnight := time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, pacific)
			return clamp(midnight), "daily quota"
		}
	}
	return now.Add(defaultRateLimitCooldown), "default"
}
