package engine

import (
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestWorkerSharedIdentityGrantRequiresOneValue(t *testing.T) {
	id := resources.Identity{PrincipalID: "issuer", Generation: "generation"}
	for _, name := range []string{resources.PrincipalHeader, resources.GenerationHeader} {
		h := http.Header{}
		h.Set(resources.PrincipalHeader, id.PrincipalID)
		h.Set(resources.GenerationHeader, id.Generation)
		if err := verifyExpectedResourceIdentity(h, id); err != nil {
			t.Fatal(err)
		}
		h.Add(name, h.Get(name))
		if verifyExpectedResourceIdentity(h, id) == nil {
			t.Fatal("duplicate issuer evidence accepted")
		}
	}
}
