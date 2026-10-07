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

type warmupRequestKey struct{}

// The official warm-up endpoint is nonstreaming. CC still speaks SSE internally;
// split the actual response into events without inventing content or usage.
func (r *outboundRelay) bridgeWarmupResponse(resp *http.Response) error {
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resp.Request = resp.Request.WithContext(context.WithValue(resp.Request.Context(), modelRequest{}, true))
		return r.passUpstreamErrors(resp)
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (4<<20)+1))
	resp.Body.Close()
	if err == nil && len(raw) > 4<<20 {
		err = fmt.Errorf("cache warm-up response exceeds limit")
	}
	var answer Object
	if err == nil {
		answer, err = decodeObject(raw)
	}
	if err == nil {
		content, ok := answer["content"].([]any)
		usage, _ := answer["usage"].(map[string]any)
		output, number := usage["output_tokens"].(json.Number)
		n, nerr := output.Int64()
		if !strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") || str(answer, "type") != "message" || str(answer, "role") != "assistant" || str(answer, "id") == "" || !ok || len(content) != 0 || str(answer, "stop_reason") != "max_tokens" || !number || nerr != nil || n != 0 {
			err = fmt.Errorf("invalid cache warm-up completion")
		}
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
	r.mu.Lock()
	r.warmupResponse = append(json.RawMessage(nil), raw...)
	r.stopped = true // A completed warm-up must never be resent by CC's empty-answer retry.
	r.mu.Unlock()
	start := Object{}
	for key, value := range answer {
		start[key] = value
	}
	start["stop_reason"] = nil
	start["stop_sequence"] = nil
	var wire bytes.Buffer
	for _, event := range []Object{
		{"type": "message_start", "message": start},
		{"type": "message_delta", "delta": Object{"stop_reason": answer["stop_reason"], "stop_sequence": answer["stop_sequence"]}, "usage": answer["usage"]},
		{"type": "message_stop"},
	} {
		data, _ := json.Marshal(event)
		fmt.Fprintf(&wire, "event: %s\ndata: %s\n\n", str(event, "type"), data)
	}
	resp.Body = io.NopCloser(bytes.NewReader(wire.Bytes()))
	resp.ContentLength = int64(wire.Len())
	resp.Header.Set("Content-Type", "text/event-stream")
	resp.Header.Del("Content-Encoding")
	resp.Header.Del("Transfer-Encoding")
	resp.TransferEncoding = nil
	resp.Header.Set("Content-Length", strconv.Itoa(wire.Len()))
	return nil
}

func (r *outboundRelay) completedWarmup() (Object, error) {
	r.mu.Lock()
	raw := append([]byte(nil), r.warmupResponse...)
	r.mu.Unlock()
	if len(raw) == 0 {
		return nil, fmt.Errorf("missing verified cache warm-up response")
	}
	return decodeObject(raw)
}
