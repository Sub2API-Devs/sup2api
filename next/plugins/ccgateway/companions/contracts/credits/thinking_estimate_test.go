package credits

import (
	"bytes"
	"testing"
)

func thinkingEstimateEvents(delta string) [][]byte {
	return [][]byte{
		[]byte(`{"type":"message_start","message":{"id":"m","type":"message","role":"assistant","content":[],"usage":{"input_tokens":2,"output_tokens":0}}}`),
		[]byte(`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":"old"}}`),
		[]byte(`{"type":"content_block_delta","index":0,"delta":` + delta + `}`),
		[]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"b","estimated_tokens":null}}`),
		[]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"replacement"}}`),
		[]byte(`{"type":"content_block_stop","index":0}`),
		[]byte(`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":66}}`),
		[]byte(`{"type":"message_stop"}`),
	}
}
func TestThinkingEstimateDisplayOnly(t *testing.T) {
	for _, field := range []string{"", `,"estimated_tokens":null`, `,"estimated_tokens":0`, `,"estimated_tokens":128`, `,"estimated_tokens":9007199254740993`} {
		t.Run(field, func(t *testing.T) {
			events := thinkingEstimateEvents(`{"type":"thinking_delta","thinking":"a"` + field + `}`)
			before := bytes.Join(events, []byte("\n"))
			raw, err := MessageFromEvents(events)
			if err != nil {
				t.Fatal(err)
			}
			m, _ := Object(raw)
			block := m["content"].([]any)[0].(map[string]any)
			if block["thinking"] != "ab" || block["signature"] != "replacement" || len(block) != 3 {
				t.Fatalf("block changed: %v", block)
			}
			if bytes.Contains(raw, []byte("estimated_tokens")) || !bytes.Equal(before, bytes.Join(events, []byte("\n"))) {
				t.Fatal("display hint persisted or input bytes changed")
			}
			usage := m["usage"].(map[string]any)
			if usage["output_tokens"].(interface{ String() string }).String() != "66" {
				t.Fatal("estimate billed")
			}
		})
	}
}
func TestThinkingEstimateRejectsInvalidOrUnknown(t *testing.T) {
	for _, field := range []string{`,"estimated_tokens":-1`, `,"estimated_tokens":1.5`, `,"estimated_tokens":"2"`, `,"estimated_tokens":true`, `,"estimated_tokens":{}`, `,"estimated_tokens":[]`, `,"other":0`, `,"estimated_tokens":2,"other":0`} {
		if _, err := MessageFromEvents(thinkingEstimateEvents(`{"type":"thinking_delta","thinking":"a"` + field + `}`)); err == nil {
			t.Fatal("accepted", field)
		}
	}
}
