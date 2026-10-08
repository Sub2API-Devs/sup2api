package strict

import "testing"

func TestSignatureDeltaReplacesOpaqueSignature(t *testing.T) {
	s := &Stream{}
	b := &streamBlock{block: object{"type": "thinking", "signature": "initial"}}
	for _, signature := range []string{"first", "final", ""} {
		_, err := s.delta(0, b, object{"type": "signature_delta", "signature": signature})
		if err != nil || b.block["signature"] != signature {
			t.Fatalf("signature concatenated: %v, %v", b.block, err)
		}
	}
}
