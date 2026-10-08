package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// CC 2.1.292 abandons MCP input deltas, but accepts complete initial objects.
// Only the CLI transport is normalized; real block and message stops remain required.
type mcpInputCarrier struct {
	body        io.ReadCloser
	watch       *sseWatch
	observer    *apiTerminalObserver
	start       Object
	messageID   string
	index, held int
	input       strings.Builder
}

func (relay *outboundRelay) bridgeMCPInputs(resp *http.Response, req *Request) error {
	if req.MCP == nil {
		return nil
	}
	if encoding := strings.TrimSpace(resp.Header.Get("Content-Encoding")); encoding != "" && !strings.EqualFold(encoding, "identity") {
		_ = resp.Body.Close()
		relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"MCP input stream encoding was not decoded"}}`)}, resp.Request)
		return fmt.Errorf("MCP input stream encoding was not decoded")
	}
	c := &mcpInputCarrier{body: resp.Body, observer: &apiTerminalObserver{relay: relay, req: req}}
	c.watch = &sseWatch{body: resp.Body, relay: relay, request: resp.Request, ignoreErrors: true, guard: c.event}
	resp.Body = c
	// Re-encoded input blocks have different byte lengths. The proxy chooses
	// downstream framing; neither upstream length nor transfer coding survives.
	resp.ContentLength = -1
	resp.Header.Del("Content-Length")
	resp.TransferEncoding = nil
	resp.Header.Del("Transfer-Encoding")
	return nil
}

func (c *mcpInputCarrier) Read(p []byte) (int, error) {
	n, err := c.watch.Read(p)
	if err == io.EOF && c.start != nil {
		err = fmt.Errorf("incomplete MCP input block")
	}
	if err != nil && err != io.EOF {
		c.observer.relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"MCP input stream could not be preserved"}}`)}, c.watch.request)
	}
	return n, err
}
func (c *mcpInputCarrier) Close() error { return c.body.Close() }

func (c *mcpInputCarrier) event(raw []byte) ([]byte, error) {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if v, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimSpace(v))
		}
	}
	if len(data) == 0 {
		return raw, nil
	}
	e, err := decodeObject(bytes.Join(data, []byte("\n")))
	if err != nil {
		return nil, fmt.Errorf("invalid MCP stream event")
	}
	kind := str(e, "type")
	if c.start == nil {
		if kind == "message_start" {
			m, _ := e["message"].(Object)
			c.messageID = str(m, "id")
		}
		block, _ := e["content_block"].(Object)
		if kind != "content_block_start" || str(block, "type") != "mcp_tool_use" {
			return raw, nil
		}
		if input, ok := block["input"].(Object); !ok || input == nil {
			return nil, fmt.Errorf("MCP input must be an object")
		}
		index, ok := integer(e["index"])
		if !ok || c.messageID == "" {
			return nil, fmt.Errorf("invalid MCP input identity")
		}
		if len(raw) > 16<<20 {
			return nil, fmt.Errorf("MCP input block exceeds carrier limit")
		}
		c.start = e
		c.index = index
		c.held = len(raw)
		return nil, nil
	}
	c.held += len(raw)
	if c.held > 16<<20 {
		return nil, fmt.Errorf("MCP input block exceeds carrier limit")
	}
	if kind == "ping" {
		return raw, nil
	}
	if kind == "error" {
		c.start = nil
		return raw, nil
	}
	index, ok := integer(e["index"])
	if !ok || index != c.index {
		return nil, fmt.Errorf("MCP input block event order changed")
	}
	switch kind {
	case "content_block_delta":
		delta, _ := e["delta"].(Object)
		if err := keys(e, "type", "index", "delta"); err != nil {
			return nil, err
		}
		if err := keys(delta, "type", "partial_json"); err != nil {
			return nil, err
		}
		if str(delta, "type") != "input_json_delta" {
			return nil, fmt.Errorf("unsupported MCP input delta")
		}
		part, ok := delta["partial_json"].(string)
		if !ok {
			return nil, fmt.Errorf("invalid MCP input delta value")
		}
		c.input.WriteString(part)
		return nil, nil
	case "content_block_stop":
		return c.complete(raw)
	default:
		return nil, fmt.Errorf("MCP input block ended without stop")
	}
}

func (c *mcpInputCarrier) complete(stop []byte) ([]byte, error) {
	block := c.start["content_block"].(Object)
	c.observer.relay.mu.Lock()
	source, found := c.observer.relay.exactToolInputs[c.messageID][c.index]
	c.observer.relay.mu.Unlock()
	if !found || digest(source.block) != digest(block) {
		return nil, fmt.Errorf("MCP source input identity changed")
	}
	if c.input.Len() != 0 {
		if len(block["input"].(Object)) != 0 {
			return nil, fmt.Errorf("conflicting MCP initial and streamed input")
		}
		input, err := decodeObject([]byte(c.input.String()))
		if err != nil || input == nil {
			return nil, fmt.Errorf("invalid MCP streamed input JSON")
		}
		block["input"] = input
	}
	// Source deltas are still exact UseNumber data from the attributed stream.
	// Register the equivalent complete object before CC can round its numbers.
	c.observer.exactToolMessageID = c.messageID
	c.observer.observeExactToolInput(c.start)
	encoded, err := json.Marshal(c.start)
	if err != nil {
		return nil, err
	}
	out := append([]byte("event: content_block_start\ndata: "), encoded...)
	out = append(out, []byte("\n\n")...)
	out = append(out, stop...)
	c.start = nil
	c.input.Reset()
	c.held = 0
	return out, nil
}
