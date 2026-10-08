package check

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"testing"
)

func TestAttemptUsageManifestContract(t *testing.T) {
	p := validPlatform()
	p.Usage.Attempts = &manifest.AttemptUsageRule{Name: "fallback", Adapter: manifest.AttemptAdapterAnthropicFallback, RequiredBy: []string{"fallbacks"}}
	if codes := platformCodes(p); len(codes) > 0 {
		t.Fatal(codes)
	}
	for _, mutate := range []func(*manifest.AttemptUsageRule){func(r *manifest.AttemptUsageRule) { r.Name = "" }, func(r *manifest.AttemptUsageRule) { r.Adapter = "unknown" }, func(r *manifest.AttemptUsageRule) { r.RequiredBy = nil }, func(r *manifest.AttemptUsageRule) { r.RequiredBy = []string{"fallbacks.#"} }} {
		rule := *p.Usage.Attempts
		mutate(&rule)
		p.Usage.Attempts = &rule
		if len(platformCodes(p)) == 0 {
			t.Fatal("invalid attempt rule accepted")
		}
		p.Usage.Attempts = &manifest.AttemptUsageRule{Name: "fallback", Adapter: manifest.AttemptAdapterAnthropicFallback, RequiredBy: []string{"fallbacks"}}
	}
}
