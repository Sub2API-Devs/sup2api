package lease

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

type fakeLeaseRuntime struct {
	renewed chan *controlv1.RenewLeaseRequest
	result  *controlv1.RenewLeaseResponse
	err     error
}

func (f *fakeLeaseRuntime) RenewLease(_ context.Context, request *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error) {
	select {
	case f.renewed <- request:
	default:
	}
	if f.err != nil {
		return nil, f.err
	}
	if f.result != nil {
		return f.result, nil
	}
	return &controlv1.RenewLeaseResponse{Renewed: true, ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli()}, nil
}

func TestHandlerCancelsUpstreamWhenRenewalIsRejected(t *testing.T) {
	runtime := &fakeLeaseRuntime{
		renewed: make(chan *controlv1.RenewLeaseRequest, 1),
		result:  &controlv1.RenewLeaseResponse{Renewed: false},
	}
	handler := &Handler{RenewInterval: caddy.Duration(time.Millisecond), runtime: runtime}
	state := &requeststate.State{
		RequestID: "request-rejected",
		Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{
			LeaseId: "lease-rejected", ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
		}},
	}
	request := httptest.NewRequest(http.MethodGet, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))
	var cause error
	next := caddyhttp.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) error {
		select {
		case <-request.Context().Done():
			cause = context.Cause(request.Context())
			return nil
		case <-time.After(time.Second):
			return errors.New("lease rejection did not cancel upstream context")
		}
	})
	if err := handler.ServeHTTP(httptest.NewRecorder(), request, next); err != nil {
		t.Fatal(err)
	}
	if !errors.Is(cause, requeststate.ErrLeaseRevoked) || state.Finish().ErrorCode != "lease_renewal_rejected" {
		t.Fatalf("cause=%v snapshot=%+v", cause, state.Finish())
	}
}

func TestHandlerCancelsAtExpiryAfterTransientRenewalFailures(t *testing.T) {
	runtime := &fakeLeaseRuntime{renewed: make(chan *controlv1.RenewLeaseRequest, 1), err: errors.New("temporary RPC failure")}
	handler := &Handler{RenewInterval: caddy.Duration(time.Millisecond), runtime: runtime}
	state := &requeststate.State{
		RequestID: "request-expired",
		Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{
			LeaseId: "lease-expired", ExpiresAtUnixMs: time.Now().Add(15 * time.Millisecond).UnixMilli(),
		}},
	}
	request := httptest.NewRequest(http.MethodGet, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))
	next := caddyhttp.HandlerFunc(func(_ http.ResponseWriter, request *http.Request) error {
		select {
		case <-request.Context().Done():
			return nil
		case <-time.After(time.Second):
			return errors.New("expired lease did not cancel upstream context")
		}
	})
	if err := handler.ServeHTTP(httptest.NewRecorder(), request, next); err != nil {
		t.Fatal(err)
	}
	if state.Finish().ErrorCode != "lease_expired" {
		t.Fatalf("snapshot=%+v", state.Finish())
	}
}

func TestHandlerRenewsLongLivedLease(t *testing.T) {
	runtime := &fakeLeaseRuntime{renewed: make(chan *controlv1.RenewLeaseRequest, 1)}
	handler := &Handler{RenewInterval: caddy.Duration(time.Millisecond), runtime: runtime}
	state := &requeststate.State{
		RequestID: "request-1",
		Admission: &controlv1.OpenRequestResponse{Lease: &controlv1.RequestLease{
			LeaseId:         "lease-1",
			ExpiresAtUnixMs: time.Now().Add(time.Minute).UnixMilli(),
		}},
	}
	request := httptest.NewRequest(http.MethodGet, "http://gateway.test/v1/responses", nil)
	request = request.WithContext(requeststate.WithContext(request.Context(), state))

	next := caddyhttp.HandlerFunc(func(http.ResponseWriter, *http.Request) error {
		select {
		case renewed := <-runtime.renewed:
			if renewed.GetLeaseId() != "lease-1" || renewed.GetRequestId() != "request-1" {
				t.Fatalf("renew request = %+v", renewed)
			}
		case <-time.After(time.Second):
			t.Fatal("lease was not renewed")
		}
		return nil
	})

	if err := handler.ServeHTTP(httptest.NewRecorder(), request, next); err != nil {
		t.Fatalf("ServeHTTP: %v", err)
	}
}
