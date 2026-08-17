package requestid

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func TestHandlerPreservesValidRequestIDAndInitializesState(t *testing.T) {
	handler := new(Handler)
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request.Header.Set("X-Request-ID", "client-request_123")
	response := httptest.NewRecorder()

	next := caddyhttp.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) error {
		state, ok := requeststate.FromContext(request.Context())
		if !ok || state.RequestID != "client-request_123" || state.StartedAt.IsZero() {
			t.Fatalf("request state = %+v", state)
		}
		return nil
	})
	if err := handler.ServeHTTP(response, request, next); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if got := response.Header().Get("X-Request-ID"); got != "client-request_123" {
		t.Fatalf("response request ID = %q", got)
	}
}

func TestHandlerReplacesUnsafeRequestID(t *testing.T) {
	handler := new(Handler)
	request := httptest.NewRequest(http.MethodGet, "http://gateway.test/v1/responses", nil)
	request.Header.Set("X-Request-ID", "unsafe request id")
	response := httptest.NewRecorder()

	var generated string
	err := handler.ServeHTTP(response, request, caddyhttp.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) error {
		generated = request.Header.Get("X-Request-ID")
		return nil
	}))
	if err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if generated == "" || generated == "unsafe request id" || !validRequestID(generated) {
		t.Fatalf("generated request ID = %q", generated)
	}
}
