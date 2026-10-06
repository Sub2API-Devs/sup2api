package ccgateway

import "testing"

func TestRequestPolicyConfig(t *testing.T) {
	old := Config{Mode: "local"}
	p := defaultRequestPolicy()
	p.UnknownBeta = "ignore"
	old.RequestPolicy = &p
	kept, e := mergeConfig(Config{Mode: "local"}, old)
	if e != nil || kept.EffectiveRequestPolicy().UnknownBeta != "ignore" {
		t.Fatal("omitted policy did not retain settings", e)
	}
	p.Betas = []BetaRule{}
	saved, e := mergeConfig(Config{Mode: "local", RequestPolicy: &p}, old)
	if e != nil || len(saved.EffectiveRequestPolicy().Betas) != len(defaultRequestPolicy().Betas) {
		t.Fatal("fixed whitelist was overridden", e)
	}
	if saved.Public()["request_policy"] == nil {
		t.Fatal("policy missing from public settings")
	}
	for _, b := range []BetaRule{{"bad name", "forward"}, {"x", "fast"}, {"x", "environment"}} {
		invalid := defaultRequestPolicy()
		invalid.Betas = []BetaRule{b}
		if _, e := mergeConfig(Config{Mode: "local", RequestPolicy: &invalid}, old); e != nil {
			t.Fatal("legacy rules should be ignored", b, e)
		}
	}
}
