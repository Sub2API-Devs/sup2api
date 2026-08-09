package settlement

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

type fakeSettlementRuntime struct {
	settled *controlv1.SettleRequestRequest
	aborted *controlv1.AbortRequestRequest
}

func (f *fakeSettlementRuntime) SubmitSettlement(request *controlv1.SettleRequestRequest) error {
	f.settled = request
	return nil
}

func (f *fakeSettlementRuntime) AbortRequest(_ context.Context, request *controlv1.AbortRequestRequest) error {
	f.aborted = request
	return nil
}

func TestHandlerSubmitsSettlementAfterStream(t *testing.T) {
	runtime := new(fakeSettlementRuntime)
	handler := &Handler{runtime: runtime}
	state := admittedState()
	state.SetUsageRecordMetadata("fast", "x-high")
	state.MarkUpstreamStarted()
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))
	response := httptest.NewRecorder()

	next := caddyhttp.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) error {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("data: {\"usage\":{\"input_tokens\":11,\"output_to"))
		_, _ = w.Write([]byte("kens\":7,\"cache_creation_input_tokens\":9,\"cache_creation\":{\"ephemeral_5m_input_tokens\":6,\"ephemeral_1h_input_tokens\":3}}}\n\ndata: [DONE]\n\n"))
		return nil
	})
	if err := handler.ServeHTTP(response, request, next); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if runtime.settled == nil {
		t.Fatal("settlement was not submitted")
	}
	if runtime.settled.GetLeaseId() != "lease-1" || runtime.settled.GetUsage().GetResponseBytes() == 0 {
		t.Fatalf("unexpected settlement: %+v", runtime.settled)
	}
	if runtime.settled.GetUsage().GetInputTokens() != 11 || runtime.settled.GetUsage().GetOutputTokens() != 7 {
		t.Fatalf("unexpected observed usage: %+v", runtime.settled.GetUsage())
	}
	if runtime.settled.GetServiceTier() != "priority" || runtime.settled.GetReasoningEffort() != "xhigh" || runtime.settled.GetOpenaiWsMode() {
		t.Fatalf("unexpected usage metadata: %+v", runtime.settled)
	}
	if runtime.settled.GetUsage().GetCacheCreation_5MTokens() != 6 || runtime.settled.GetUsage().GetCacheCreation_1HTokens() != 3 {
		t.Fatalf("unexpected cache TTL usage: %+v", runtime.settled.GetUsage())
	}
	if runtime.aborted != nil {
		t.Fatal("started upstream must not be aborted")
	}
}

func TestHandlerAbortsUnusedLease(t *testing.T) {
	runtime := new(fakeSettlementRuntime)
	handler := &Handler{runtime: runtime}
	state := admittedState()
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))

	if err := handler.ServeHTTP(httptest.NewRecorder(), request, caddyhttp.HandlerFunc(func(http.ResponseWriter, *http.Request) error {
		return nil
	})); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
	if runtime.aborted == nil || runtime.aborted.GetLeaseId() != "lease-1" {
		t.Fatalf("lease was not aborted: %+v", runtime.aborted)
	}
}

func TestLeaseRevocationIsNotReportedAsClientCancellation(t *testing.T) {
	runtime := new(fakeSettlementRuntime)
	handler := &Handler{runtime: runtime}
	state := admittedState()
	state.MarkUpstreamStarted()
	state.SetError("lease_renewal_rejected")
	ctx, cancel := context.WithCancelCause(context.Background())
	cancel(requeststate.ErrLeaseRevoked)
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(ctx, state))
	if err := handler.ServeHTTP(httptest.NewRecorder(), request, caddyhttp.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) error {
		w.WriteHeader(http.StatusBadGateway)
		return nil
	})); err != nil {
		t.Fatal(err)
	}
	if runtime.settled == nil || runtime.settled.GetClientCancelled() || runtime.settled.GetUpstream().GetErrorCode() != "lease_renewal_rejected" {
		t.Fatalf("settlement=%+v", runtime.settled)
	}
}

func TestHandlerPersistsSettlementBeforeStreamingAbortPanicEscapes(t *testing.T) {
	runtime := new(fakeSettlementRuntime)
	handler := &Handler{runtime: runtime}
	state := admittedState()
	state.MarkUpstreamStarted()
	request := httptest.NewRequest(http.MethodPost, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))
	panicked := false
	func() {
		defer func() {
			panicked = recover() == http.ErrAbortHandler
		}()
		_ = handler.ServeHTTP(httptest.NewRecorder(), request, caddyhttp.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) error {
			w.Header().Set("Content-Type", "text/event-stream")
			_, _ = w.Write([]byte("data: {\"usage\":{\"input_tokens\":3}}\n\n"))
			panic(http.ErrAbortHandler)
		}))
	}()
	if !panicked || runtime.settled == nil || runtime.settled.GetUsage().GetInputTokens() != 3 {
		t.Fatalf("panicked=%v settlement=%+v", panicked, runtime.settled)
	}
}

func admittedState() *requeststate.State {
	return &requeststate.State{
		RequestID:      "request-1",
		RequestedModel: "gpt-5.4",
		StartedAt:      time.Now(),
		Admission: &controlv1.OpenRequestResponse{
			Lease: &controlv1.RequestLease{LeaseId: "lease-1", AccountId: 9, PricingVersion: "p1"},
			Plan:  &controlv1.ExecutionPlan{MappedModel: "gpt-5.4-upstream"},
		},
	}
}
