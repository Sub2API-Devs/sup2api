package gateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Error formats an endpoint can declare (manifest errorFormat).
const (
	FormatAnthropic = "anthropic"
	FormatOpenAI    = "openai"
	FormatGemini    = "gemini"
	FormatPlain     = "plain"
)

// Usage record error types (usage_logs.error_type).
const (
	errTypeBlockedByHook       = "blocked_by_hook"
	errTypeInsufficientBalance = "insufficient_balance"
	errTypeNoAccount           = "no_account"
	errTypeUpstream            = "upstream_error"
	errTypeClientCanceled      = "client_canceled"
	errTypeInternal            = "internal"
	errTypeModelNotAllowed     = "model_not_allowed"
	errTypePriceNotConfigured  = "price_not_configured"
	errTypeRateLimited         = "rate_limited"
	errTypeInvalidRequest      = "invalid_request"
	errTypePluginUnavailable   = "plugin_unavailable"
)

// statusClientClosed is the conventional status for requests the client
// abandoned (nginx 499); only ever written to usage records.
const statusClientClosed = 499

// codeUpstreamError is the client error code of an upstream failure the
// platform plugin did not name itself.
const codeUpstreamError = "upstream_error"

// maxClientErrorCode is the longest client error code a plugin may set. The
// longest real upstream code seen so far is Volcengine Ark's
// "InputTextSensitiveContentDetected" (33 bytes); 64 leaves room without
// letting an upstream string of unbounded length into the client body.
const maxClientErrorCode = 64

// clientErrorCodeRe constrains ClassifyErrorResponse.client_error_code. The
// value is written verbatim into a JSON error body the client parses and into
// the Gemini format's ErrorInfo.reason, which is specified as an UPPER_SNAKE
// enum-like token - so the set is the characters real upstream codes use
// ("insufficient_quota", "InputTextSensitiveContentDetected",
// "billing.hard_limit_reached") and nothing that could be mistaken for
// structure: no whitespace, quotes, slashes or non-ASCII.
var clientErrorCodeRe = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._:-]*$`)

// clientErrorCode validates the code a platform plugin classified an upstream
// failure with.
//
// Empty is the normal case and keeps "upstream_error": every plugin written
// before the field existed leaves it empty, and their clients must keep seeing
// exactly what they saw before.
//
// An invalid value is dropped rather than truncated or sanitised. A truncated
// code is a *different* code, and a client that branches on it would branch
// wrongly; falling back to the generic code is the honest answer, and the
// warning tells the plugin author which plugin to fix.
func clientErrorCode(ctx context.Context, code, pluginKey string) string {
	if code == "" {
		return codeUpstreamError
	}
	if len(code) > maxClientErrorCode || !clientErrorCodeRe.MatchString(code) {
		slog.WarnContext(ctx, "gateway: plugin returned an invalid client_error_code, using the generic one",
			"plugin", pluginKey, "code", truncateUTF8(code, 200), "max_bytes", maxClientErrorCode,
			"pattern", clientErrorCodeRe.String())
		return codeUpstreamError
	}
	return code
}

// gwError is an error rendered to a gateway client.
type gwError struct {
	Status  int
	Code    string // host error code (core error codes, hook deny codes)
	Type    string // protocol-specific error type; derived from Status when empty
	Message string
	// Raw is an upstream error body passed through verbatim when the
	// platform plugin gave no client-facing type or message.
	Raw         []byte
	ContentType string
	// RecordType is the usage_logs.error_type for this failure.
	RecordType string
}

func fromCore(e *core.Error, recordType string) *gwError {
	return &gwError{Status: e.Status, Code: e.Code, Message: e.Message, RecordType: recordType}
}

// writeError renders err in the endpoint's error format.
func writeError(c *gin.Context, format string, err *gwError) {
	status := err.Status
	if status <= 0 {
		status = http.StatusInternalServerError
	}
	if len(err.Raw) > 0 && json.Valid(err.Raw) {
		ct := err.ContentType
		if ct == "" || !strings.Contains(ct, "json") {
			ct = "application/json"
		}
		c.Data(status, ct, err.Raw)
		return
	}
	msg := err.Message
	if msg == "" {
		msg = http.StatusText(status)
	}
	code := err.Code
	if code == "" {
		code = defaultCode(status)
	}
	var body any
	switch strings.ToLower(format) {
	case FormatAnthropic:
		t := err.Type
		if t == "" {
			t = anthropicType(status)
		}
		body = gin.H{"type": "error", "error": gin.H{"type": t, "message": msg, "code": code}}
	case FormatOpenAI:
		t := err.Type
		if t == "" {
			t = openaiType(status)
		}
		body = gin.H{"error": gin.H{"message": msg, "type": t, "code": code, "param": nil}}
	case FormatGemini:
		body = gin.H{"error": gin.H{"code": status, "message": msg, "status": googleStatus(status),
			"details": []any{gin.H{"@type": "type.googleapis.com/google.rpc.ErrorInfo", "reason": code, "domain": "sub2api"}}}}
	default:
		// "plain": the host's own REST error envelope (CONTRACTS §3.1).
		body = gin.H{"error": gin.H{"code": code, "message": msg}}
	}
	c.JSON(status, body)
}

func defaultCode(status int) string {
	switch status {
	case http.StatusBadRequest:
		return core.ErrInvalidArgument.Code
	case http.StatusUnauthorized:
		return core.ErrUnauthenticated.Code
	case http.StatusPaymentRequired:
		return core.ErrInsufficientBalance.Code
	case http.StatusForbidden:
		return core.ErrPermissionDenied.Code
	case http.StatusNotFound:
		return core.ErrNotFound.Code
	case http.StatusTooManyRequests:
		return core.ErrRateLimited.Code
	case http.StatusServiceUnavailable:
		return core.ErrUnavailable.Code
	}
	if status >= 500 {
		return codeUpstreamError
	}
	return "request_failed"
}

func anthropicType(status int) string {
	switch {
	case status == http.StatusBadRequest:
		return "invalid_request_error"
	case status == http.StatusUnauthorized:
		return "authentication_error"
	case status == http.StatusPaymentRequired:
		return "billing_error"
	case status == http.StatusForbidden:
		return "permission_error"
	case status == http.StatusNotFound:
		return "not_found_error"
	case status == http.StatusRequestEntityTooLarge:
		return "request_too_large"
	case status == http.StatusTooManyRequests:
		return "rate_limit_error"
	case status == http.StatusServiceUnavailable || status == 529:
		return "overloaded_error"
	case status >= 500:
		return "api_error"
	default:
		return "invalid_request_error"
	}
}

func openaiType(status int) string {
	switch {
	case status == http.StatusUnauthorized:
		return "authentication_error"
	case status == http.StatusPaymentRequired:
		return "insufficient_quota"
	case status == http.StatusForbidden:
		return "permission_error"
	case status == http.StatusNotFound:
		return "not_found_error"
	case status == http.StatusTooManyRequests:
		return "rate_limit_error"
	case status >= 500:
		return "server_error"
	default:
		return "invalid_request_error"
	}
}

func googleStatus(status int) string {
	switch status {
	case http.StatusBadRequest, http.StatusRequestEntityTooLarge:
		return "INVALID_ARGUMENT"
	case http.StatusUnauthorized:
		return "UNAUTHENTICATED"
	case http.StatusPaymentRequired:
		return "FAILED_PRECONDITION"
	case http.StatusForbidden:
		return "PERMISSION_DENIED"
	case http.StatusNotFound:
		return "NOT_FOUND"
	case http.StatusTooManyRequests:
		return "RESOURCE_EXHAUSTED"
	case http.StatusServiceUnavailable:
		return "UNAVAILABLE"
	case http.StatusGatewayTimeout:
		return "DEADLINE_EXCEEDED"
	}
	if status >= 500 {
		return "INTERNAL"
	}
	return "UNKNOWN"
}
