// Package volcengine provides the error classification policy for Volcengine
// Ark (火山方舟): parsing the error body, mapping statuses to client error
// types in both OpenAI and Anthropic vocabularies, and handling Ark-specific
// codes (free trial quota exhausted, model not enabled, warming up).
package volcengine

import (
	"net/http"
	"strings"
	"time"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/classify"
)

// Ark error codes that need special handling beyond HTTP status.
const (
	CodeAccountOverdue = "AccountOverdueError"            // 403, account in arrears
	CodeQuotaExceeded  = "QuotaExceeded"                  // 429, free trial quota used up
	CodeModelLoading   = "ModelLoadingError"              // 429, model warming up
	CodeOverloaded     = "ServerOverloaded"               // 429, upstream saturated
	CodeBurstTooFast   = "RequestBurstTooFast"            // 429, traffic ramped too fast
	CodeModelNotOpen   = "ModelNotOpen"                   // 404, model not enabled on account
	CodeClosedEndpoint = "InvalidEndpoint.ClosedEndpoint" // 400, inference endpoint closed
)

// ProtocolMessages and ProtocolCountTokens are Anthropic surface protocols;
// the other surfaces are OpenAI-shaped.
const (
	ProtocolMessages    = "anthropic-messages"
	ProtocolCountTokens = "anthropic-count-tokens"
)

// Policy is the shared Volcengine Ark classify policy for OpenAI surfaces.
var Policy = classify.Policy{
	Parse:     parseError,
	ErrorType: errorTypeOpenAI,
	Detail:    detailCodeMessage,
	Rules:     sharedRules,
}

// PolicyAnthropic is the Volcengine Ark classify policy for Anthropic surfaces
// (different error type vocabulary: "api_error" not "server_error", "not_found_error" not folded into "invalid_request_error").
var PolicyAnthropic = classify.Policy{
	Parse:     parseError,
	ErrorType: errorTypeAnthropic,
	Detail:    detailCodeMessage,
	Rules:     sharedRules,
}

var sharedRules = []classify.Rule{
	classify.EdgeBlock(),
	{When: accountResource, Reason: "model not available on this account"},
	{When: classify.All(classify.Status(http.StatusForbidden), classify.CodeIn(CodeAccountOverdue)), Effect: classify.Disable, Reason: "Volcengine account in arrears"},
	classify.Credentials(),
	{When: classify.All(classify.Status(http.StatusTooManyRequests), classify.CodeIn(CodeQuotaExceeded)), Effect: classify.Disable, Reason: "Ark quota exhausted, the model must be enabled or topped up", NoDetail: true},
	{When: classify.All(classify.Status(http.StatusTooManyRequests), classify.CodeIn(CodeOverloaded, CodeModelLoading, CodeBurstTooFast)), Effect: classify.Cooldown, Cooldown: 10 * time.Second, Reason: "upstream busy (429)"},
	classify.RateLimit(classify.RetryAfter),
	classify.ServerErrors(10 * time.Second),
}

func parseError(body []byte) classify.Error {
	if len(body) == 0 || !gjson.ValidBytes(body) {
		return classify.Error{}
	}
	e := gjson.GetBytes(body, "error")
	if e.Type == gjson.String { // some compatible relays: {"error": "message"}
		return classify.Error{Message: e.String()}
	}
	return classify.Error{
		Message: e.Get("message").String(),
		Code:    e.Get("code").String(),
	}
}

func errorTypeOpenAI(in *classify.Input) string {
	switch in.Status {
	case http.StatusUnauthorized:
		return "authentication_error"
	case http.StatusForbidden:
		return "permission_error"
	case http.StatusTooManyRequests:
		return "rate_limit_error"
	case 0:
		return "server_error"
	default:
		if in.Status >= 500 {
			return "server_error"
		}
		return "invalid_request_error"
	}
}

func errorTypeAnthropic(in *classify.Input) string {
	switch in.Status {
	case http.StatusNotFound:
		return "not_found_error"
	case 0:
		return "api_error"
	default:
		if in.Status >= 500 {
			return "api_error"
		}
		// authentication_error, permission_error, rate_limit_error and
		// invalid_request_error are spelled the same in both vocabularies.
		return errorTypeOpenAI(in)
	}
}

func detailCodeMessage(in *classify.Input) string {
	s := ""
	if in.Error.Code != "" {
		s = " [" + in.Error.Code + "]"
	}
	return s + classify.DetailMessage(in)
}

func accountResource(in *classify.Input) bool {
	return in.Error.Code == CodeModelNotOpen || in.Error.Code == CodeClosedEndpoint ||
		strings.HasPrefix(in.Error.Code, "InvalidEndpointOrModel")
}
