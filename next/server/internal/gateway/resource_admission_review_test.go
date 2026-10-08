package gateway

import (
	"context"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func TestReviewConversionCannotIntroduceExecutionCapability(t *testing.T) {
	for _, body := range []string{
		`{"messages":[],"tools":[{"type":"code_execution_20260120","name":"code_execution"}]}`,
		`{"messages":[],"container":{}}`,
		`{"messages":[{"role":"system","content":[{"type":"tool_addition","tool":{"type":"tool_definition","definition":{"type":"code_execution_20260120","name":"code_execution"}}}]}]}`,
	} {
		c := &call{}
		if _, e := c.mapResourceReferences(context.Background(), []byte(body), &core.AccountRef{}, &typeRoute{upstream: "anthropic.messages", conv: &fakeConv{}}); e == nil {
			t.Fatal("converted target introduced unauthenticated resource capability")
		}
	}
}

func TestReviewNullContainerDoesNotRequireResourceTransport(t *testing.T) {
	e, _, _ := resourceTestEnv(t)
	e.gw.d.Resources = nil
	e.gw.d.ResourceTransport = nil
	b := body(testModel, false)
	b["container"] = nil
	result := e.messages(b)
	e.record()
	if result.status != 200 {
		t.Fatalf("null reset required resource runtime: %d %s", result.status, result.body)
	}
	if e.up.last().header.Get(resources.ResourceOutputsHeader) != "" {
		t.Fatal("null reset granted execution resources")
	}
}

func TestReviewPendingPTCContextCannotSwitchOwnedContainers(t *testing.T) {
	e, m, _ := resourceTestEnv(t)
	a := seedReference(e, m, "container_a", 1)
	a.Kind = "container"
	m.rows[a.PublicID] = a
	b := seedReference(e, m, "container_b", 1)
	b.Kind = "container"
	m.rows[b.PublicID] = b
	store := &outputContextStore{memoryResourceStore: m, contexts: map[string]core.ResourceContext{"parent": {Owner: a.Owner, Binding: a.Binding, PluginKey: "ccgateway", Kind: "ptc", ParentID: "parent", ResourceID: a.PublicID}}}
	e.gw.d.Resources = store
	c := &call{g: e.gw, principal: e.auth.keys[testKey], resourceInfo: resources.RequestInfo{Outputs: true, PendingPTCParents: []string{"parent"}}}
	h := http.Header{}
	if e := c.applyResourceContexts(context.Background(), h, a.Binding); e == nil {
		t.Fatal("missing container admitted")
	}
	c.resourceRefs = []approvedResource{{reference: resources.Reference{Kind: "container", ID: b.PublicID}, resource: b}}
	if e := c.applyResourceContexts(context.Background(), h, b.Binding); e == nil {
		t.Fatal("pending parent switched to another same-owner container")
	}
	c.resourceRefs = []approvedResource{{reference: resources.Reference{Kind: "container", ID: a.PublicID}, resource: a}}
	if e := c.applyResourceContexts(context.Background(), h, a.Binding); e != nil {
		t.Fatal(e)
	}
	if h.Get(resources.ResourceContextsHeader) != `[{"kind":"ptc","parent_id":"parent","resource_id":"remote_container_a"}]` {
		t.Fatal("wrong trusted context", h)
	}
}
