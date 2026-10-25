package credits

import (
	"testing"
)

// The Worker and the core read a credit stream with this one function
// (2026-10-25 audit r3 P2-3), so stream forms a strict parser would refuse
// still give both the same payloads: CRLF, comment and ping lines, data split
// over lines, and a last event without its closing blank line.
func TestEventPayloadsReadsEveryStreamForm(t *testing.T) {
	stream := ": keep-alive comment\r\n" +
		"event: message_start\r\ndata: {\"type\":\"message_start\"}\r\n\r\n" +
		"event: ping\ndata: {\"type\":\"ping\"}\n\n" +
		"data: {\"type\":\n" + "data: \"content_block_stop\"}\n\n" +
		"event: empty\ndata:\n\n" +
		"event: message_stop\ndata: {\"type\":\"message_stop\"}"
	got := EventPayloads([]byte(stream))
	want := []string{`{"type":"message_start"}`, `{"type":"ping"}`, "{\"type\":\n\"content_block_stop\"}", `{"type":"message_stop"}`}
	if len(got) != len(want) {
		t.Fatalf("payloads %q", got)
	}
	for i := range want {
		if string(got[i]) != want[i] {
			t.Fatalf("payload %d = %q, want %q", i, got[i], want[i])
		}
	}
}

// Only a token CC's claim would read holds an event back: in message_start's
// message or message_delta's delta, and not null; the decoded key counts,
// however the JSON spells it.
func TestEventCarriesToken(t *testing.T) {
	for payload, want := range map[string]bool{
		`{"type":"message_delta","delta":{"stop_reason":"refusal","stop_details":{"fallback_credit_token":"t"}}}`:      true,
		`{"type":"message_start","message":{"stop_details":{"fallback_credit_token":"t"}}}`:                            true,
		`{"type":"message_delta","delta":{"stop_details":{"fallback_credit_token":"t"}}}`:                              true,
		`{"type":"message_delta","delta":{"stop_details":{"fallback_credit_token":null,"fallback_credit_token":"t"}}}`: true,
		`{"type":"message_delta","delta":{"stop_details":{"fallback_credit_token":null}}}`:                             false,
		`{"type":"content_block_delta","delta":{"type":"text_delta","text":"fallback_credit_token"}}`:                  false,
		`{"type":"message_delta","delta":{"stop_reason":"end_turn"}}`:                                                  false,
		`not json fallback_credit_token`: false,
	} {
		if got := EventCarriesToken([]byte(payload)); got != want {
			t.Errorf("EventCarriesToken(%s) = %v, want %v", payload, got, want)
		}
	}
}
