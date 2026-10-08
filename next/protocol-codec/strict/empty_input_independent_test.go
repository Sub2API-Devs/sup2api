package strict

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func TestReviewEmptyInputStrictFragmentBoundaries(t *testing.T) {
	for _, protocol := range []string{"openai.responses", "openai.chat"} {
		for _, tc := range []struct {
			name, initial string
			parts         []any
			valid         bool
		}{
			{"initial-object", `{"n":9007199254740993}`, []any{"", ""}, true},
			{"empty-between-json", `{}`, []any{"", `{"n":`, "", "9007199254740993", "}", ""}, true},
			{"initial-array", `[]`, []any{""}, false},
			{"initial-null", `null`, []any{""}, false},
			{"null-fragment", `{}`, []any{"", nil}, false},
			{"unfinished-json", `{}`, []any{"", "{", ""}, false},
		} {
			t.Run(protocol+"/"+tc.name, func(t *testing.T) {
				s := (&Plan{protocol: protocol, model: "fixture"}).NewStream()
				events := []string{
					`{"type":"message_start","message":{"id":"empty_review","type":"message","role":"assistant","model":"fixture","content":[],"usage":{"input_tokens":1,"output_tokens":0}}}`,
					fmt.Sprintf(`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"review_call","name":"lookup","input":%s}}`, tc.initial),
				}
				for _, part := range tc.parts {
					raw, _ := json.Marshal(part)
					events = append(events, fmt.Sprintf(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":%s}}`, raw))
				}
				events = append(events, `{"type":"content_block_stop","index":0}`, `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":1}}`, `{"type":"message_stop"}`)
				var err error
				var output strings.Builder
				for _, event := range events {
					var out []Event
					out, err = s.Event(Event{Data: []byte(event)})
					if err != nil {
						break
					}
					for _, v := range out {
						output.Write(v.Data)
					}
				}
				if (err == nil) != tc.valid {
					t.Fatalf("valid=%v err=%v", tc.valid, err)
				}
				if tc.valid && !strings.Contains(output.String(), "9007199254740993") {
					t.Fatal("argument precision or initial object lost")
				}
			})
		}
	}
}
