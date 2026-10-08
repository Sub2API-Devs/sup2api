package credits

import (
	"bytes"
	"testing"
)

func TestMessageFromEventsExactContent(t *testing.T) {
	events := [][]byte{
		[]byte(`{"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"source","content":[],"usage":{"input_tokens":9007199254740993}}}`),
		[]byte(`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"","signature":""}}`),
		[]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"reason"}}`),
		[]byte(`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"opaque"}}`),
		[]byte(`{"type":"content_block_stop","index":0}`),
		[]byte(`{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tool_1","name":"test","input":{}}}`),
		[]byte(`{"type":"content_block_delta","index":1,"delta":{"type":"input_json_delta","partial_json":"{\"n\":9007199254740993}"}}`),
		[]byte(`{"type":"content_block_stop","index":1}`),
		[]byte(`{"type":"content_block_start","index":2,"content_block":{"type":"text","text":"partial"}}`),
		[]byte(`{"type":"content_block_delta","index":2,"delta":{"type":"citations_delta","citation":{"type":"web_search_result_location","encrypted_index":"opaque-source"}}}`),
		[]byte(`{"type":"content_block_stop","index":2}`),
		[]byte(`{"type":"message_delta","delta":{"stop_reason":"refusal","stop_details":{"type":"refusal","fallback_credit_token":"test-token"}},"usage":{"output_tokens":5}}`),
		[]byte(`{"type":"message_stop"}`),
	}
	raw, err := MessageFromEvents(events)
	if err != nil {
		t.Fatal(err)
	}
	for _, text := range []string{`"n":9007199254740993`, `"input_tokens":9007199254740993`, `"signature":"opaque"`, `"encrypted_index":"opaque-source"`, `"fallback_credit_token":"test-token"`} {
		if !bytes.Contains(raw, []byte(text)) {
			t.Fatal("lost fact", text)
		}
	}
	frames := make([][]byte, len(events))
	for i, e := range events {
		frames[i] = append(append([]byte("event: fixture\r\ndata: "), e...), []byte("\r\n\r\n")...)
	}
	assembled, err := MessageFromEvents(frames)
	if err != nil || !bytes.Equal(raw, assembled) {
		t.Fatal("SSE frame mismatch", err)
	}
	for _, tc := range []struct {
		name        string
		index       int
		replacement string
	}{
		{"identity", 11, `{"type":"message_delta","delta":{"stop_reason":"refusal","model":"other"}}`},
		{"unknown-delta", 6, `{"type":"content_block_delta","index":1,"delta":{"type":"unknown","data":"x"}}`},
		{"wrong-index", 7, `{"type":"content_block_stop","index":9}`},
		{"incomplete", 12, `{"type":"ping"}`},
	} {
		t.Run(tc.name, func(t *testing.T) {
			changed := append([][]byte{}, events...)
			changed[tc.index] = []byte(tc.replacement)
			if _, err := MessageFromEvents(changed); err == nil {
				t.Fatal("accepted broken credit stream")
			}
		})
	}
}
