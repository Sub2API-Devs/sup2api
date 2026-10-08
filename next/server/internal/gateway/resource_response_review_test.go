package gateway

import (
	"bytes"
	"testing"
)

func TestResourceSSEFramingAndTerminalBoundary(t *testing.T) {
	start := ": keep-alive\r\n\r\nevent: message_start\r\ndata: {\"type\":\"message_start\",\r\ndata: \"message\":{\"content\":[]}}\r\n\r\n"
	stop := "event: message_stop\r\ndata: {\"type\":\"message_stop\"}\r\n\r\n"
	raw := []byte(start + stop + ": trailing comment\n\n")
	events, err := resourceResponseEvents(raw, true)
	if err != nil || len(events) != 4 {
		t.Fatalf("valid mixed line ending/multiline/comment events: %d %v", len(events), err)
	}
	var joined []byte
	for _, event := range events {
		joined = append(joined, event.raw...)
	}
	if !bytes.Equal(joined, raw) {
		t.Fatal("untouched event bytes changed")
	}
	for _, bad := range []string{start, start + "data: {", start + stop + stop, start + stop + start, "event: message_stop\ndata: {\"type\":\"ping\"}\n\n"} {
		if _, err := resourceResponseEvents([]byte(bad), true); err == nil {
			t.Fatalf("invalid terminal/framing accepted: %q", bad)
		}
	}
	changed := []byte(`{"type":"message_start","message":{"content":[],"id":"public"}}`)
	rewritten := rewriteResourceEvent(events[1].raw, changed)
	parsed, err := resourceResponseEvents(append(rewritten, []byte(stop)...), true)
	if err != nil || !bytes.Equal(parsed[0].data, changed) {
		t.Fatalf("multiline rewrite corrupt: %s %v", rewritten, err)
	}
}
