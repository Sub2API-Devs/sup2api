package gateway

import (
	"context"
	"testing"

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
