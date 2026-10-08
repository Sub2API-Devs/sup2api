package engine

import (
	"bytes"
	"compress/gzip"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

func TestReviewInitialThinkingMixedReplacementAndNonTarget(t *testing.T) {
	events := thinkingFixtureEvents("initial", "original-opaque")
	extra := []Object{{"type": "content_block_delta", "index": 0, "delta": Object{"type": "thinking_delta", "thinking": "tail"}}, {"type": "content_block_delta", "index": 0, "delta": Object{"type": "signature_delta", "signature": "replace-one"}}, {"type": "content_block_delta", "index": 0, "delta": Object{"type": "signature_delta", "signature": "replace-final"}}}
	events = append(append(append([]Object{}, events[:2]...), extra...), events[2:]...)
	var source, normalized []byte
	for _, event := range events {
		raw := mcpCarrierEvent(event)
		source = append(source, raw...)
		out, err := initialThinkingEvent(raw)
		if err != nil {
			t.Fatal(err)
		}
		normalized = append(normalized, out...)
	}
	a, err := credits.MessageFromEvents(thinkingEventData(source))
	if err != nil {
		t.Fatal(err)
	}
	b, err := credits.MessageFromEvents(thinkingEventData(normalized))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(a, b) || !bytes.Contains(b, []byte(`"signature":"replace-final"`)) || bytes.Contains(b, []byte("original-opaquereplace")) {
		t.Fatal("opaque signature changed")
	}
	for _, raw := range [][]byte{[]byte(": heartbeat\r\n\r\n"), []byte("event: ping\r\ndata: {\"type\":\"ping\",\"future\":true}\r\n\r\n"), mcpCarrierEvent(Object{"type": "content_block_start", "index": 2, "content_block": Object{"type": "redacted_thinking", "data": "opaque"}})} {
		out, err := initialThinkingEvent(raw)
		if err != nil || !bytes.Equal(raw, out) {
			t.Fatal("non-target bytes changed")
		}
	}
}

func TestReviewInitialThinkingCloseUnblocksRead(t *testing.T) {
	reader, writer := io.Pipe()
	defer writer.Close()
	response := &http.Response{Header: http.Header{}, Body: reader, Request: httptest.NewRequest("POST", "http://fixture", nil)}
	relay := &outboundRelay{}
	if err := relay.bridgeInitialThinking(response); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() { _, err := io.ReadAll(response.Body); done <- err }()
	if err := response.Body.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err == nil {
			t.Fatal("closed incomplete stream succeeded")
		}
	case <-time.After(time.Second):
		t.Fatal("Close did not unblock underlying read")
	}
}

func TestReviewInitialThinkingCompressedTransport(t *testing.T) {
	var original []byte
	for _, event := range thinkingFixtureEvents("initial", "opaque") {
		original = append(original, mcpCarrierEvent(event)...)
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Content-Encoding", "gzip")
		z := gzip.NewWriter(w)
		_, _ = z.Write(original)
		_ = z.Close()
	}))
	defer server.Close()
	response, err := http.Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	if !response.Uncompressed || response.Header.Get("Content-Encoding") != "" {
		t.Fatal("test did not exercise HTTP decompression")
	}
	relay := &outboundRelay{}
	var observed []byte
	response.Body = &sseWatch{body: response.Body, relay: relay, request: response.Request, ignoreErrors: true, observe: func(raw []byte) { observed = append(observed, raw...) }}
	if err = relay.bridgeInitialThinking(response); err != nil {
		t.Fatal(err)
	}
	out, err := io.ReadAll(response.Body)
	response.Body.Close()
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(observed, original) {
		t.Fatal("source observer saw rewritten thinking")
	}
	if _, err = credits.MessageFromEvents(thinkingEventData(out)); err != nil {
		t.Fatal(err)
	}
	for _, encoding := range []string{"gzip", "br", "unknown"} {
		response := &http.Response{Header: http.Header{"Content-Encoding": []string{encoding}}, Body: io.NopCloser(bytes.NewReader(original)), Request: httptest.NewRequest("POST", "http://fixture", nil)}
		if relay.bridgeInitialThinking(response) == nil {
			t.Fatal("undecoded encoding accepted", encoding)
		}
	}
}
