package goldentest

import (
	"net/http"
	"strconv"
	"time"
)

// Classify inputs per provider error format: the inputs of the plugins'
// TestClassifyError, all against Now.

// OpenAIErrors are OpenAI-format failures.
var OpenAIErrors = []ErrorInput{
	{Name: "400", Status: 400, Body: `{"error":{"message":"'messages' is required","type":"invalid_request_error","param":"messages","code":null}}`},
	{Name: "404 model", Status: 404, Body: `{"error":{"message":"The model does not exist","type":"invalid_request_error","code":"model_not_found"}}`},
	{Name: "400 no body", Status: 400},
	{Name: "401", Status: 401, Body: `{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","code":"invalid_api_key"}}`},
	{Name: "401 no body", Status: 401},
	{Name: "403", Status: 403, Body: `{"error":{"message":"Country, region, or territory not supported","type":"request_forbidden","code":"unsupported_country_region_territory"}}`},
	{Name: "429 quota", Status: 429, Body: `{"error":{"message":"You exceeded your current quota","type":"insufficient_quota","code":"insufficient_quota"}}`},
	{Name: "429 default", Status: 429, Body: `{"error":{"message":"Rate limit reached","type":"requests","code":"rate_limit_exceeded"}}`},
	{Name: "429 retry-after", Status: 429, Headers: Headers{"retry-after": "2"}},
	{Name: "429 retry-after-ms", Status: 429, Headers: Headers{"retry-after-ms": "2500", "retry-after": "9"}},
	{Name: "429 retry-after date", Status: 429, Headers: Headers{"Retry-After": httpDate(90 * time.Second)}},
	{Name: "429 exhausted tokens", Status: 429, Headers: Headers{
		"x-ratelimit-remaining-requests": "10", "x-ratelimit-reset-requests": "5s",
		"x-ratelimit-remaining-tokens": "0", "x-ratelimit-reset-tokens": "6m0s",
	}},
	{Name: "429 earliest reset", Status: 429, Headers: Headers{"x-ratelimit-reset-requests": "20s", "x-ratelimit-reset-tokens": "1m"}},
	{Name: "429 clamp", Status: 429, Headers: Headers{"retry-after": "99999999"}},
	{Name: "500", Status: 500, Body: `{"error":{"message":"The server had an error","type":"server_error"}}`},
	{Name: "503", Status: 503},
	{Name: "408", Status: 408},
	{Name: "400 string error", Status: 400, Body: `{"error":"bad things"}`},
}

// AnthropicErrors are Anthropic-format failures (anthropic and relay).
var AnthropicErrors = []ErrorInput{
	{Name: "400", Status: 400, Body: `{"type":"error","error":{"type":"invalid_request_error","message":"max_tokens: required"}}`},
	{Name: "400 credit", Status: 400, Body: `{"error":{"message":"Your credit balance is too low to access the Anthropic API."}}`},
	{Name: "404", Status: 404},
	{Name: "401", Status: 401, Body: `{"error":{"message":"invalid x-api-key"}}`},
	{Name: "403", Status: 403},
	{Name: "429 default", Status: 429},
	{Name: "429 retry-after", Status: 429, Headers: Headers{"retry-after": "2"}},
	{Name: "429 retry-after date", Status: 429, Headers: Headers{"Retry-After": httpDate(90 * time.Second)}},
	{Name: "429 exhausted reset", Status: 429, Headers: Headers{
		"anthropic-ratelimit-requests-remaining": "10",
		"anthropic-ratelimit-requests-reset":     rfc3339(5 * time.Second),
		"anthropic-ratelimit-tokens-remaining":   "0",
		"anthropic-ratelimit-tokens-reset":       rfc3339(40 * time.Second),
	}},
	{Name: "429 earliest reset", Status: 429, Headers: Headers{
		"anthropic-ratelimit-requests-reset": rfc3339(5 * time.Second),
		"anthropic-ratelimit-tokens-reset":   rfc3339(40 * time.Second),
	}},
	{Name: "429 unified unix reset", Status: 429, Headers: Headers{
		"anthropic-ratelimit-unified-status": "rejected",
		"anthropic-ratelimit-unified-reset":  strconv.FormatInt(Now.Add(2*time.Hour).Unix(), 10),
	}},
	{Name: "429 clamp", Status: 429, Headers: Headers{"retry-after": "99999999"}},
	{Name: "529", Status: 529},
	{Name: "500", Status: 500},
	{Name: "503", Status: 503},
	{Name: "400 bad", Status: 400, Body: `{"type":"error","error":{"type":"invalid_request_error","message":"bad"}}`},
}

// GeminiErrors are Google-format failures.
var GeminiErrors = []ErrorInput{
	{Name: "400", Status: 400, Body: googleError(400, "INVALID_ARGUMENT", "Invalid JSON payload received.", "")},
	{Name: "400 key invalid", Status: 400, Body: googleError(400, "INVALID_ARGUMENT", "API key not valid. Please pass a valid API key.",
		`[{"@type":"type.googleapis.com/google.rpc.ErrorInfo","reason":"API_KEY_INVALID","domain":"googleapis.com"}]`)},
	{Name: "400 location", Status: 400, Body: googleError(400, "FAILED_PRECONDITION", "User location is not supported for the API use.", "")},
	{Name: "404", Status: 404, Body: googleError(404, "NOT_FOUND", "models/nope is not found", "")},
	{Name: "401", Status: 401},
	{Name: "403", Status: 403, Body: googleError(403, "PERMISSION_DENIED", "Generative Language API has not been used in project", "")},
	{Name: "429 default", Status: 429, Body: googleError(429, "RESOURCE_EXHAUSTED", "Resource has been exhausted", "")},
	{Name: "429 retry-after", Status: 429, Headers: Headers{"Retry-After": "2"}},
	{Name: "429 retryDelay", Status: 429, Body: googleError(429, "RESOURCE_EXHAUSTED", "You exceeded your current quota",
		`[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaMetric":"m","quotaId":"GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},
		  {"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"34s"}]`)},
	{Name: "429 daily", Status: 429, Body: googleError(429, "RESOURCE_EXHAUSTED", "quota",
		`[{"@type":"type.googleapis.com/google.rpc.QuotaFailure","violations":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]`)},
	{Name: "429 array body", Status: 429, Body: "[" + googleError(429, "RESOURCE_EXHAUSTED", "x",
		`[{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay":"5.5s"}]`) + "]"},
	{Name: "500", Status: 500, Body: googleError(500, "INTERNAL", "An internal error has occurred", "")},
	{Name: "503", Status: 503, Body: googleError(503, "UNAVAILABLE", "The model is overloaded", "")},
	{Name: "504 no body", Status: 504},
}

// CommonErrors are appended to every plugin's classify inputs.
var CommonErrors = []ErrorInput{
	{Name: "transport", Transport: "dial tcp: connection refused"},
	{Name: "status 0 without transport error"},
	{Name: "403 html edge block", Status: 403, Headers: Headers{"content-type": "text/html"}, Body: "<!DOCTYPE html><html><body>Attention Required! | Cloudflare</body></html>"},
	{Name: "403 cf-mitigated", Status: 403, Headers: Headers{"cf-mitigated": "challenge"}},
	{Name: "413", Status: 413},
	{Name: "502 html", Status: 502, Body: "<html><body>502 Bad Gateway</body></html>"},
	{Name: "400 non-json body", Status: 400, Body: "upstream says no"},
	{Name: "529 common", Status: 529, Body: `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`},
}

func httpDate(after time.Duration) string { return Now.Add(after).Format(http.TimeFormat) }

func rfc3339(after time.Duration) string { return Now.Add(after).Format(time.RFC3339) }

func googleError(code int, status, msg, details string) string {
	if details == "" {
		details = "[]"
	}
	return `{"error":{"code":` + strconv.Itoa(code) + `,"message":"` + msg + `","status":"` + status + `","details":` + details + `}}`
}
