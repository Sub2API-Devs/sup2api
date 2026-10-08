package engine

import (
	diag "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/diagnostics"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"net/http/httptest"
	"testing"
)

func TestReviewDiagnosticsGrantRejectsAmbiguousIssuer(t *testing.T) {
	for _, name := range []string{diag.TrackingHeader, diag.GrantHeader, resources.PrincipalHeader, resources.GenerationHeader} {
		t.Run(name, func(t *testing.T) {
			request := httptest.NewRequest("POST", "/v1/messages", nil)
			hash, _ := diag.Hash("msg_fixture")
			request.Header.Set(diag.TrackingHeader, "1")
			request.Header.Set(diag.GrantHeader, hash)
			request.Header.Set(resources.PrincipalHeader, "issuer")
			request.Header.Set(resources.GenerationHeader, "generation")
			request.Header.Add(name, "forged")
			x := &exchange{r: request, w: httptest.NewRecorder(), req: &Request{}, resources: &resourceAdmission{identity: resources.Identity{PrincipalID: "issuer", Generation: "generation"}}}
			if ok, err := x.trustedDiagnostics("msg_fixture"); err == nil || ok {
				t.Fatal("ambiguous diagnostics authority accepted")
			}
		})
	}
}
