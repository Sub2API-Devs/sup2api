package gateway

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	standardtransport "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/caddymodules/transports/standard"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/upstreamtransport"
	"github.com/caddyserver/caddy/v2"
)

func TestHandlerProxiesExecutionPlanWithoutClientCredential(t *testing.T) {
	requestBody := `{"model":"gpt-client","input":"hello"}`
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("X-Protocol-Request"); got != "transformed" {
			t.Errorf("protocol request hook header = %q", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer upstream-token" {
			t.Errorf("upstream Authorization = %q", got)
		}
		if got := r.Header.Get("x-api-key"); got != "" {
			t.Errorf("client API key leaked upstream: %q", got)
		}
		if r.URL.Path != "/provider/responses" {
			t.Errorf("upstream path = %q", r.URL.Path)
		}
		body, _ := io.ReadAll(r.Body)
		if string(body) != `{"model":"gpt-upstream","input":"hello"}` {
			t.Errorf("upstream body = %q", body)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer upstream.Close()

	standard := new(standardtransport.Transport)
	if err := standard.Provision(caddy.Context{}); err != nil {
		t.Fatalf("provision standard transport: %v", err)
	}
	defer standard.Cleanup()
	handler := &Handler{
		transports: map[string]upstreamtransport.Factory{"standard": standard},
		protocols:  map[string]protocoltransform.Transformer{"tracking": trackingTransformer{}},
	}

	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", strings.NewReader(requestBody))
	request.Header.Set("Authorization", "Bearer client-key")
	request.Header.Set("x-api-key", "client-key")
	state := &requeststate.State{
		RequestID:       "request-1",
		RequestedModel:  "gpt-client",
		ModelValueStart: int64(strings.Index(requestBody, `"gpt-client"`)),
		ModelValueEnd:   int64(strings.Index(requestBody, `"gpt-client"`) + len(`"gpt-client"`)),
		Admission: &controlv1.OpenRequestResponse{
			Lease: &controlv1.RequestLease{LeaseId: "lease-1"},
			Plan: &controlv1.ExecutionPlan{
				UpstreamUrl:     upstream.URL + "/provider/responses",
				MappedModel:     "gpt-upstream",
				ProtocolProfile: "tracking",
				UpstreamHeaders: map[string]string{
					"Authorization": "Bearer upstream-token",
				},
			},
		},
	}
	request = request.WithContext(requeststate.WithContext(request.Context(), state))
	response := httptest.NewRecorder()

	if err := handler.ServeHTTP(response, request, nil); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if response.Code != http.StatusOK || response.Body.String() != `{"ok":true}` {
		t.Fatalf("response status=%d body=%s", response.Code, response.Body.String())
	}
	if got := response.Header().Get("X-Protocol-Response"); got != "transformed" {
		t.Fatalf("protocol response hook header = %q", got)
	}
}

type trackingTransformer struct{}

func (trackingTransformer) TransformRequest(request *http.Request, _ *controlv1.ExecutionPlan, _ *requeststate.State) error {
	request.Header.Set("X-Protocol-Request", "transformed")
	return nil
}

func (trackingTransformer) TransformResponse(response *http.Response, _ *controlv1.ExecutionPlan, _ *requeststate.State) error {
	response.Header.Set("X-Protocol-Response", "transformed")
	return nil
}
