package engine

import (
	"encoding/json"
	"math"
	"net/http"
	"sync"
)

// requestRefusal is the gateway refusing a request whose history or features
// could not be carried exactly. The failure belongs to this client request,
// not to the account or the worker. The gateway marks
// the error so the host neither cools the account down nor fails over.
type requestRefusal struct{ err error }

func (e *requestRefusal) Error() string { return e.err.Error() }
func (e *requestRefusal) Unwrap() error { return e.err }

// errorScopeHeader marks a gateway error that belongs to the request alone.
const errorScopeHeader = "X-Ccgateway-Error-Scope"

type nativeError struct {
	Status         int
	Category       string
	Message        string
	RequestID      string
	ObservedStatus bool
	OutputObserved bool
	RetryAt        int64
}

func (e *nativeError) Error() string { return e.Message }

type nativeRunState struct {
	mu        sync.Mutex
	err       *nativeError
	requestID string
	retryAt   int64
	terminal  bool
	success   bool
	output    bool
	fatal     error
}

func (n *nativeRunState) observe(frame Object) {
	if frame["parent_tool_use_id"] != nil || frame["agent_id"] != nil {
		return
	}
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.terminal {
		return
	}
	switch str(frame, "type") {
	case "stream_event":
		event, _ := frame["event"].(Object)
		if str(event, "type") == "message_start" {
			n.output = true
			n.err = nil
			n.requestID = ""
		}
	case "assistant":
		n.requestID = nativeRequestID(str(frame, "request_id"))
		if frame["error"] == nil || frame["error"] == "" {
			n.err = nil
			return
		}
		category := nativeErrorCategory(str(frame, "error"))
		n.err = &nativeError{Status: http.StatusBadGateway, Category: category, Message: "Claude Code native error: " + category, RequestID: n.requestID}
	case "result":
		n.terminal = true
		failed, _ := frame["is_error"].(bool)
		if str(frame, "subtype") == "success" && !failed {
			n.success = true
			n.err = nil
			n.retryAt = 0
			return
		}
		if n.err == nil {
			category := nativeErrorCategory(str(frame, "subtype"))
			n.err = &nativeError{Status: http.StatusBadGateway, Category: category, Message: "Claude Code native error: " + category, RequestID: n.requestID}
		}
		if status, ok := nativeInteger(frame["api_error_status"], 599); ok && status >= 400 {
			n.err.Status = int(status)
			n.err.ObservedStatus = true
		}
		if n.err.Category == "rate_limit" || n.err.Status == http.StatusTooManyRequests {
			n.err.RetryAt = n.retryAt
		}
	case "rate_limit_event":
		info, _ := frame["rate_limit_info"].(Object)
		n.retryAt = 0
		if str(info, "status") == "rejected" {
			n.retryAt = nativeRetryAt(info["resetsAt"])
		}
		if str(info, "overageStatus") == "rejected" {
			n.retryAt = max(n.retryAt, nativeRetryAt(info["overageResetsAt"]))
		}
	}
}

func (n *nativeRunState) failure() error {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.fatal != nil {
		return n.fatal
	}
	if n.err == nil || n.success {
		return nil
	}
	failure := *n.err
	failure.OutputObserved = n.output
	return &failure
}

func (n *nativeRunState) fail(err error) {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.fatal == nil {
		n.fatal = err
	}
}

func (n *nativeRunState) externalFailure() error {
	n.mu.Lock()
	defer n.mu.Unlock()
	return n.fatal
}

func (n *nativeRunState) headers() http.Header {
	n.mu.Lock()
	defer n.mu.Unlock()
	header := make(http.Header)
	if n.requestID != "" {
		header.Set("Request-Id", n.requestID)
	}
	return header
}

func (n *nativeRunState) canFallback() bool {
	n.mu.Lock()
	defer n.mu.Unlock()
	if !n.terminal || n.success || n.output || n.fatal != nil || n.err == nil || !n.err.ObservedStatus {
		return false
	}
	switch n.err.Status {
	case 429, 500, 502, 503, 504, 529:
		return true
	default:
		return false
	}
}

func (n *nativeRunState) reset() {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.err = nil
	n.requestID = ""
	n.retryAt = 0
	n.terminal = false
	n.success = false
	n.output = false
	n.fatal = nil
}

func nativeErrorCategory(category string) string {
	switch category {
	case "authentication_failed", "oauth_org_not_allowed", "account_on_hold", "verification_required", "billing_error", "rate_limit", "overloaded", "invalid_request", "model_not_found", "server_error", "unknown", "max_output_tokens", "cloud_credential_error", "error_during_execution", "error_max_turns", "error_max_budget_usd", "error_max_structured_output_retries":
		return category
	default:
		return "unknown"
	}
}

func nativeRequestID(id string) string {
	if len(id) == 0 || len(id) > 128 {
		return ""
	}
	for _, c := range id {
		if c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c == '_' || c == '-' || c == '.' {
			continue
		}
		return ""
	}
	return id
}

func nativeInteger(value any, maximum int64) (int64, bool) {
	var result int64
	switch value := value.(type) {
	case json.Number:
		parsed, err := value.Int64()
		if err != nil {
			return 0, false
		}
		result = parsed
	case int:
		result = int64(value)
	case int64:
		result = value
	case float64:
		if math.IsNaN(value) || math.IsInf(value, 0) || value < 0 || value > float64(maximum) || math.Trunc(value) != value {
			return 0, false
		}
		result = int64(value)
	default:
		return 0, false
	}
	return result, result >= 0 && result <= maximum
}

func nativeRetryAt(value any) int64 {
	stamp, ok := nativeInteger(value, 253402300799000)
	if !ok {
		return 0
	}
	if stamp >= 1000000000000 {
		stamp /= 1000
	}
	if stamp > 253402300799 {
		return 0
	}
	return stamp
}
