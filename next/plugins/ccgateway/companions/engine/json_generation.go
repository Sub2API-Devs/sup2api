package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
)

type jsonGenerationRequestKey struct{}

// bridgeJSONGeneration carries a real nonstreaming provider reply through CC's
// internal SSE transport. No second provider request or SSE-to-JSON approximation.
func (r *outboundRelay) bridgeJSONGeneration(resp *http.Response, req *Request) error {
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resp.Request = resp.Request.WithContext(context.WithValue(resp.Request.Context(), modelRequest{}, true))
		return r.passUpstreamErrors(resp)
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (32<<20)+1))
	resp.Body.Close()
	if err == nil && len(raw) > 32<<20 {
		err = fmt.Errorf("JSON generation response exceeds 32 MiB")
	}
	var answer Object
	if err == nil {
		answer, err = decodeObject(raw)
	}
	if err == nil && !strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
		err = fmt.Errorf("JSON generation expected application/json")
	}
	var events []Object
	var mapped Object
	if err == nil {
		events, mapped, err = jsonGenerationEvents(answer, req)
	}
	if err != nil {
		r.mu.Lock()
		if r.failure == nil {
			r.failure = err
		}
		r.mu.Unlock()
		r.stop(resp.Request)
		return err
	}
	payload, err := json.Marshal(mapped)
	if err != nil {
		return err
	}
	r.mu.Lock()
	r.jsonResponse = append(json.RawMessage(nil), payload...)
	r.stopped = true
	r.mu.Unlock()
	var wire bytes.Buffer
	observer := &apiTerminalObserver{relay: r, req: req}
	for _, event := range events {
		b, _ := json.Marshal(event)
		frame := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", str(event, "type"), b))
		observer.observe(frame)
		wire.Write(frame)
	}
	resp.Body = io.NopCloser(bytes.NewReader(wire.Bytes()))
	resp.ContentLength = int64(wire.Len())
	resp.TransferEncoding = nil
	resp.Header.Set("Content-Type", "text/event-stream")
	resp.Header.Del("Content-Encoding")
	resp.Header.Del("Transfer-Encoding")
	resp.Header.Set("Content-Length", strconv.Itoa(wire.Len()))
	return nil
}

func jsonGenerationEvents(answer Object, req *Request) ([]Object, Object, error) {
	content, ok := answer["content"].([]any)
	if !ok || str(answer, "type") != "message" || str(answer, "role") != "assistant" || str(answer, "id") == "" || str(answer, "model") == "" || str(answer, "stop_reason") == "" {
		return nil, nil, fmt.Errorf("invalid provider JSON message")
	}
	start := Object{}
	for k, v := range answer {
		start[k] = v
	}
	start["content"] = []any{}
	start["stop_reason"] = nil
	start["stop_sequence"] = nil
	events := []Object{{"type": "message_start", "message": start}}
	for i, value := range content {
		block, ok := value.(map[string]any)
		if !ok {
			return nil, nil, fmt.Errorf("invalid provider JSON block")
		}
		events = append(events, Object{"type": "content_block_start", "index": i, "content_block": block}, Object{"type": "content_block_stop", "index": i})
	}
	delta := Object{"stop_reason": answer["stop_reason"], "stop_sequence": answer["stop_sequence"]}
	copyResponseExtensions(delta, answer)
	events = append(events, Object{"type": "message_delta", "delta": delta, "usage": answer["usage"]}, Object{"type": "message_stop"})
	acc := &Accumulator{}
	for _, event := range events {
		raw, _ := json.Marshal(event)
		copy, err := decodeObject(raw)
		if err != nil {
			return nil, nil, err
		}
		if err = acc.push(copy, req.responseView()); err != nil {
			return nil, nil, fmt.Errorf("invalid provider JSON completion: %w", err)
		}
	}
	if !acc.Done {
		return nil, nil, fmt.Errorf("provider JSON completion incomplete")
	}
	// Keep all real envelope fields, using the standard client-facing tool map.
	mapped := Object{}
	for k, v := range answer {
		mapped[k] = v
	}
	mapped["content"] = acc.Blocks
	return events, mapped, nil
}
func (r *outboundRelay) completedJSONGeneration() (Object, error) {
	r.mu.Lock()
	raw := append([]byte(nil), r.jsonResponse...)
	r.mu.Unlock()
	if len(raw) == 0 {
		return nil, fmt.Errorf("missing verified JSON generation response")
	}
	return decodeObject(raw)
}
