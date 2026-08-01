package admission

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

type fakeAdmissionRuntime struct {
	request  *controlv1.OpenRequestRequest
	response *controlv1.OpenRequestResponse
	err      error
}

func (f *fakeAdmissionRuntime) OpenRequest(_ context.Context, request *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error) {
	f.request = request
	return f.response, f.err
}

func TestHandlerAdmitsAndPreservesRequestBody(t *testing.T) {
	body := `{"model":"gpt-5.4","stream":true,"max_output_tokens":2048,"input":"hello"}`
	runtime := &fakeAdmissionRuntime{
		response: &controlv1.OpenRequestResponse{
			Decision: controlv1.Decision_DECISION_ALLOW,
			Lease:    &controlv1.RequestLease{LeaseId: "lease-1", AccountId: 9, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli()},
			Plan:     &controlv1.ExecutionPlan{UpstreamUrl: "https://example.test/responses"},
		},
	}
	handler := &Handler{runtime: runtime}
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", strings.NewReader(body))
	request.Header.Set("Anthropic-Beta", " context-management-2025-06-27 ")
	request = request.WithContext(requeststate.WithContext(request.Context(), &requeststate.State{
		RequestID: "request-1",
		ClientIP:  "127.0.0.1",
		Auth:      &requeststate.AuthGrant{GrantToken: "grant-1", APIKeyID: 11, UserID: 12, GroupID: 13},
	}))
	response := httptest.NewRecorder()

	called := false
	next := caddyhttp.HandlerFunc(func(w http.ResponseWriter, r *http.Request) error {
		called = true
		state, ok := requeststate.FromContext(r.Context())
		if !ok || state.Admission.GetLease().GetLeaseId() != "lease-1" {
			t.Fatal("admission state missing")
		}
		preserved, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read preserved body: %v", err)
		}
		if string(preserved) != body {
			t.Fatalf("body = %q", preserved)
		}
		w.WriteHeader(http.StatusNoContent)
		return nil
	})

	if err := handler.ServeHTTP(response, request, next); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if !called {
		t.Fatal("next handler was not called")
	}
	if runtime.request.GetAuthGrantToken() != "grant-1" || runtime.request.GetApiKeyId() != 11 || runtime.request.GetRequestedModel() != "gpt-5.4" || !runtime.request.GetStream() || runtime.request.GetMaxOutputTokens() != 2048 {
		t.Fatalf("unexpected admission request: %+v", runtime.request)
	}
	if runtime.request.GetAnthropicBeta() != "context-management-2025-06-27" {
		t.Fatalf("anthropic beta metadata = %q", runtime.request.GetAnthropicBeta())
	}
	state, _ := requeststate.FromContext(request.Context())
	if got := body[state.ModelValueStart:state.ModelValueEnd]; got != `"gpt-5.4"` {
		t.Fatalf("model range = %q (%d:%d)", got, state.ModelValueStart, state.ModelValueEnd)
	}
}

func TestHandlerWritesProtocolSpecificDenial(t *testing.T) {
	runtime := &fakeAdmissionRuntime{
		response: &controlv1.OpenRequestResponse{
			Decision: controlv1.Decision_DECISION_DENY,
			Denial: &controlv1.Denial{
				HttpStatus:        http.StatusTooManyRequests,
				ErrorCode:         "RATE_LIMITED",
				Message:           "retry later",
				RetryAfterSeconds: 7,
			},
		},
	}
	handler := &Handler{runtime: runtime}
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", strings.NewReader(`{"model":"claude"}`))
	request = request.WithContext(requeststate.WithContext(request.Context(), &requeststate.State{
		RequestID: "request-1",
		ClientIP:  "127.0.0.1",
		Auth:      &requeststate.AuthGrant{GrantToken: "grant-1", APIKeyID: 11, UserID: 12, GroupID: 13},
	}))
	response := httptest.NewRecorder()

	if err := handler.ServeHTTP(response, request, caddyhttp.HandlerFunc(func(http.ResponseWriter, *http.Request) error {
		t.Fatal("denied request reached next handler")
		return nil
	})); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if response.Code != http.StatusTooManyRequests || response.Header().Get("Retry-After") != "7" {
		t.Fatalf("status=%d retry-after=%q", response.Code, response.Header().Get("Retry-After"))
	}
	if !strings.Contains(response.Body.String(), `"type":"error"`) {
		t.Fatalf("not an Anthropic error: %s", response.Body.String())
	}
}

func TestReadRequestMetadataExtractsAnthropicOAuthSignals(t *testing.T) {
	body := `{"model":"claude-sonnet-4-5","system":[{"type":"text","text":"x-anthropic-billing-header: cc_version=2.1.220.abc; cc_entrypoint=cli;"}],"metadata":{"user_id":"user_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_account__session_12345678-1234-1234-1234-123456789abc"},"messages":[]}`
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", strings.NewReader(body))
	metadata := readRequestMetadata(request)
	if !metadata.AnthropicBillingAttribution {
		t.Fatal("billing attribution was not detected")
	}
	if !strings.HasPrefix(metadata.AnthropicMetadataUserID, "user_0123456789abcdef") {
		t.Fatalf("metadata user id = %q", metadata.AnthropicMetadataUserID)
	}
	preserved, err := io.ReadAll(request.Body)
	if err != nil || string(preserved) != body {
		t.Fatalf("body was not preserved: %q err=%v", preserved, err)
	}
}
