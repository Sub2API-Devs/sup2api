package apicompat

import "testing"

func TestSignatureDeltaReplacesOpaqueSignature(t *testing.T) {
	s := NewAnthropicEventToResponsesState()
	s.PreserveThinkingSignatures = true
	s.CurrentThinking = AnthropicContentBlock{Type: "thinking", Signature: "initial"}
	for _, signature := range []string{"first", "final", ""} {
		anthToResHandleContentBlockDelta(&AnthropicStreamEvent{Delta: &AnthropicDelta{Type: "signature_delta", Signature: signature}}, s)
		if s.CurrentThinking.Signature != signature {
			t.Fatalf("signature concatenated: %q", s.CurrentThinking.Signature)
		}
	}
}
