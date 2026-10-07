package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestModelReferenceDeclarations(t *testing.T) {
	base := func() manifest.Platform {
		p := validPlatform()
		p.Endpoints[0].Billing, p.Endpoints[0].BillingTypes = "free", nil
		p.Endpoints[0].Request.ModelReferences = []manifest.RequestModelReference{{Name: "advisor", ArrayPath: "tools", ModelPath: "model", Match: map[string]string{"type": "advisor_20260301"}}}
		return p
	}
	if got := platformCodes(base()); len(got) != 0 {
		t.Fatal(got)
	}
	for _, tc := range []struct {
		name string
		edit func(*manifest.Platform)
	}{
		{"reader query", func(p *manifest.Platform) {
			p.Endpoints[0].Request.ModelReferences[0].ArrayPath = `tools.#(type=="advisor")`
		}},
		{"wildcard target", func(p *manifest.Platform) { p.Endpoints[0].Request.ModelReferences[0].ModelPath = "*.model" }},
		{"duplicate name", func(p *manifest.Platform) {
			p.Endpoints[0].Request.ModelReferences = append(p.Endpoints[0].Request.ModelReferences, p.Endpoints[0].Request.ModelReferences[0])
		}},
		{"missing price extraction", func(p *manifest.Platform) {
			p.Endpoints[0].Billing, p.Endpoints[0].BillingTypes = "usage", []string{"per_token"}
		}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := base()
			tc.edit(&p)
			if got := platformCodes(p); len(got) == 0 {
				t.Fatal("unsafe model reference accepted")
			}
		})
	}
}
