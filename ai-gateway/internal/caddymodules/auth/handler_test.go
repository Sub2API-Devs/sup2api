package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

type fakeAuthRuntime struct {
	request  *controlv1.ResolveAPIKeyResponse
	apiKey   string
	response *controlv1.ResolveAPIKeyResponse
	err      error
}

func (f *fakeAuthRuntime) ResolveAPIKey(_ context.Context, _ string, apiKey string) (*controlv1.ResolveAPIKeyResponse, bool, error) {
	f.apiKey = apiKey
	return f.response, false, f.err
}

func TestHandlerResolvesGrantEnforcesIPAndStripsCredential(t *testing.T) {
	runtime := &fakeAuthRuntime{response: allowedGrant([]string{"127.0.0.0/8"}, nil)}
	handler := &Handler{runtime: runtime}
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request.RemoteAddr = "127.0.0.9:5000"
	request.Header.Set("Authorization", "Bearer client-key")
	request = request.WithContext(requeststate.WithContext(request.Context(), &requeststate.State{RequestID: "request-1"}))

	called := false
	next := caddyhttp.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) error {
		called = true
		state, ok := requeststate.FromContext(request.Context())
		if !ok || state.Auth == nil || state.Auth.GrantToken != "grant-1" || state.ClientIP != "127.0.0.9" {
			t.Fatalf("auth state = %+v", state)
		}
		if request.Header.Get("Authorization") != "" {
			t.Fatal("plaintext credential remained in downstream request")
		}
		return nil
	})
	if err := handler.ServeHTTP(httptest.NewRecorder(), request, next); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if !called || runtime.apiKey != "client-key" {
		t.Fatalf("called=%v apiKey=%q", called, runtime.apiKey)
	}
}

func TestHandlerRejectsBlacklistedIP(t *testing.T) {
	runtime := &fakeAuthRuntime{response: allowedGrant(nil, []string{"192.0.2.0/24"})}
	handler := &Handler{runtime: runtime}
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/messages", nil)
	request.RemoteAddr = "192.0.2.10:5000"
	request.Header.Set("x-api-key", "client-key")
	request = request.WithContext(requeststate.WithContext(request.Context(), &requeststate.State{RequestID: "request-1"}))
	response := httptest.NewRecorder()

	if err := handler.ServeHTTP(response, request, caddyhttp.HandlerFunc(func(http.ResponseWriter, *http.Request) error {
		t.Fatal("blacklisted request reached next handler")
		return nil
	})); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "ACCESS_DENIED") {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}

func allowedGrant(whitelist, blacklist []string) *controlv1.ResolveAPIKeyResponse {
	return &controlv1.ResolveAPIKeyResponse{
		Decision: controlv1.Decision_DECISION_ALLOW,
		Grant: &controlv1.AuthGrant{
			GrantToken:       "grant-1",
			CredentialDigest: "digest",
			ApiKeyId:         11,
			UserId:           12,
			GroupId:          13,
			ExpiresAtUnixMs:  time.Now().Add(time.Minute).UnixMilli(),
			IpWhitelist:      whitelist,
			IpBlacklist:      blacklist,
		},
	}
}
