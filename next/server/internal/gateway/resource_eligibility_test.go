package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type firstIneligibleResourceTransport struct {
	core.ProviderResourceTransport
	probes atomic.Int32
}

func (t *firstIneligibleResourceTransport) Identity(ctx context.Context, id int64) (core.ResourceBinding, error) {
	if t.probes.Add(1) == 1 {
		return core.ResourceBinding{}, core.ErrUnavailable.WithMessage("resource issuer unavailable")
	}
	return t.ProviderResourceTransport.Identity(ctx, id)
}

func TestNewExecutionSkipsIneligibleAccountBeforeInference(t *testing.T) {
	e, _, transport := resourceTestEnv(t)
	probe := &firstIneligibleResourceTransport{ProviderResourceTransport: transport}
	e.gw.d.ResourceTransport = probe
	var calls atomic.Int32
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		json.NewEncoder(w).Encode(map[string]any{"id": "msg", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 0}})
	}))
	defer up.Close()
	e.plat.base = up.URL
	request := body(testModel, false)
	request["tools"] = []any{map[string]any{"type": "code_execution_20260120", "name": "code_execution"}}
	res := e.messages(request)
	e.record()
	if res.status != 200 || probe.probes.Load() != 2 || calls.Load() != 1 {
		t.Fatalf("eligibility incorrectly dispatched/stopped: %d probes=%d inference=%d %s", res.status, probe.probes.Load(), calls.Load(), res.body)
	}
}

func TestBoundResourcesAndCreditsNeverFailOverEligibility(t *testing.T) {
	err := &resourceEligibilityError{core.ErrUnavailable}
	for _, c := range []*call{{resourceRefs: []approvedResource{{}}}, {creditRequest: &modelCreditRequest{redemption: &core.FallbackCredit{}}}} {
		if c.resourcePreparationFailure(err).kind != attemptReturn {
			t.Fatal("bound resource or credit moved accounts")
		}
	}
}

// refusingResourceTransport answers the identity of the accounts in refuse
// with the Worker's relay of the account's own login verdict.
type refusingResourceTransport struct {
	core.ProviderResourceTransport
	refuse map[int64]bool
}

const clearedLoginBody = `{"type":"error","error":{"type":"authentication_error","code":"not_logged_in","message":"Claude Code has cleared its stored login (no access or refresh token); reauthorization is required"}}`

func (t *refusingResourceTransport) Identity(ctx context.Context, id int64) (core.ResourceBinding, error) {
	if t.refuse[id] {
		h := http.Header{"Content-Type": {"application/json"}, "X-Ccgateway-Error-Source": {"input"}}
		return core.ResourceBinding{}, ccgateway.VerificationStage("identity", &ccgateway.AccountRefusalError{Status: http.StatusUnauthorized, Header: h, Body: []byte(clearedLoginBody)})
	}
	return t.ProviderResourceTransport.Identity(ctx, id)
}

// An account whose login the Worker reports refused while verifying the
// identity is failed over and disabled by the 401 rule, like a model
// request's 401; it used to be skipped as "no verified resource issuer" and
// stay schedulable (account 50, 2026-11-01).
func TestRefusedIdentityDisablesTheAccount(t *testing.T) {
	e, _, transport := resourceTestEnv(t)
	e.gw.d.ResourceTransport = &refusingResourceTransport{ProviderResourceTransport: transport, refuse: map[int64]bool{1: true}}
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set(resources.PrincipalHeader, "synthetic_issuer")
		w.Header().Set(resources.GenerationHeader, "v1")
		json.NewEncoder(w).Encode(map[string]any{"id": "msg", "type": "message", "role": "assistant", "model": testModel, "content": []any{}, "stop_reason": "end_turn", "usage": map[string]any{"input_tokens": 1, "output_tokens": 0}})
	}))
	defer up.Close()
	e.plat.base = up.URL
	request := body(testModel, false)
	request["tools"] = []any{map[string]any{"type": "code_execution_20260120", "name": "code_execution"}}
	if res := e.messages(request); res.status != 200 {
		t.Fatalf("status %d %s", res.status, res.body)
	}
	if reason := e.accounts.disabled[1]; reason != "matched auto-disable rule: status 401" {
		t.Fatalf("account 1 not disabled by the 401 rule: %q", reason)
	}
	if _, disabled := e.accounts.disabled[2]; disabled {
		t.Fatal("the account that answered was disabled")
	}
}

// With no other account the client gets the Worker's 401 as it was written.
func TestRefusedIdentityReachesTheClientUnchanged(t *testing.T) {
	e, _, transport := resourceTestEnv(t)
	e.gw.d.ResourceTransport = &refusingResourceTransport{ProviderResourceTransport: transport, refuse: map[int64]bool{1: true, 2: true, 3: true}}
	request := body(testModel, false)
	request["tools"] = []any{map[string]any{"type": "code_execution_20260120", "name": "code_execution"}}
	res := e.messages(request)
	if res.status != http.StatusUnauthorized || strings.TrimSpace(string(res.body)) != clearedLoginBody {
		t.Fatalf("status %d body %s", res.status, res.body)
	}
}
