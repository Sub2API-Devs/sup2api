package gateway

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type admissionSpy struct {
	*fakeBalance
	calls  int
	record *core.UsageRecord
	err    error
}

func (s *admissionSpy) PreConsumeTokens(context.Context) (int64, error) { return 1234, nil }
func (s *admissionSpy) Precharge(_ context.Context, r *core.UsageRecord) error {
	s.calls++
	s.record = r
	return s.err
}

type unimplementedEstimator struct {
	*fakePlatform
}

func (u *unimplementedEstimator) EstimateUsage(context.Context, *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error) {
	return nil, status.Error(codes.Unimplemented, "EstimateUsage not implemented")
}

func TestPrechargeBeforeUpstream(t *testing.T) {
	e := newEnv(t)
	spy := &admissionSpy{fakeBalance: e.balance, err: core.ErrInsufficientBalance}
	e.gw.d.Balance = spy
	r := e.messages(body(testModel, false))
	if r.status < 400 || spy.calls != 1 {
		t.Fatalf("response %d calls %d", r.status, spy.calls)
	}
	if spy.record.Tokens.Input < 1234 {
		t.Fatalf("floor not applied: %+v", spy.record.Tokens)
	}
	if len(e.up.keys()) != 0 || e.plat.buildCount() != 0 || len(e.accounts.lastTypes) != 0 {
		t.Fatal("denied precharge reached upstream or scheduling")
	}
	e.record()
}

func TestBillingMismatchDoesNotInvokePrecharge(t *testing.T) {
	e := newEnv(t)
	spy := &admissionSpy{fakeBalance: e.balance}
	e.gw.d.Balance = spy
	e.pricer.rules[testModel].VideoOnly = true
	r := e.messages(body(testModel, false))
	if r.status != 400 || spy.calls != 0 {
		t.Fatalf("response %d calls %d", r.status, spy.calls)
	}
	e.record()
}

func TestMissingBillingGateRejectsBeforeUpstream(t *testing.T) {
	e := newEnv(t)
	e.gw.d.Balance = nil
	r := e.messages(body(testModel, false))
	if r.status != 500 {
		t.Fatalf("response %d", r.status)
	}
	if len(e.up.keys()) != 0 || e.plat.buildCount() != 0 || len(e.accounts.lastTypes) != 0 {
		t.Fatal("missing billing gate reached upstream or scheduling")
	}
	e.record()
}

func TestEstimateUsageUnimplementedFallbackToLocalTokenizer(t *testing.T) {
	e := newEnv(t)
	spy := &admissionSpy{fakeBalance: e.balance}
	e.gw.d.Balance = spy

	// Replace the plugin client with one that returns Unimplemented
	pb := e.gen.platforms[0]
	pb.Client = &unimplementedEstimator{fakePlatform: e.plat}
	e.gen.platforms[0] = pb

	r := e.messages(body(testModel, false))
	if r.status >= 400 {
		t.Fatalf("expected success, got status %d: %s", r.status, r.body)
	}
	if spy.calls != 1 {
		t.Fatalf("expected precharge call, got %d calls", spy.calls)
	}
	// Should use local tokenizer fallback, so input tokens should be >= floor
	if spy.record.Tokens.Input < 1234 {
		t.Fatalf("floor not applied with Unimplemented fallback: %+v", spy.record.Tokens)
	}
	e.record()
}

func TestEstimateUsageUnimplementedTaskSubmitReturnsError(t *testing.T) {
	e := newEnv(t)
	spy := &admissionSpy{fakeBalance: e.balance}
	e.gw.d.Balance = spy

	// Replace the plugin client with one that returns Unimplemented
	pb := e.gen.platforms[0]
	pb.Client = &unimplementedEstimator{fakePlatform: e.plat}
	e.gen.platforms[0] = pb

	// Use a task.submit endpoint
	r := e.do("/v1/task/submit", body(testModel, false), nil)
	if r.status < 400 {
		t.Fatalf("expected error for task.submit with Unimplemented, got status %d", r.status)
	}
	if spy.calls != 0 {
		t.Fatalf("expected no precharge call for task.submit error, got %d calls", spy.calls)
	}
	e.noRecord()
}
