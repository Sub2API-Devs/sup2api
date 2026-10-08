package strict

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

func TestEmptyInputDeltaRetainsInitialObject(t *testing.T) {
	for _, protocol := range []string{"openai.responses", "openai.chat"} {
		for _, initial := range []string{`{}`, `{"kept":9007199254740993}`} {
			for _, part := range []any{"", " ", "{", "[]", "null", 42} {
				request := `{"model":"alias","max_output_tokens":64,"input":"hi"}`
				if protocol == "openai.chat" {
					request = `{"model":"alias","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}`
				}
				p := mustPlan(t, protocol, request)
				s := p.NewStream()
				b, _ := json.Marshal(part)
				events := []string{streamEvents()[0], fmt.Sprintf(`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_empty","name":"lookup","input":%s}}`, initial), `{"type":"ping"}`, fmt.Sprintf(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":%s}}`, b), `{"type":"content_block_stop","index":0}`, `{"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":1}}`, `{"type":"message_stop"}`}
				var err error
				var out strings.Builder
				for _, event := range events {
					var v []Event
					v, err = s.Event(Event{Data: []byte(event)})
					if err != nil {
						break
					}
					for _, e := range v {
						out.Write(e.Data)
					}
				}
				if part == "" {
					if err != nil {
						t.Errorf("empty delta rejected %s %s %v", protocol, initial, err)
					}
					if initial != "{}" && !strings.Contains(out.String(), "9007199254740993") {
						t.Error("initial arguments lost")
					}
				} else if err == nil {
					t.Errorf("invalid delta accepted %v", part)
				}
			}
		}
	}
}
