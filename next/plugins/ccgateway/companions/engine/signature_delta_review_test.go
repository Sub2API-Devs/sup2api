package engine

import "testing"

func TestReviewSignatureDeltaRejectsNonStringWithoutMutation(t *testing.T) {
	for _, value := range []any{nil, true, 17, Object{"signature": "not-a-string"}} {
		a := &Accumulator{Blocks: []Object{{"type": "thinking", "thinking": "same", "signature": "original"}}, Closed: map[int]bool{}}
		if err := a.blockDelta(Object{"index": 0, "delta": Object{"type": "signature_delta", "signature": value}}); err == nil {
			t.Fatal("invalid signature accepted")
		}
		if a.Blocks[0]["signature"] != "original" || a.Blocks[0]["thinking"] != "same" {
			t.Fatal("failure mutated opaque block")
		}
	}
}
