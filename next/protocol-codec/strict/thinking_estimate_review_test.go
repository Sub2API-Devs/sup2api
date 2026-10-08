package strict

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestReviewThinkingEstimateBoundaryAndResponseFacts(t *testing.T) {
	baseline, err := strictThinkingEstimateStream(t, "")
	if err != nil {
		t.Fatal(err)
	}
	facts := func(events []Event) string {
		result := obj(t, events[len(events)-1].Data)["response"].(object)
		raw, err := json.Marshal(object{"output": result["output"], "usage": result["usage"]})
		if err != nil {
			t.Fatal(err)
		}
		return string(raw)
	}
	for _, hint := range []string{"-0", strings.Repeat("9", 80)} {
		events, err := strictThinkingEstimateStream(t, hint)
		if err != nil {
			t.Fatal(err)
		}
		if facts(events) != facts(baseline) {
			t.Fatal("arbitrary precision display changed final output/usage")
		}
		for _, e := range events {
			if strings.Contains(string(e.Data), "estimated_tokens") {
				t.Fatal("hint escaped into OpenAI event")
			}
		}
	}
}

func TestReviewThinkingEstimateOnlyAllowedOnThinking(t *testing.T) {
	for _, tc := range []struct {
		block object
		delta object
	}{
		{object{"type": "thinking", "thinking": "initial", "signature": "old"}, object{"type": "signature_delta", "signature": "new", "estimated_tokens": nil}},
		{object{"type": "text", "text": "initial"}, object{"type": "text_delta", "text": "next", "estimated_tokens": json.Number("0")}},
		{object{"type": "tool_use", "id": "t", "name": "x", "input": object{}}, object{"type": "input_json_delta", "partial_json": "{}", "estimated_tokens": json.Number("128")}},
	} {
		s := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`).NewStream()
		b := &streamBlock{block: tc.block}
		before, _ := json.Marshal(b.block)
		if _, err := s.delta(0, b, tc.delta); err == nil {
			t.Fatal("nonthinking delta accepted hint", tc.delta)
		}
		after, _ := json.Marshal(b.block)
		if string(before) != string(after) {
			t.Fatal("invalid delta partially mutated block")
		}
	}
}

func TestReviewThinkingEstimateStrictAndSignature(t *testing.T) {
	for _, bad := range []any{json.Number("-1"), json.Number("0.5"), json.Number("1e3"), "128", true, object{}, []any{}} {
		s := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`).NewStream()
		b := &streamBlock{block: object{"type": "thinking", "thinking": "initial", "signature": "old"}}
		if _, err := s.delta(0, b, object{"type": "thinking_delta", "thinking": "next", "estimated_tokens": bad}); err == nil {
			t.Fatalf("bad hint accepted: %#v", bad)
		}
		if b.block["thinking"] != "initial" || b.block["signature"] != "old" {
			t.Fatal("bad estimate partially applied")
		}
	}
	s := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`).NewStream()
	b := &streamBlock{block: object{"type": "thinking", "thinking": "initial", "signature": "old"}}
	if _, err := s.delta(0, b, object{"type": "thinking_delta", "thinking": "next", "estimated_tokens": nil, "extra": nil}); err == nil {
		t.Fatal("unknown field accepted")
	}
	for _, text := range []string{"", "a", "b"} {
		if _, err := s.delta(0, b, object{"type": "thinking_delta", "thinking": text, "estimated_tokens": json.Number("128")}); err != nil {
			t.Fatal(err)
		}
	}
	for _, sig := range []string{"one", "two", ""} {
		if _, err := s.delta(0, b, object{"type": "signature_delta", "signature": sig}); err != nil {
			t.Fatal(err)
		}
	}
	if b.block["thinking"] != "initialab" || b.block["signature"] != "" || len(b.block) != 3 {
		t.Fatalf("thinking/signature changed: %#v", b.block)
	}
}
