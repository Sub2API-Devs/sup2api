package engine

import (
	"errors"
	"net/http"
	"testing"
)

func TestResourceIdentityRequiresActualNativeAuthentication(t *testing.T) {
	for _, h := range []http.Header{{}, {"X-Api-Key": {""}}, {"X-Api-Key": {"a", "b"}}, {"X-Api-Key": {"a"}, "Authorization": {"Bearer b"}}, {"Authorization": {"Bearer a"}}, {"Authorization": {"Basic a"}, "Anthropic-Beta": {"oauth-2025-04-20"}}} {
		p := &resourceIdentityProbe{issuer: "managed", epoch: "one"}
		if _, err := p.classify(h); err == nil || p.local != nil {
			t.Fatal("unsupported or ambiguous authentication accepted")
		}
	}
	p := &resourceIdentityProbe{}
	if _, err := p.classify(http.Header{"X-Api-Key": {"fixture"}}); !errors.Is(err, errManagedResourceIssuerMissing) {
		t.Fatal(err)
	}
	p = &resourceIdentityProbe{issuer: "managed", epoch: "one"}
	if local, err := p.classify(http.Header{"X-Api-Key": {"fixture"}}); err != nil || !local || p.local == nil {
		t.Fatal(local, err)
	}
	p = &resourceIdentityProbe{}
	if local, err := p.classify(http.Header{"Authorization": {"Bearer fixture"}, "Anthropic-Beta": {"oauth-2025-04-20"}}); err != nil || local || p.local != nil {
		t.Fatal("OAuth must await actual profile", local, err)
	}
}
