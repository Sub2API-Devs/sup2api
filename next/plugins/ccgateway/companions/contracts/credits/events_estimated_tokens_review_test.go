package credits

import (
	"bytes"
	"encoding/json"
	"testing"
)

func independentEstimateFrames(delta string) [][]byte {
	payloads := []string{
		`{"type":"message_start","message":{"id":"review","type":"message","role":"assistant","content":[],"usage":{"input_tokens":17,"output_tokens":0}}}`,
		`{"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":"initial:","signature":"old"}}`,
		`{"type":"content_block_delta","index":0,"delta":` + delta + `}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"first"}}`,
		`{"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":""}}`,
		`{"type":"content_block_stop","index":0}`,
		`{"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":3}}`,
		`{"type":"message_stop"}`,
	}
	frames := make([][]byte, len(payloads))
	for i, p := range payloads {
		frames[i] = []byte("event: fixture\r\ndata: " + p + "\r\n\r\n")
	}
	return frames
}

func TestIndependentEstimatedTokensAreOnlyProgress(t *testing.T) {
	for _, value := range []string{"null", "0", "128", "9007199254740993"} {
		t.Run(value, func(t *testing.T) {
			frames := independentEstimateFrames(`{"type":"thinking_delta","thinking":"next","estimated_tokens":` + value + `}`)
			before := append([]byte(nil), bytes.Join(frames, nil)...)
			raw, err := MessageFromEvents(frames)
			if err != nil {
				t.Fatal(err)
			}
			baseline, err := MessageFromEvents(independentEstimateFrames(`{"type":"thinking_delta","thinking":"next"}`))
			if err != nil || !bytes.Equal(raw, baseline) {
				t.Fatal("progress changed persistent message or prefix input", err)
			}
			m, err := Object(raw)
			if err != nil {
				t.Fatal(err)
			}
			block := m["content"].([]any)[0].(map[string]any)
			if block["thinking"] != "initial:next" || block["signature"] != "" || len(block) != 3 {
				t.Fatalf("initial text/signature replacement changed: %#v", block)
			}
			usage := m["usage"].(map[string]any)
			if usage["input_tokens"] != json.Number("17") || usage["output_tokens"] != json.Number("3") || len(usage) != 2 {
				t.Fatalf("progress entered billing: %#v", usage)
			}
			if bytes.Contains(raw, []byte("estimated_tokens")) {
				t.Fatal("progress entered persisted message")
			}
			if !bytes.Equal(before, bytes.Join(frames, nil)) {
				t.Fatal("original SSE mutated")
			}
		})
	}
}

func TestIndependentEstimatedTokensMultipleFramesNotSummedIntoUsage(t *testing.T) {
	frames := independentEstimateFrames(`{"type":"thinking_delta","thinking":"a","estimated_tokens":128}`)
	second := []byte("event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"thinking_delta\",\"thinking\":\"b\",\"estimated_tokens\":256}}\n\n")
	frames = append(frames[:3], append([][]byte{second}, frames[3:]...)...)
	before := append([]byte(nil), bytes.Join(frames, nil)...)
	raw, err := MessageFromEvents(frames)
	if err != nil {
		t.Fatal(err)
	}
	baseline, err := MessageFromEvents(independentEstimateFrames(`{"type":"thinking_delta","thinking":"ab"}`))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(raw, baseline) {
		t.Fatal("multiple display increments changed message or authoritative usage")
	}
	if !bytes.Equal(before, bytes.Join(frames, nil)) {
		t.Fatal("original progress frames changed")
	}
}

func TestIndependentEstimatedTokensStrictShape(t *testing.T) {
	for _, delta := range []string{
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":-128}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":0.5}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":"128"}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":true}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":{}}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":[]}`,
		`{"type":"thinking_delta","thinking":"next","unknown":null}`,
		`{"type":"thinking_delta","thinking":"next","estimated_tokens":null,"unknown":null}`,
		`{"type":"thinking_delta","estimated_tokens":128}`,
		`{"type":"signature_delta","signature":"x","estimated_tokens":128}`,
	} {
		if _, err := MessageFromEvents(independentEstimateFrames(delta)); err == nil {
			t.Errorf("unexpected acceptance: %s", delta)
		}
	}
}
