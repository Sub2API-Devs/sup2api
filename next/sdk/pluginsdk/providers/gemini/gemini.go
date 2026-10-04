// Package gemini provides the error classification policy for Google's Gemini
// API: parsing the google.rpc error body, mapping statuses to client error
// types, and computing rate-limit resets including daily quota midnight resets.
package gemini

import (
	"net/http"
	"strings"
	"time"
	_ "time/tzdata" // daily quotas reset at midnight America/Los_Angeles

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/classify"
)

// Policy is the shared Gemini classify policy.
var Policy = classify.Policy{
	Parse:     parseError,
	ErrorType: errorTypeForStatus,
	Detail:    classify.DetailMessage,
	Transport: 10 * time.Second,
	Rules: []classify.Rule{
		classify.EdgeBlock(),
		{When: classify.All(classify.Status(http.StatusBadRequest), classify.Any(keyInvalid, locationUnsupported)), Effect: classify.Disable, Reason: "upstream rejected the API key or location (400)"},
		classify.Credentials(),
		classify.RateLimit(rateLimitReset),
		classify.ServerErrors(0), // no account effect: usually per request/model
	},
}

func parseError(body []byte) classify.Error {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return classify.Error{}
	}
	root := gjson.ParseBytes(body)
	if root.IsArray() {
		root = root.Get("0")
	}
	e := root.Get("error")
	var result classify.Error
	result.Message = e.Get("message").String()
	result.Type = e.Get("status").String()
	for _, d := range e.Get("details").Array() {
		typ := d.Get(`\@type`).String()
		switch {
		case strings.HasSuffix(typ, "google.rpc.ErrorInfo"):
			result.Reasons = append(result.Reasons, d.Get("reason").String())
		case strings.HasSuffix(typ, "google.rpc.QuotaFailure"):
			for _, v := range d.Get("violations").Array() {
				result.QuotaIDs = append(result.QuotaIDs, v.Get("quotaId").String())
			}
		case strings.HasSuffix(typ, "google.rpc.RetryInfo"):
			if dd, parseErr := time.ParseDuration(d.Get("retryDelay").String()); parseErr == nil && dd > 0 {
				result.RetryDelay = dd
			}
		}
	}
	return result
}

func errorTypeForStatus(in *classify.Input) string {
	if in.Error.Type != "" && in.Status != 0 {
		return in.Error.Type
	}
	switch in.Status {
	case http.StatusBadRequest:
		return "INVALID_ARGUMENT"
	case http.StatusUnauthorized:
		return "UNAUTHENTICATED"
	case http.StatusForbidden:
		return "PERMISSION_DENIED"
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusTooManyRequests:
		return "RESOURCE_EXHAUSTED"
	case 0, http.StatusServiceUnavailable:
		return "UNAVAILABLE"
	case http.StatusGatewayTimeout, http.StatusRequestTimeout:
		return "DEADLINE_EXCEEDED"
	default:
		if in.Status >= 500 {
			return "INTERNAL"
		}
		return "FAILED_PRECONDITION"
	}
}

func keyInvalid(in *classify.Input) bool {
	m := strings.ToLower(in.Error.Message)
	return classify.HasReason("API_KEY_INVALID", "API_KEY_EXPIRED")(in) ||
		strings.Contains(m, "api key not valid") || strings.Contains(m, "api key expired")
}

func locationUnsupported(in *classify.Input) bool {
	return strings.Contains(strings.ToLower(in.Error.Message), "location is not supported")
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
//  4. otherwise nothing (the classify package defaults to 60s).
func rateLimitReset(in *classify.Input) (time.Time, string, bool) {
	if t, src, ok := classify.RetryAfter(in); ok {
		return t, src, true
	}
	if in.Error.RetryDelay > 0 {
		return in.Now.Add(in.Error.RetryDelay), "retryDelay", true
	}
	for _, q := range in.Error.QuotaIDs {
		if strings.Contains(q, "PerDay") {
			local := in.Now.In(pacific)
			midnight := time.Date(local.Year(), local.Month(), local.Day()+1, 0, 0, 0, 0, pacific)
			return midnight, "daily quota", true
		}
	}
	return time.Time{}, "", false
}
