package credits

import (
	"encoding/json"
	"testing"
)

func TestSignatureDeltaReplacesOpaqueSignature(t *testing.T) {
	for _, final := range []string{"final", ""} {
		delta, _ := json.Marshal(map[string]any{"type": "content_block_delta", "index": 0, "delta": map[string]any{"type": "signature_delta", "signature": final}})
		events := [][]byte{
			[]byte(`{"type":"message_start","message":{"id":"msg_sig","type":"message","role":"assistant","content":[]}}`),
			[]byte(`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"reason","signature":"initial"}}`),
			[]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"first"}}`),
			delta,
			[]byte(`{"type":"content_block_stop","index":0}`),
			[]byte(`{"type":"message_delta","delta":{"stop_reason":"end_turn"}}`),
			[]byte(`{"type":"message_stop"}`),
		}
		raw, err := MessageFromEvents(events)
		if err != nil {
			t.Fatal(err)
		}
		var message struct {
			Content []struct {
				Signature string
				Thinking  string
			}
		}
		if err := json.Unmarshal(raw, &message); err != nil {
			t.Fatal(err)
		}
		if len(message.Content) != 1 || message.Content[0].Signature != final || message.Content[0].Thinking != "reason" {
			t.Fatalf("opaque signature changed: %s", raw)
		}
	}
}
