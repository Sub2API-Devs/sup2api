package engine

import (
	"io"
	"strings"
	"testing"
)

type reviewTerminalRead struct {
	data string
	err  error
}

func (r *reviewTerminalRead) Read(p []byte) (int, error) {
	if r.data == "" {
		return 0, r.err
	}
	n := copy(p, r.data)
	r.data = r.data[n:]
	if r.data == "" {
		return n, r.err
	}
	return n, nil
}
func (*reviewTerminalRead) Close() error { return nil }

func TestReviewSSETerminalGateOnDataAndReadError(t *testing.T) {
	for _, ending := range []error{io.EOF, io.ErrUnexpectedEOF} {
		for _, stopped := range []bool{false, true} {
			stream := "data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"message_stop\"}}\n\n"
			if stopped {
				stream += "data: {\"type\":\"message_stop\"}\n\n"
			}
			relay := &outboundRelay{}
			watch := &sseWatch{body: &reviewTerminalRead{data: stream, err: ending}, relay: relay, ignoreErrors: true, requireStop: true}
			out, err := io.ReadAll(watch)
			if string(out) != stream || relay.stopped == stopped {
				t.Fatalf("bytes or dispatch state changed: %q %v", out, relay.stopped)
			}
			if ending == io.ErrUnexpectedEOF && err != ending {
				t.Fatalf("original read error lost: %v", err)
			}
			if ending == io.EOF && err != nil {
				t.Fatal(err)
			}
		}
	}
	if sseHasMessageStop([]byte("data: {\"type\":\"text\",\"text\":\"message_stop\"}\n\n")) {
		t.Fatal("content spoofed terminal")
	}
	if !sseHasMessageStop([]byte(strings.ReplaceAll("data: {\"type\":\"message_stop\"}\n\n", "\n", "\r\n"))) {
		t.Fatal("CRLF terminal lost")
	}
}
