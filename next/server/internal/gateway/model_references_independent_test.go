package gateway

import (
	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"testing"
)

func TestReviewPluginPatchesCannotChangeAdmittedModelReferences(t *testing.T) {
	for _, kind := range []string{"replace", "introduce", "remove", "change-selector", "allowed-transport-patch"} {
		t.Run(kind, func(t *testing.T) {
			e := pricedAdvisorEnv(t)
			e.auth.keys[testKey].Group.ModelAllowlist = []string{testModel, advisorModel}
			e.accounts.set(1, func(a *core.Account) { a.ModelMapping = map[string]string{advisorModel: "mapped-advisor"} })
			b := advisorBody(false)
			patch := &pluginv1.BodyPatch{Op: pluginv1.BodyPatch_OP_SET, Path: "tools.0.model", ValueJson: `"not-authorized"`}
			switch kind {
			case "introduce":
				delete(b, "tools")
				patch.Path = "tools"
				patch.ValueJson = `[{"type":"advisor_20260301","name":"advisor","model":"not-authorized"}]`
			case "remove":
				patch.Path = "tools"
				patch.ValueJson = `[]`
			case "change-selector":
				patch.Path = "tools.0.type"
				patch.ValueJson = `"custom"`
			case "allowed-transport-patch":
				patch.Path = "temperature"
				patch.ValueJson = `0.1`
			}
			e.plat.patches = []*pluginv1.BodyPatch{patch}
			r := e.messages(b)
			if kind == "allowed-transport-patch" {
				if r.status != 200 || len(e.up.keys()) != 1 {
					t.Fatalf("benign plugin patch blocked: %d %s", r.status, r.body)
				}
			} else if r.status == 200 || len(e.up.keys()) != 0 {
				t.Fatalf("plugin changed authorized model boundary: %d %s", r.status, r.body)
			}
			e.record()
		})
	}
}

func TestReviewAdditionalRouteAndPriceBoundaries(t *testing.T) {
	t.Run("free primary retains paid extra", func(t *testing.T) {
		e := pricedAdvisorEnv(t)
		e.pricer.free = true
		delete(e.pricer.rules, testModel)
		e.up.set("acc-1", &upstreamRule{status: 200, body: `{"type":"message","role":"assistant","content":[],"usage":{"input_tokens":1,"output_tokens":0,"iterations":[{"type":"advisor_message","model":"` + advisorModel + `","input_tokens":2,"output_tokens":3}]}}`})
		res := e.messages(advisorBody(false))
		rec := e.record()
		if res.status != 200 || rec.Price != nil || len(rec.Additional) != 1 || rec.Additional[0].Price == nil || !rec.Billable {
			t.Fatalf("free primary erased extra pricing: %+v", rec)
		}
	})
	t.Run("account override missing extra metering excluded", func(t *testing.T) {
		e := pricedAdvisorEnv(t)
		for i := range e.gen.accountTypes {
			for j := range e.gen.accountTypes[i].Type.Platforms {
				e.gen.accountTypes[i].Type.Platforms[j].Usage = map[string]manifest.UsageRules{"anthropic.messages": {Semantics: "exclusive"}}
			}
		}
		res := e.messages(advisorBody(false))
		e.record()
		if res.status == 200 || len(e.up.keys()) != 0 {
			t.Fatalf("unmetered account accepted: %d", res.status)
		}
	})
	c := &call{ep: manifest.Endpoint{Protocol: "anthropic.messages"}, modelRefs: []modelReference{{kind: "advisor", path: "tools.0.model", model: "a"}, {kind: "advisor", path: "tools.1.model", model: "b"}}}
	account := &core.AccountRef{ModelMapping: map[string]string{"a": "same", "b": "same"}}
	if _, err := c.mapReferencedModels([]byte(`{"tools":[{"model":"a"},{"model":"b"}]}`), account, &typeRoute{upstream: "anthropic.messages"}); err == nil {
		t.Fatal("different prices collapsed to one observed identity")
	}
	if _, err := c.mapReferencedModels([]byte(`{}`), account, &typeRoute{upstream: "openai.chat"}); err == nil {
		t.Fatal("conversion silently dropped nested invocation")
	}
}
