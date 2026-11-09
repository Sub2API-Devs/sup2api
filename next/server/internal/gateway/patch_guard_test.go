package gateway

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestValidatePatchesComparesOnlyWhenBytesDiffer(t *testing.T) {
	newCall := func() *call {
		c := &call{ep: manifest.Endpoint{Protocol: "openai.chat", Billing: "free"}}
		c.ep.Request.ModelReferences = []manifest.RequestModelReference{{Name: "fallback", ArrayPath: "fallbacks", ModelPath: "model"}}
		return c
	}
	rt := &typeRoute{upstream: "openai.chat"}
	before := []byte(`{"fallbacks":[{"model":"a"}]}`)
	if kind, e := newCall().validatePatches(rt, before, before); kind != attemptDone || e != nil {
		t.Fatalf("self-comparison: kind %v err %v", kind, e)
	}
	after := []byte(`{"fallbacks":[{"model":"b"}]}`)
	if kind, e := newCall().validatePatches(rt, before, after); kind != attemptFailover || e == nil {
		t.Fatalf("changed references accepted: kind %v err %v", kind, e)
	}
}

func TestHelperBudgetRequestedMatchesJSONPresence(t *testing.T) {
	cases := []struct {
		body string
		want bool
	}{
		{`{}`, false},
		{`{"output_config":{}}`, false},
		{`{"output_config":{"task_budget":null}}`, false},
		{`{"output_config":{"task_budget":0}}`, true},
		{`{"output_config":{"task_budget":false}}`, true},
		{`{"output_config":{"task_budget":""}}`, true},
		{`{"output_config":{"task_budget":{"limit":1}}}`, true},
		{`{"output_config":"text"}`, false},
		{`{"output_config":[{"task_budget":1}]}`, false},
		{`not json`, false},
	}
	for _, tc := range cases {
		if got := helperBudgetRequested([]byte(tc.body)); got != tc.want {
			t.Errorf("helperBudgetRequested(%s) = %v, want %v", tc.body, got, tc.want)
		}
	}
}
