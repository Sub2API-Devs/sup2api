package gateway

import (
	"context"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type countingCredits struct {
	*memoryCredits
	lookups atomic.Int32
}

func (c *countingCredits) LookupOwned(ctx context.Context, owner core.ResourceOwner, hash string) (core.FallbackCredit, error) {
	c.lookups.Add(1)
	return c.memoryCredits.LookupOwned(ctx, owner, hash)
}

// checkModel runs before and after the hooks. A request whose body the hooks
// left alone must pay for the reference scans and the registry read once, not
// twice; the fallback-credit lookup is the visible proof that the second pass
// reused the first.
func TestCheckModelRunsReferenceChecksOncePerBody(t *testing.T) {
	e := newEnv(t)
	reg := &countingCredits{memoryCredits: &memoryCredits{rows: map[string]core.FallbackCredit{}}}
	e.gw.d.Credits = reg
	request := body(testModel, false)
	request["fallback_credit_token"] = "fixture-model-check-dedupe"
	r := e.do("/v1/messages", request, map[string]string{"anthropic-beta": "fallback-credit-2026-07-01"})
	e.record()
	if r.status != 200 {
		t.Fatalf("status %d: %s", r.status, r.body)
	}
	if got := reg.lookups.Load(); got != 1 {
		t.Fatalf("fallback-credit registry read %d times for one request; want once", got)
	}
}

// A hook that replaced the body must invalidate the cached reference scan, or
// the second checkModel would authorize the old models.
func TestCheckModelRescansAfterSetBody(t *testing.T) {
	c := &call{
		gen: newFakeGen(), platform: "anthropic", rec: &core.UsageRecord{},
		principal: &core.APIKeyPrincipal{},
		body:      []byte(`{"model":"primary","fallbacks":[{"kind":"x","model":"first"}]}`),
	}
	c.ep.Protocol = "openai.chat"
	c.ep.Request.ModelPath = "model"
	c.ep.Request.ModelReferences = []manifest.RequestModelReference{{
		Name: "fallback", ArrayPath: "fallbacks", ModelPath: "model", Match: map[string]string{"kind": "x"},
	}}
	ctx := context.Background()
	if e := c.checkModel(ctx); e != nil {
		t.Fatal(e)
	}
	if len(c.modelRefs) != 1 || c.modelRefs[0].model != "first" {
		t.Fatalf("first scan: %+v", c.modelRefs)
	}
	c.setBody([]byte(`{"model":"primary","fallbacks":[{"kind":"x","model":"second"}]}`))
	if e := c.checkModel(ctx); e != nil {
		t.Fatal(e)
	}
	if len(c.modelRefs) != 1 || c.modelRefs[0].model != "second" {
		t.Fatalf("stale reference scan reused after setBody: %+v", c.modelRefs)
	}
}
