package usagerules

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"testing"
)

func TestReviewStringFactPreservesEscapesAndRejectsInvalidUpdates(t *testing.T) {
	rules := manifest.UsageRules{Facts: map[string]manifest.UsageFact{"inference_geo": {Type: "string", Path: "usage.inference_geo"}}}
	u := New(rules)
	u.ApplyJSON([]byte(`{"usage":{"inference_geo":"region-\u0037\\edge\n"}}`))
	want := "region-7\\edge\n"
	if u.Metrics["inference_geo"] != want {
		t.Fatal(u.Metrics)
	}
	for _, value := range []string{"null", "123", "false", "[]", "{}"} {
		u.ApplyJSON([]byte(`{"usage":{"inference_geo":` + value + `}}`))
		if u.Metrics["inference_geo"] != want {
			t.Fatalf("invalid %s replaced prior fact", value)
		}
	}
	facts := extractAttemptFacts(rules.Facts, []byte(`{"usage":{"inference_geo":"region-\u0037\\edge\n"}}`))
	if facts["inference_geo"] != want {
		t.Fatal(facts)
	}
}
