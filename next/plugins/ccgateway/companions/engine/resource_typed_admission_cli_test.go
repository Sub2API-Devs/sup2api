package engine

import (
	"context"
	"net/http"
	"path/filepath"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestRealCLIResourceTypedAdmissionUsesAuthenticatedIssuer(t *testing.T) {
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		t.Error("identity-only API key admission attempted model inference")
	})
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "typed-admission", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Slots: make(chan struct{}, 2)}
	b, err := newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	g.resources = b
	defer b.lease.Close()
	id, err := b.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	body := []byte(`{"container":{"id":"container_fixture","skills":[{"type":"custom","skill_id":"skill_fixture","version":"123"}]},"messages":[{"role":"user","content":[{"type":"document","source":{"type":"file","file_id":"file_fixture"}}]}]}`)
	h := http.Header{}
	h.Set(resources.PrincipalHeader, id.PrincipalID)
	h.Set(resources.GenerationHeader, id.Generation)
	h.Set(resources.ResourceOutputsHeader, "1")
	h.Set(resources.ResourceRefsHeader, `[{"kind":"container","id":"container_fixture"},{"kind":"skill","id":"skill_fixture"},{"kind":"file","id":"file_fixture"}]`)
	h.Set(resources.ResourceContextsHeader, `[{"kind":"ptc","parent_id":"srvtool_parent","resource_id":"container_fixture"}]`)
	grant, err := g.admitResourceReferences(context.Background(), body, h)
	if err != nil {
		t.Fatal(err)
	}
	if grant == nil || grant.identity != id || !grant.outputs || len(grant.references) != 3 {
		t.Fatal("typed reference identity not granted")
	}
	if (&Request{resources: grant}).checkResourceContext("srvtool_parent", "container_fixture") != nil {
		t.Fatal("verified PTC context missing")
	}
	grant.close()
	h.Del(resources.ResourceContextsHeader)
	h.Set(resources.ResourceRefsHeader, `[{"kind":"file","id":"container_fixture"},{"kind":"file","id":"skill_fixture"},{"kind":"file","id":"file_fixture"}]`)
	if bad, err := g.admitResourceReferences(context.Background(), body, h); err == nil {
		bad.close()
		t.Fatal("file capability authorized a container and skill")
	}
}
