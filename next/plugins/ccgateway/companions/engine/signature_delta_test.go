package engine

import "testing"

func TestSignatureDeltaReplacesOpaqueSignature(t *testing.T) {
	a := &Accumulator{Blocks: []Object{{"type": "thinking", "thinking": "reason", "signature": "initial"}}, Closed: map[int]bool{}}
	for _, signature := range []string{"first", "final", ""} {
		err := a.blockDelta(Object{"index": 0, "delta": Object{"type": "signature_delta", "signature": signature}})
		if err != nil || a.Blocks[0]["signature"] != signature || a.Blocks[0]["thinking"] != "reason" {
			t.Fatalf("signature replacement failed: %v, %v", a.Blocks[0], err)
		}
	}
}
