package engine

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeErrorHeadersRequireObservedStatus(t *testing.T) {
	for _, tc := range []struct {
		name              string
		observed, refusal bool
		status            int
		kind, scope       string
	}{
		{"unknown", false, false, 502, "api_error", "request"},
		{"bad request", true, false, 400, "invalid_request_error", ""},
		{"authentication", true, false, 401, "authentication_error", ""},
		{"permission", true, false, 403, "permission_error", ""},
		{"not found", true, false, 404, "not_found_error", ""},
		{"rate limit", true, false, 429, "rate_limit_error", ""},
		{"overload", true, false, 529, "overloaded_error", ""},
		{"request refusal", true, true, 429, "rate_limit_error", "request"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest("POST", "/v1/messages", nil)
			x := &exchange{w: w, r: r, req: &Request{}, diagnostic: newRequestDiagnostic(w, r)}
			var err error = &nativeError{Status: tc.status, Category: "rate_limit", Message: "Claude Code native error: rate_limit", RequestID: "req_native", ObservedStatus: tc.observed, RetryAt: time.Now().Unix() + 60}
			if tc.refusal {
				err = errors.Join(err, &requestRefusal{errors.New("request refused")})
			}
			x.runFailed(context.Background(), err)
			assert.Equal(t, tc.status, w.Code)
			assert.Equal(t, "cli", w.Header().Get("X-CCGateway-Error-Source"))
			assert.Equal(t, "rate_limit", w.Header().Get("X-CCGateway-CLI-Error"))
			assert.Equal(t, tc.scope, w.Header().Get(errorScopeHeader))
			assert.Equal(t, "req_native", w.Header().Get("Request-Id"))
			body, decodeErr := decodeObject(w.Body.Bytes())
			require.NoError(t, decodeErr)
			assert.Equal(t, tc.kind, str(body["error"].(Object), "type"))
			if tc.status == 429 && tc.observed {
				delay, err := strconv.Atoi(w.Header().Get("Retry-After"))
				require.NoError(t, err)
				assert.GreaterOrEqual(t, delay, 1)
				assert.LessOrEqual(t, delay, 60)
			} else {
				assert.Empty(t, w.Header().Get("Retry-After"))
			}
		})
	}
}

func TestNativeErrorAfterStreamCannotRewriteHTTPHeaders(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	x := &exchange{w: w, r: r, req: &Request{Stream: true}, diagnostic: newRequestDiagnostic(w, r), streaming: true}
	w.Header().Set("Content-Type", "text/event-stream")
	w.WriteHeader(200)
	before := w.Result().Header.Clone()
	x.runFailed(context.Background(), &nativeError{Status: 429, Category: "rate_limit", Message: "Claude Code native error: rate_limit", ObservedStatus: true, RequestID: "req_late", RetryAt: time.Now().Unix() + 60})
	assert.Equal(t, 200, w.Result().StatusCode)
	for _, header := range []string{"Retry-After", "Request-Id", "X-CCGateway-Error-Source", errorScopeHeader} {
		assert.Equal(t, before.Get(header), w.Result().Header.Get(header), header)
	}
	assert.Contains(t, w.Body.String(), "event: error")
	assert.Contains(t, w.Body.String(), "Claude Code native error: rate_limit")
}

func TestRealCLINativeErrorHeaders(t *testing.T) {
	for _, status := range []int{400, 429, 529} {
		t.Run(fmt.Sprint(status), func(t *testing.T) {
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Request-Id", "provider-error-id")
				w.Header().Set("Retry-After", "7")
				w.Header().Set("Anthropic-Ratelimit-Requests-Remaining", "0")
				w.Header().Set("Set-Cookie", "must-not-leak")
				w.Header().Set("Authorization", "must-not-leak")
				w.WriteHeader(status)
				fmt.Fprint(w, `{"type":"error","error":{"type":"fixture_error","message":"original fixture"}}`)
			})
			req, err := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustServerJSON(basic())))
			require.NoError(t, err)
			req.Header = policyHeaders(defaultRequestPolicy())
			res, err := http.DefaultClient.Do(req)
			require.NoError(t, err)
			defer res.Body.Close()
			raw, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			assert.Equal(t, status, res.StatusCode, string(raw))
			assert.Equal(t, "provider-error-id", res.Header.Get("Request-Id"))
			assert.Equal(t, "cli", res.Header.Get("X-CCGateway-Error-Source"))
			assert.Contains(t, string(raw), "Claude Code native error:")
			assert.NotContains(t, string(raw), "original fixture")
			for _, header := range []string{"Retry-After", "Set-Cookie", "Authorization", "Anthropic-Ratelimit-Requests-Remaining"} {
				assert.Empty(t, res.Header.Get(header), header)
			}
			wantCalls := int32(1)
			if status == http.StatusBadRequest {
				wantCalls = 2
			}
			assert.Equal(t, wantCalls, calls.Load(), "native 400 compatibility recovery must remain bounded")
		})
	}
}
