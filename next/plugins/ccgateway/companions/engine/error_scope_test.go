package engine

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNativeFailurePreservesNormalizedAccountFacts(t *testing.T) {
	for _, tc := range []struct {
		name     string
		err      error
		status   int
		scope    string
		category string
	}{
		{"observed quota", &nativeError{Status: 429, Category: "rate_limit", Message: "Claude Code native error: rate_limit", ObservedStatus: true, RetryAt: time.Now().Add(30 * 24 * time.Hour).Unix()}, 429, "", "rate_limit"},
		{"unobserved authentication", &nativeError{Status: 502, Category: "authentication_failed", Message: "Claude Code native error: authentication_failed"}, 502, "request", "authentication_failed"},
		{"observed billing", &nativeError{Status: 400, Category: "billing_error", Message: "Claude Code native error: billing_error", ObservedStatus: true}, 400, "", "billing_error"},
		{"local search failure", &requestRefusal{&nativeError{Status: 429, Category: "rate_limit", Message: "Claude Code native error: rate_limit", ObservedStatus: true}}, 429, "request", "rate_limit"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			x := &exchange{w: w, r: httptest.NewRequest(http.MethodPost, "/v1/messages", nil), diagnostic: &requestDiagnostic{fields: Object{}}}
			x.runFailed(context.Background(), tc.err)
			require.Equal(t, tc.status, w.Code)
			require.Equal(t, tc.scope, w.Header().Get(errorScopeHeader))
			require.Equal(t, "cli", w.Header().Get("X-CCGateway-Error-Source"))
			require.Equal(t, tc.category, w.Header().Get("X-CCGateway-CLI-Error"))
			if tc.name == "observed quota" {
				require.Equal(t, "604800", w.Header().Get("Retry-After"))
			}
		})
	}
}

// A relay refusal is scoped to the request, so the host keeps the account in
// service; other failures and passed-through API errors are not, and an API
// response cannot claim the scope.
func TestRequestRefusalErrorScope(t *testing.T) {
	run := func(e error) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		x := &exchange{w: w, r: httptest.NewRequest(http.MethodPost, "/v1/messages", nil), diagnostic: &requestDiagnostic{directory: t.TempDir(), fields: Object{}}}
		x.runFailed(context.Background(), e)
		return w
	}
	refusal := &requestRefusal{fmt.Errorf("cannot prepare the upstream request: %w", errors.New("client user turn 3: client user block sequence changed"))}
	if w := run(fmt.Errorf("run: %w", refusal)); w.Code != 502 || w.Header().Get(errorScopeHeader) != "request" {
		t.Fatalf("refusal: %d %q", w.Code, w.Header().Get(errorScopeHeader))
	}
	if w := run(errors.New("Claude Code exited")); w.Header().Get(errorScopeHeader) != "" {
		t.Fatal("other failure scoped to the request")
	}
	forged := &upstreamError{Status: 500, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"x"}}`),
		Headers: http.Header{errorScopeHeader: {"request"}}}
	if w := run(forged); w.Code != 500 || w.Header().Get(errorScopeHeader) != "" {
		t.Fatalf("API error claimed the request scope: %d %q", w.Code, w.Header().Get(errorScopeHeader))
	}
}
