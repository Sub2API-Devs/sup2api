package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func mcpCarrierEvent(e Object) []byte {
	b, _ := json.Marshal(e)
	return append(append([]byte("data: "), b...), []byte("\n\n")...)
}
func newTestMCPCarrier(t *testing.T) (*mcpInputCarrier, Object) {
	t.Helper()
	block := Object{"type": "mcp_tool_use", "id": "mcp_fixture", "server_name": "one", "name": "read", "input": Object{}}
	relay := &outboundRelay{exactToolInputs: map[string]map[int]exactToolCapture{"msg_fixture": {0: {block: block}}}}
	c := &mcpInputCarrier{observer: &apiTerminalObserver{relay: relay, req: &Request{}}}
	if _, err := c.event(mcpCarrierEvent(Object{"type": "message_start", "message": Object{"id": "msg_fixture"}})); err != nil {
		t.Fatal(err)
	}
	if out, err := c.event(mcpCarrierEvent(Object{"type": "content_block_start", "index": 0, "content_block": block})); err != nil || len(out) != 0 {
		t.Fatal("start must be held", err)
	}
	return c, block
}
func TestMCPInputCarrierExactAndInvalid(t *testing.T) {
	for _, part := range []string{"", `{"n":9007199254740993}`, " ", `{"n":`, "[]", "null"} {
		t.Run(part, func(t *testing.T) {
			c, _ := newTestMCPCarrier(t)
			for _, fragment := range []string{"", part, ""} {
				out, err := c.event(mcpCarrierEvent(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": fragment}}))
				if err != nil || len(out) != 0 {
					t.Fatal("delta must be held", err)
				}
			}
			out, err := c.event(mcpCarrierEvent(Object{"type": "content_block_stop", "index": 0}))
			valid := part == "" || strings.Contains(part, "9007199254740993")
			if !valid {
				if err == nil {
					t.Fatal("invalid JSON accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if bytes.Contains(out, []byte("input_json_delta")) || bytes.Contains(out, []byte("message_stop")) {
				t.Fatal("invented terminal or leaked incompatible delta")
			}
			if part != "" && !bytes.Contains(out, []byte("9007199254740993")) {
				t.Fatal("numeric precision lost")
			}
		})
	}
	for _, e := range []Object{
		{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": nil}},
		{"type": "content_block_delta", "index": 1, "delta": Object{"type": "input_json_delta", "partial_json": ""}},
		{"type": "content_block_start", "index": 1, "content_block": Object{"type": "text", "text": "unexpected"}},
		{"type": "message_stop"},
	} {
		c, _ := newTestMCPCarrier(t)
		if _, err := c.event(mcpCarrierEvent(e)); err == nil {
			t.Fatal("malformed sequence accepted")
		}
	}
	c, _ := newTestMCPCarrier(t)
	c.held = 16 << 20
	if _, err := c.event(mcpCarrierEvent(Object{"type": "ping"})); err == nil {
		t.Fatal("unbounded carrier")
	}
	c, _ = newTestMCPCarrier(t)
	delete(c.observer.relay.exactToolInputs, "msg_fixture")
	if _, err := c.event(mcpCarrierEvent(Object{"type": "content_block_stop", "index": 0})); err == nil {
		t.Fatal("missing original source accepted")
	}
}
func TestMCPInputCarrierEOFDoesNotSucceed(t *testing.T) {
	c, _ := newTestMCPCarrier(t)
	c.watch = &sseWatch{body: io.NopCloser(strings.NewReader("")), relay: c.observer.relay, request: httptest.NewRequest("POST", "http://fixture/v1/messages", nil)}
	if _, err := c.Read(make([]byte, 10)); err == nil || err == io.EOF {
		t.Fatal("incomplete block accepted")
	}
	if c.observer.relay.UpstreamError() == nil {
		t.Fatal("malformed source not made terminal")
	}
}

func TestMCPInputCarrierFragmentedBufferAndInitialBound(t *testing.T) {
	c, _ := newTestMCPCarrier(t)
	value := strings.Repeat("x", 8192)
	input := `{"value":"` + value + `"}`
	for _, ch := range input {
		if out, err := c.event(mcpCarrierEvent(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": string(ch)}})); err != nil || len(out) != 0 {
			t.Fatal(err)
		}
	}
	if c.input.Len() != len(input) {
		t.Fatal("fragment assembly changed")
	}
	out, err := c.event(mcpCarrierEvent(Object{"type": "content_block_stop", "index": 0}))
	if err != nil || !bytes.Contains(out, []byte(value)) || c.input.Len() != 0 {
		t.Fatal("fragment assembly or reset failed", err)
	}
	c, _ = newTestMCPCarrier(t)
	c.start = nil
	event := Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "mcp_tool_use", "id": "fixture", "name": "read", "server_name": "one", "input": Object{"large": strings.Repeat("x", 16<<20)}}}
	if _, err := c.event(mcpCarrierEvent(event)); err == nil || c.start != nil {
		t.Fatal("oversized initial block retained")
	}
}

func TestMCPInputCarrierRejectsUnDecodedEncoding(t *testing.T) {
	for _, encoding := range []string{"gzip", "br", "unknown"} {
		t.Run(encoding, func(t *testing.T) {
			relay := &outboundRelay{}
			response := &http.Response{Header: http.Header{"Content-Encoding": []string{encoding}}, Body: io.NopCloser(strings.NewReader("not decoded")), Request: httptest.NewRequest("POST", "http://fixture/v1/messages", nil)}
			if err := relay.bridgeMCPInputs(response, &Request{MCP: &MCPConnectorPlan{}}); err == nil || relay.UpstreamError() == nil {
				t.Fatal("encoded stream accepted")
			}
		})
	}
}
