package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
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
