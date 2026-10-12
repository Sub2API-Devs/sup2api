package engine

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"strings"
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeEventTerminalError(t *testing.T) {
	for _, tc := range []struct {
		name     string
		status   any
		want     int
		observed bool
		fallback bool
	}{
		{"absent", nil, 502, false, false},
		{"real rate limit", json.Number("429"), 429, true, true},
		{"real bad request", json.Number("400"), 400, true, false},
		{"real internal error", 500, 500, true, true},
		{"real gateway error", 502, 502, true, true},
		{"real unavailable", float64(503), 503, true, true},
		{"real timeout", int64(504), 504, true, true},
		{"real overload", json.Number("529"), 529, true, true},
		{"nonfallback server error", 501, 501, true, false},
		{"string is not a status", "429", 502, false, false},
		{"fractional", json.Number("429.5"), 502, false, false},
		{"nonerror", 200, 502, false, false},
		{"out of range", 600, 502, false, false},
		{"negative", -1, 502, false, false},
		{"not finite", math.Inf(1), 502, false, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var state nativeRunState
			state.observe(Object{"type": "system", "subtype": "api_retry", "error_status": 503, "error": "server_error"})
			state.observe(Object{"type": "assistant", "error": "rate_limit", "request_id": "req_final"})
			assert.False(t, state.canFallback())
			state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": tc.status, "result": "HTTP 401 Authorization: Bearer private-value"})
			var failure *nativeError
			require.ErrorAs(t, state.failure(), &failure)
			assert.Equal(t, tc.want, failure.Status)
			assert.Equal(t, tc.observed, failure.ObservedStatus)
			assert.Equal(t, tc.fallback, state.canFallback())
			assert.Equal(t, "rate_limit", failure.Category)
			assert.Equal(t, "req_final", failure.RequestID)
			assert.Equal(t, "Claude Code native error: rate_limit", failure.Error())
		})
	}
}

func TestNativeEventUnknownAndPrivateText(t *testing.T) {
	secret := strings.Repeat("Authorization: Bearer private-value\n", 100)
	for _, tc := range []struct {
		name      string
		assistant Object
		result    Object
		category  string
	}{
		{"unknown assistant", Object{"type": "assistant", "error": secret}, Object{"type": "result", "subtype": "success", "is_error": true, "result": secret}, "unknown"},
		{"unclassified result", nil, Object{"type": "result", "subtype": "success", "is_error": true, "result": secret}, "unknown"},
		{"execution error", nil, Object{"type": "result", "subtype": "error_during_execution", "is_error": true, "errors": []any{secret}}, "error_during_execution"},
		{"max turns", nil, Object{"type": "result", "subtype": "error_max_turns", "is_error": false}, "error_max_turns"},
		{"unknown subtype", nil, Object{"type": "result", "subtype": secret, "errors": []any{secret}}, "unknown"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var state nativeRunState
			state.observe(tc.assistant)
			state.observe(tc.result)
			var failure *nativeError
			require.ErrorAs(t, state.failure(), &failure)
			assert.Equal(t, tc.category, failure.Category)
			assert.Equal(t, "Claude Code native error: "+tc.category, failure.Error())
			assert.NotContains(t, fmt.Sprintf("%+v", failure), "private-value")
			assert.Equal(t, 502, failure.Status)
			assert.False(t, failure.ObservedStatus)
			assert.False(t, state.canFallback())
		})
	}
}

func TestNativeEventNeverReplaysObservedOutput(t *testing.T) {
	var state nativeRunState
	state.observe(Object{"type": "stream_event", "event": Object{"type": "message_start"}})
	state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 529})
	require.False(t, state.canFallback())
	var failure *nativeError
	require.ErrorAs(t, state.failure(), &failure)
	assert.True(t, failure.OutputObserved)
	state.reset()
	state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 529})
	assert.True(t, state.canFallback())
}

func TestNativeEventRetryThenSuccess(t *testing.T) {
	var state nativeRunState
	state.observe(Object{"type": "system", "subtype": "api_retry", "error_status": 429, "request_id": "control_retry"})
	require.NoError(t, state.failure())
	assert.Empty(t, state.headers())
	state.observe(Object{"type": "assistant", "error": "overloaded", "request_id": "req_failed"})
	state.observe(Object{"type": "result", "subtype": "success", "is_error": false, "api_error_status": 529})
	state.observe(Object{"type": "system", "subtype": "api_retry", "error_status": 503})
	require.NoError(t, state.failure())
	assert.False(t, state.canFallback())
}

func TestNativeEventSubagentIsolation(t *testing.T) {
	for _, marker := range []Object{{"parent_tool_use_id": "tool_child"}, {"parent_tool_use_id": ""}, {"agent_id": "agent_child"}} {
		var state nativeRunState
		state.observe(Object{"type": "assistant", "request_id": "req_main"})
		for _, frame := range []Object{
			{"type": "assistant", "error": "rate_limit", "request_id": "req_child", "message": Object{"usage": Object{"input_tokens": 999}}},
			{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "resetsAt": 1900000000}},
			{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 429, "modelUsage": Object{"child-model": Object{"inputTokens": 999}}},
		} {
			for k, v := range marker {
				frame[k] = v
			}
			state.observe(frame)
		}
		require.NoError(t, state.failure())
		assert.Equal(t, http.Header{"Request-Id": []string{"req_main"}}, state.headers())
		state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 429})
		var failure *nativeError
		require.ErrorAs(t, state.failure(), &failure)
		assert.Zero(t, failure.RetryAt)
		assert.Equal(t, "req_main", failure.RequestID)
	}
}

func TestNativeEventRequestIDValidation(t *testing.T) {
	var state nativeRunState
	for _, frame := range []Object{
		{"type": "control_request", "request_id": "control_one"},
		{"type": "control_response", "response": Object{"request_id": "control_two"}},
		{"type": "system", "subtype": "control_request_progress", "request_id": "control_three"},
		{"type": "stream_event", "request_id": "unrecognized", "event": Object{"type": "message_start", "message": Object{"id": "msg_not_request_id"}}},
	} {
		state.observe(frame)
		assert.Empty(t, state.headers())
	}
	for _, id := range []string{"req_good\r\nX-Injected: secret", "req_good\n", "req_\x00", " req_good", "请求", strings.Repeat("x", 129)} {
		state.observe(Object{"type": "assistant", "request_id": id})
		assert.Empty(t, state.headers())
	}
	state.observe(Object{"type": "assistant", "request_id": "req_valid-123.a", "parent_tool_use_id": nil})
	header := state.headers()
	header.Set("Request-Id", "mutated")
	assert.Equal(t, "req_valid-123.a", state.headers().Get("Request-Id"))
	state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "request_id": "not_sdk_upstream_id"})
	var failure *nativeError
	require.ErrorAs(t, state.failure(), &failure)
	assert.Equal(t, "req_valid-123.a", failure.RequestID)
}

func TestNativeEventRateLimitIsNotTerminal(t *testing.T) {
	for _, tc := range []struct {
		name string
		info Object
		want int64
	}{
		{"seconds", Object{"status": "rejected", "resetsAt": json.Number("1900000000")}, 1900000000},
		{"milliseconds", Object{"status": "rejected", "resetsAt": json.Number("1900000000123")}, 1900000000},
		{"overage", Object{"status": "rejected", "resetsAt": 1900000000, "overageStatus": "rejected", "overageResetsAt": 1900000100}, 1900000100},
		{"warning", Object{"status": "allowed_warning", "resetsAt": 1900000000}, 0},
		{"invalid", Object{"status": "rejected", "resetsAt": "1900000000"}, 0},
		{"overflow", Object{"status": "rejected", "resetsAt": json.Number("9223372036854775808")}, 0},
		{"fractional", Object{"status": "rejected", "resetsAt": 1900000000.5}, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var state nativeRunState
			state.observe(Object{"type": "rate_limit_event", "rate_limit_info": tc.info})
			require.NoError(t, state.failure())
			assert.False(t, state.canFallback())
			assert.Empty(t, state.headers())
			state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 429})
			var failure *nativeError
			require.ErrorAs(t, state.failure(), &failure)
			assert.Equal(t, tc.want, failure.RetryAt)
			assert.Empty(t, state.headers())
		})
	}
	var state nativeRunState
	state.observe(Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "resetsAt": 1900000000}})
	state.observe(Object{"type": "result", "subtype": "success", "is_error": false})
	require.NoError(t, state.failure())
	assert.False(t, state.canFallback())
}

func TestNativeEventResetAndSnapshots(t *testing.T) {
	var state nativeRunState
	state.observe(Object{"type": "assistant", "error": "server_error", "request_id": "req_old"})
	state.observe(Object{"type": "result", "subtype": "success", "is_error": true, "api_error_status": 503})
	var failure *nativeError
	require.ErrorAs(t, state.failure(), &failure)
	failure.Status = 400
	assert.True(t, state.canFallback())
	var readers sync.WaitGroup
	readers.Add(3)
	go func() { defer readers.Done(); _ = state.failure() }()
	go func() { defer readers.Done(); _ = state.headers() }()
	go func() { defer readers.Done(); _ = state.canFallback() }()
	state.reset()
	readers.Wait()
	require.NoError(t, state.failure())
	assert.Empty(t, state.headers())
	assert.False(t, state.canFallback())
	frame, err := decodeObject([]byte(`{"type":"result","subtype":"success","is_error":true,"api_error_status":529}`))
	require.NoError(t, err)
	state.observe(frame)
	require.ErrorAs(t, state.failure(), &failure)
	assert.Equal(t, 529, failure.Status)
	assert.True(t, state.canFallback())
}
