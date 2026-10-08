package usagerules

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"strings"
	"testing"
)

func attemptRules() manifest.UsageRules {
	return manifest.UsageRules{Semantics: "exclusive", Attempts: &manifest.AttemptUsageRule{Name: "fallback", Adapter: manifest.AttemptAdapterAnthropicFallback, RequiredBy: []string{"fallbacks"}}}
}

const attemptFixture = `{"type":"message","model":"fallback","content":[{"type":"fallback","from":{"model":"primary"},"to":{"model":"fallback"},"trigger":{"type":"refusal","category":"cyber"}}],"stop_reason":"end_turn","usage":{"input_tokens":20,"output_tokens":3,"iterations":[{"type":"message","model":"primary","input_tokens":10,"output_tokens":0},{"type":"fallback_message","model":"fallback","input_tokens":20,"output_tokens":3}]}}`

func TestAttemptReplacementRefusalCategoriesAndNoDoubleCounting(t *testing.T) {
	for _, tc := range []struct {
		category string
		free     bool
		bad      bool
	}{{`"cyber"`, true, false}, {`"general_harms"`, true, false}, {`null`, true, false}, {`"bio"`, false, false}, {`"frontier_llm"`, false, false}, {`"reasoning_extraction"`, false, false}, {`"future"`, false, true}} {
		u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
		u.ApplyJSON([]byte(strings.Replace(attemptFixture, `"cyber"`, tc.category, 1)))
		items, e := u.Replacement()
		if tc.bad {
			if e == nil {
				t.Fatal("unknown classification billed")
			}
			continue
		}
		if e != nil || len(items) != 2 || items[0].Free != tc.free || items[1].Free || items[1].Tokens.Input != 20 {
			t.Fatal(tc, items, e)
		}
	}
}
func TestAttemptReplacementLoopsStickyAndPartialOutput(t *testing.T) {
	raw := strings.Replace(attemptFixture, `"iterations":[`, `"iterations":[{"type":"message","model":"primary","input_tokens":1,"output_tokens":2},`, 1)
	u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	items, e := u.Replacement()
	if e != nil || len(items) != 3 || items[0].Free || !items[1].Free {
		t.Fatal(items, e)
	}
	sticky := `{"type":"message","model":"fallback","content":[],"stop_reason":"end_turn","usage":{"input_tokens":20,"output_tokens":3,"iterations":[{"type":"fallback_message","model":"fallback","input_tokens":20,"output_tokens":3}]}}`
	u = New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(sticky))
	items, e = u.Replacement()
	if e != nil || len(items) != 1 || items[0].Model != "fallback" {
		t.Fatal(items, e)
	}
	raw = strings.Replace(attemptFixture, `"input_tokens":10,"output_tokens":0`, `"input_tokens":10,"output_tokens":2`, 1)
	u = New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	items, e = u.Replacement()
	if e != nil || items[0].Free {
		t.Fatal(items, e)
	}
}
func TestAttemptReplacementStreamingSnapshotAndFailures(t *testing.T) {
	u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	events := [][2]string{{"message_start", `{"message":{"model":"primary","usage":{"input_tokens":10,"output_tokens":0}}}`}, {"content_block_start", `{"index":0,"content_block":{"type":"fallback","from":{"model":"primary"},"to":{"model":"fallback"},"trigger":{"type":"refusal","category":"bio"}}}`}, {"content_block_stop", `{"index":0}`}, {"message_delta", `{"delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":20,"output_tokens":3,"iterations":[{"type":"message","model":"primary","input_tokens":10,"output_tokens":0},{"type":"fallback_message","model":"fallback","input_tokens":20,"output_tokens":3}]}}`}}
	for _, ev := range events {
		u.ApplySSE(ev[0], []byte(ev[1]))
	}
	u.ApplySSE(events[3][0], []byte(events[3][1]))
	if _, e := u.Replacement(); e == nil {
		t.Fatal("incomplete response charged")
	}
	u.ApplySSE("message_stop", []byte(`{"type":"message_stop"}`))
	items, e := u.Replacement()
	if e != nil || len(items) != 2 || items[0].Free {
		t.Fatal(items, e)
	}
	for _, raw := range []string{strings.Replace(attemptFixture, `"input_tokens":10`, `"input_tokens":-1`, 1), strings.Replace(attemptFixture, `"category":"cyber"`, `"category":"unknown"`, 1), strings.Replace(attemptFixture, `"to":{"model":"fallback"}`, `"to":{"model":"other"}`, 1)} {
		u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
		u.ApplyJSON([]byte(raw))
		if _, e := u.Replacement(); e == nil {
			t.Fatal("bad usage accepted", raw)
		}
	}
}

func TestAttemptReplacementAllRefusedAndMissingClassification(t *testing.T) {
	raw := `{"type":"message","model":"third","content":[{"type":"fallback","from":{"model":"primary"},"to":{"model":"second"},"trigger":{"type":"refusal","category":"bio"}},{"type":"fallback","from":{"model":"second"},"to":{"model":"third"},"trigger":{"type":"refusal","category":"general_harms"}}],"stop_reason":"refusal","stop_details":{"type":"refusal","category":null},"usage":{"input_tokens":30,"output_tokens":0,"iterations":[{"type":"message","model":"primary","input_tokens":10,"output_tokens":0},{"type":"message","model":"second","input_tokens":20,"output_tokens":0},{"type":"fallback_message","model":"third","input_tokens":30,"output_tokens":0}]}}`
	u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	items, e := u.Replacement()
	if e != nil || len(items) != 3 || items[0].Free || !items[1].Free || !items[2].Free {
		t.Fatal(items, e)
	}
	missing := strings.Replace(raw, `"category":"general_harms"`, `"explanation":"missing"`, 1)
	u = New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(missing))
	if _, e = u.Replacement(); e == nil {
		t.Fatal("missing category became free")
	}
	for _, reason := range []string{"end_turn", "refusal"} {
		plain := `{"type":"message","model":"primary","content":[],"stop_reason":"` + reason + `","stop_details":{"type":"refusal","category":"cyber"},"usage":{"input_tokens":10,"output_tokens":0}}`
		u = New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
		u.ApplyJSON([]byte(plain))
		items, e = u.Replacement()
		if e != nil || len(items) != 1 || items[0].Free != (reason == "refusal") {
			t.Fatal(items, e)
		}
	}
}

func TestAttemptReplacementUnexpectedCompactionBlocksSettlement(t *testing.T) {
	raw := strings.Replace(attemptFixture, `"iterations":[`, `"iterations":[{"type":"compaction","input_tokens":4,"output_tokens":5},`, 1)
	u := New(attemptRules()).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	if _, e := u.Replacement(); e == nil {
		t.Fatal("unattributed compaction billed as primary")
	}
}

func TestAttemptFactsOnlyBelongToLastSamplingIteration(t *testing.T) {
	rules := attemptRules()
	rules.Facts = map[string]manifest.UsageFact{"speed": {Type: "enum", Enum: []string{"standard", "fast"}, Path: "usage.speed"}, "requests": {Type: "number", Path: "usage.server_tool_use.web_search_requests"}}
	raw := strings.Replace(attemptFixture, `"input_tokens":20,"output_tokens":3,"iterations"`, `"input_tokens":20,"output_tokens":3,"speed":"fast","server_tool_use":{"web_search_requests":2},"iterations"`, 1)
	u := New(rules).WithPrimaryModel("primary").WithAttemptAccounting(true)
	u.ApplyJSON([]byte(raw))
	items, e := u.Replacement()
	if e != nil || items[0].Metrics != nil || items[1].Metrics["speed"] != "fast" || items[1].Metrics["requests"] != float64(2) {
		t.Fatal(items, e)
	}
	for _, delta := range []string{`{"input_tokens":20,"output_tokens":3}`, `{"input_tokens":20,"output_tokens":3,"speed":"future","server_tool_use":{"web_search_requests":"bad"}}`, `{"input_tokens":20,"output_tokens":3,"speed":"standard"}`} {
		u = New(rules).WithPrimaryModel("primary").WithAttemptAccounting(true)
		u.ApplySSE("message_start", []byte(`{"message":{"model":"primary","usage":{"input_tokens":1,"output_tokens":0,"speed":"fast"}}}`))
		u.ApplySSE("content_block_start", []byte(`{"index":0,"content_block":{"type":"fallback","from":{"model":"primary"},"to":{"model":"fallback"},"trigger":{"type":"refusal","category":"cyber"}}}`))
		u.ApplySSE("content_block_stop", []byte(`{"index":0}`))
		usage := strings.TrimSuffix(delta, "}") + `,"iterations":[{"type":"message","model":"primary","input_tokens":1,"output_tokens":0},{"type":"fallback_message","model":"fallback","input_tokens":20,"output_tokens":3}]}`
		u.ApplySSE("message_delta", []byte(`{"delta":{"stop_reason":"end_turn"},"usage":`+usage+`}`))
		u.ApplySSE("message_stop", []byte(`{"type":"message_stop"}`))
		items, e = u.Replacement()
		if e != nil {
			t.Fatal(e)
		}
		if items[0].Metrics != nil {
			t.Fatal("earlier model got final facts")
		}
		if strings.Contains(delta, `"speed":"standard"`) {
			if items[1].Metrics["speed"] != "standard" {
				t.Fatal(items)
			}
		} else if len(items[1].Metrics) != 0 {
			t.Fatal("stale/invalid fact inherited", items)
		}
	}
}
