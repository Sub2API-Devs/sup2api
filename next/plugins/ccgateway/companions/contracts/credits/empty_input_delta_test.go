package credits

import (
	"encoding/json"
	"fmt"
	"testing"
)

func TestEmptyInputDeltaRetainsInitialObject(t *testing.T) {
	for _, initial := range []string{`{}`, `{"kept":9007199254740993}`} {
		for _, part := range []any{"", " ", "{", "[]", "null", 42} {
			b, _ := json.Marshal(part)
			events := [][]byte{[]byte(`{"type":"message_start","message":{"type":"message","id":"msg_empty","role":"assistant","model":"fixture","content":[],"usage":{}}}`), []byte(fmt.Sprintf(`{"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tool_empty","name":"lookup","input":%s}}`, initial)), []byte(`{"type":"ping"}`), []byte(fmt.Sprintf(`{"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":%s}}`, b)), []byte(`{"type":"content_block_stop","index":0}`), []byte(`{"type":"message_delta","delta":{"stop_reason":"tool_use"}}`), []byte(`{"type":"message_stop"}`)}
			raw, err := MessageFromEvents(events)
			if part == "" {
				if err != nil {
					t.Errorf("empty delta rejected %v", err)
					continue
				}
				v, _ := Object(raw)
				got, _ := json.Marshal(v["content"].([]any)[0].(map[string]any)["input"])
				if string(got) != initial {
					t.Fatal("initial input changed")
				}
			} else if err == nil {
				t.Errorf("invalid delta accepted %v", part)
			}
		}
	}
}
