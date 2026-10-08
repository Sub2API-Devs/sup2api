package strict

import (
	"encoding/json"
	"strings"
	"testing"
)

func strictThinkingEstimateStream(t *testing.T, hint string) ([]Event, error) {
	t.Helper()
	p := mustPlan(t, "openai.responses", `{"model":"alias","max_output_tokens":20,"input":"hello"}`)
	extra := ""
	if hint != "" {
		extra = `,"estimated_tokens":` + hint
	}
	frames := []string{
		streamEvents()[0],
		`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"initial","signature":""}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":" a"` + extra + `}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":" b"` + extra + `}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"first"}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"last"}}`,
		`{"type":"content_block_stop","index":0}`,
		`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}`,
		`{"type":"message_stop"}`,
	}
	s := p.NewStream()
	var out []Event
	for _, frame := range frames {
		events, err := s.Event(Event{Data: []byte(frame)})
		if err != nil {
			return nil, err
		}
		out = append(out, events...)
	}
	return out, nil
}

func TestStrictThinkingEstimateIsOnlyDisplayMetadata(t *testing.T) {
	baseline, err := strictThinkingEstimateStream(t, "")
	if err != nil {
		t.Fatal(err)
	}
	finalFacts := func(events []Event) string {
		final := obj(t, events[len(events)-1].Data)["response"].(object)
		raw, err := json.Marshal(object{"output": final["output"], "usage": final["usage"]})
		if err != nil {
			t.Fatal(err)
		}
		return string(raw)
	}
	want := finalFacts(baseline)
	for _, hint := range []string{"null", "0", "50", "9007199254740993", "9223372036854775808"} {
		t.Run(hint, func(t *testing.T) {
			events, err := strictThinkingEstimateStream(t, hint)
			if err != nil {
				t.Fatal(err)
			}
			if finalFacts(events) != want {
				t.Fatal("display estimate changed persisted output or authoritative usage")
			}
			for _, event := range events {
				if strings.Contains(string(event.Data), "estimated_tokens") {
					t.Fatal("Anthropic display-only estimate leaked into the target protocol")
				}
			}
		})
	}
}

func TestStrictThinkingEstimateRejectsMalformedOrUnknownFields(t *testing.T) {
	for _, hint := range []string{"-1", "1.5", `"50"`, "true", "[]", "{}", `0,"unrecognized":true`} {
		t.Run(hint, func(t *testing.T) {
			if _, err := strictThinkingEstimateStream(t, hint); err == nil {
				t.Fatal("malformed progress or unknown delta field accepted")
			}
		})
	}
}
