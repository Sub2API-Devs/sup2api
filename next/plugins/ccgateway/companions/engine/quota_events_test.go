package engine

import (
	"context"
	"errors"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/stretchr/testify/require"
)

func quotaEventFailure(t *testing.T, frames ...Object) *nativeError {
	t.Helper()
	var state nativeRunState
	for _, frame := range frames {
		state.observe(frame)
	}
	var failure *nativeError
	require.ErrorAs(t, state.failure(), &failure)
	return failure
}

func TestNativeQuotaScopeStructuredOnly(t *testing.T) {
	for _, tc := range []struct {
		name string
		info Object
		want string
	}{
		{"fable", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "resetsAt": 1900000000}, "seven_day_overage_included"},
		{"sonnet", Object{"status": "rejected", "rateLimitType": "seven_day_sonnet", "resetsAt": 1900000000, "isUsingOverage": false, "overageStatus": "rejected"}, "seven_day_sonnet"},
		{"shared", Object{"status": "rejected", "rateLimitType": "seven_day"}, "seven_day"},
		{"five hour", Object{"status": "rejected", "rateLimitType": "five_hour"}, "five_hour"},
		{"missing scope", Object{"status": "rejected", "resetsAt": 1900000000}, ""},
		{"unknown scope", Object{"status": "rejected", "rateLimitType": "seven_day_opus"}, ""},
		{"friendly name is not scope", Object{"status": "rejected", "rateLimitType": "Fable"}, ""},
		{"header spoof", Object{"status": "rejected", "headers": Object{httpfacts.NativeQuotaTypeHeader: "seven_day_overage_included"}}, ""},
		{"text spoof", Object{"status": "rejected", "message": "Fable weekly limit exhausted"}, ""},
		{"warning", Object{"status": "allowed_warning", "rateLimitType": "seven_day_overage_included"}, ""},
		{"extra active", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "isUsingOverage": true}, ""},
		{"extra allowed", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "overageStatus": "allowed"}, ""},
		{"extra malformed", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "isUsingOverage": "false"}, ""},
		{"extra unknown", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "overageStatus": "future"}, ""},
		{"malformed reset", Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "resetsAt": "tomorrow"}, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			failure := quotaEventFailure(t, Object{"type": "rate_limit_event", "rate_limit_info": tc.info}, Object{"type": "assistant", "error": "rate_limit"}, Object{"type": "result", "is_error": true, "api_error_status": 429})
			require.Equal(t, tc.want, failure.QuotaType)
			w := httptest.NewRecorder()
			r := httptest.NewRequest("POST", "/v1/messages", nil)
			x := &exchange{w: w, r: r, req: &Request{}, diagnostic: newRequestDiagnostic(w, r)}
			x.runFailed(context.Background(), failure)
			require.Equal(t, 429, w.Code)
			require.Equal(t, tc.want, w.Header().Get(httpfacts.NativeQuotaTypeHeader))
			if tc.want != "" {
				require.Equal(t, "429", w.Header().Get(httpfacts.NativeObservedStatusHeader))
			}
		})
	}
}

func TestNativeQuotaRequiresObservedRateLimitAndMainAgent(t *testing.T) {
	info := Object{"status": "rejected", "rateLimitType": "seven_day_overage_included", "resetsAt": 1900000000}
	for _, tc := range []struct {
		name, category string
		status         int
		marker         Object
		output         bool
	}{
		{"unobserved", "rate_limit", 0, nil, false},
		{"authentication", "authentication_failed", 401, nil, false},
		{"unknown category", "unknown", 429, nil, false},
		{"subagent", "rate_limit", 429, Object{"agent_id": "child"}, false},
		{"parent tool", "rate_limit", 429, Object{"parent_tool_use_id": "child"}, false},
		{"output begun", "rate_limit", 429, nil, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			frame := Object{"type": "rate_limit_event", "rate_limit_info": info}
			for key, value := range tc.marker {
				frame[key] = value
			}
			frames := []Object{frame}
			if tc.output {
				frames = append(frames, Object{"type": "stream_event", "event": Object{"type": "message_start"}})
			}
			frames = append(frames, Object{"type": "assistant", "error": tc.category}, Object{"type": "result", "is_error": true, "api_error_status": tc.status})
			failure := quotaEventFailure(t, frames...)
			require.Empty(t, failure.QuotaType)
		})
	}
}

func TestNativeQuotaSharedOverridesScopedAndUnknownDoesNotBypass(t *testing.T) {
	for _, kinds := range [][]string{{"seven_day_overage_included", "seven_day"}, {"seven_day", "seven_day_overage_included"}, {"unknown", "seven_day_overage_included"}, {"seven_day_sonnet", "seven_day_overage_included"}} {
		var frames []Object
		for _, kind := range kinds {
			frames = append(frames, Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "rateLimitType": kind}})
		}
		frames = append(frames, Object{"type": "assistant", "error": "rate_limit"}, Object{"type": "result", "is_error": true, "api_error_status": 429})
		failure := quotaEventFailure(t, frames...)
		want := ""
		if kinds[0] == "seven_day" || kinds[1] == "seven_day" {
			want = "seven_day"
		}
		require.Equal(t, want, failure.QuotaType)
	}
	failure := quotaEventFailure(t, Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "rateLimitType": "seven_day_overage_included"}}, Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "allowed"}}, Object{"type": "assistant", "error": "rate_limit"}, Object{"type": "result", "is_error": true, "api_error_status": 429})
	require.Empty(t, failure.QuotaType)
}

func TestNativeQuotaStateDoesNotLeakAcrossRuns(t *testing.T) {
	var state nativeRunState
	state.observe(Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "rateLimitType": "seven_day_overage_included"}})
	state.observe(Object{"type": "assistant", "error": "rate_limit"})
	state.observe(Object{"type": "result", "is_error": true, "api_error_status": 429})
	var failure *nativeError
	require.ErrorAs(t, state.failure(), &failure)
	require.NotEmpty(t, failure.QuotaType)
	failure.QuotaType = "forged"
	require.ErrorAs(t, state.failure(), &failure)
	require.Equal(t, "seven_day_overage_included", failure.QuotaType)
	state.reset()
	state.observe(Object{"type": "assistant", "error": "rate_limit"})
	state.observe(Object{"type": "result", "is_error": true, "api_error_status": 429})
	require.ErrorAs(t, state.failure(), &failure)
	require.Empty(t, failure.QuotaType)
	state.reset()
	state.observe(Object{"type": "rate_limit_event", "rate_limit_info": Object{"status": "rejected", "rateLimitType": "seven_day_overage_included"}})
	state.observe(Object{"type": "result", "subtype": "success", "is_error": false})
	require.NoError(t, state.failure())
	require.Empty(t, state.quotaType)
}

func TestNativeQuotaMarkerNotWrittenForRefusalOrStream(t *testing.T) {
	for _, stream := range []bool{false, true} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/v1/messages", nil)
		x := &exchange{w: w, r: r, req: &Request{}, streaming: stream, diagnostic: newRequestDiagnostic(w, r)}
		var failure error = &nativeError{Status: 429, Category: "rate_limit", Message: "native failure", ObservedStatus: true, QuotaType: "seven_day_overage_included", RetryAt: 1900000000}
		if !stream {
			failure = errors.Join(failure, &requestRefusal{errors.New("refused")})
		}
		x.runFailed(context.Background(), failure)
		require.Empty(t, w.Header().Get(httpfacts.NativeQuotaTypeHeader))
		require.Empty(t, w.Header().Get(httpfacts.NativeObservedStatusHeader))
	}
}
