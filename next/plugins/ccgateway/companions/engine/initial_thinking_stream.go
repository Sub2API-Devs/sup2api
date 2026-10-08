package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// CLI 2.1.292 drops initial thinking/signature strings. Only its private stream
// receives equivalent deltas; the source observer and trace wrap the raw body first.
type initialThinkingCarrier struct{ watch *sseWatch }

func (relay *outboundRelay) bridgeInitialThinking(resp *http.Response) error {
	if encoding := strings.TrimSpace(resp.Header.Get("Content-Encoding")); encoding != "" && !strings.EqualFold(encoding, "identity") {
		_ = resp.Body.Close()
		relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"thinking stream encoding was not decoded"}}`)}, resp.Request)
		return fmt.Errorf("thinking stream encoding was not decoded")
	}
	resp.Body = &initialThinkingCarrier{watch: &sseWatch{body: resp.Body, relay: relay, request: resp.Request, ignoreErrors: true, guard: initialThinkingEvent}}
	resp.ContentLength = -1
	resp.Header.Del("Content-Length")
	resp.TransferEncoding = nil
	resp.Header.Del("Transfer-Encoding")
	return nil
}
func (c *initialThinkingCarrier) Close() error { return c.watch.Close() }
func (c *initialThinkingCarrier) Read(p []byte) (int, error) {
	n, e := c.watch.Read(p)
	if e != nil && e != io.EOF {
		c.watch.relay.reject(&upstreamError{Status: 502, ContentType: "application/json", Body: []byte(`{"type":"error","error":{"type":"api_error","message":"thinking stream could not be preserved"}}`)}, c.watch.request)
	}
	return n, e
}
func initialThinkingEvent(raw []byte) ([]byte, error) {
	var data [][]byte
	for _, line := range bytes.Split(bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n")), []byte("\n")) {
		if v, ok := bytes.CutPrefix(line, []byte("data:")); ok {
			data = append(data, bytes.TrimPrefix(v, []byte(" ")))
		}
	}
	if len(data) == 0 {
		return raw, nil
	}
	event, e := decodeObject(bytes.Join(data, []byte("\n")))
	if e != nil {
		return nil, fmt.Errorf("invalid thinking stream event")
	}
	block, _ := event["content_block"].(Object)
	if str(event, "type") != "content_block_start" || str(block, "type") != "thinking" {
		return raw, nil
	}
	thinking, ok := block["thinking"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid initial thinking value")
	}
	signature, ok := block["signature"].(string)
	_, signaturePresent := block["signature"]
	if signaturePresent && !ok {
		return nil, fmt.Errorf("invalid initial signature value")
	}
	if thinking == "" && signature == "" {
		return raw, nil
	}
	index, ok := integer(event["index"])
	if !ok || index < 0 {
		return nil, fmt.Errorf("invalid initial thinking index")
	}
	block["thinking"] = ""
	block["signature"] = ""
	var out bytes.Buffer
	emit := func(e Object) error {
		b, err := json.Marshal(e)
		if err != nil {
			return err
		}
		fmt.Fprintf(&out, "event: %s\ndata: %s\n\n", str(e, "type"), b)
		return nil
	}
	if e = emit(event); e != nil {
		return nil, e
	}
	if thinking != "" {
		if e = emit(Object{"type": "content_block_delta", "index": event["index"], "delta": Object{"type": "thinking_delta", "thinking": thinking}}); e != nil {
			return nil, e
		}
	}
	if signature != "" {
		if e = emit(Object{"type": "content_block_delta", "index": event["index"], "delta": Object{"type": "signature_delta", "signature": signature}}); e != nil {
			return nil, e
		}
	}
	return out.Bytes(), nil
}
