package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type tokenCountRequestKey struct{}

func parseTokenCountRequest(raw []byte, headers http.Header) (*Request, error) {
	return parseTokenCountRequestWithResources(raw, headers, nil)
}
func parseTokenCountRequestWithResources(raw []byte, headers http.Header, access *resourceAdmission) (*Request, error) {
	body, err := decodeObject(raw)
	if err != nil {
		return nil, err
	}
	if err := keys(body, "model", "messages", "system", "tools", "tool_choice", "thinking", "output_config", "cache_control", "context_management", "compaction"); err != nil {
		return nil, err
	}
	if output, ok := body["output_config"].(Object); ok {
		if err := keys(output, "effort", "format"); err != nil {
			return nil, fmt.Errorf("count output_config: %w", err)
		}
	}
	// This is only a CLI bootstrap limit. It is removed before the count API
	// request, and the count mode never permits any upstream generation call.
	body["max_tokens"] = json.Number("2147483647")
	data, _ := json.Marshal(body)
	req, err := parsePolicyRequestWithResources(data, headers, access)
	if err != nil {
		return nil, err
	}
	req.CountTokens = true
	req.Plan.raw = append([]byte(nil), raw...)
	return req, nil
}

func (r *outboundRelay) captureTokenCount(resp *http.Response) error {
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resp.Request = resp.Request.WithContext(context.WithValue(resp.Request.Context(), modelRequest{}, true))
		return r.passUpstreamErrors(resp)
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, (1<<20)+1))
	resp.Body.Close()
	var result Object
	if err == nil && len(raw) > 1<<20 {
		err = fmt.Errorf("token count response exceeds limit")
	}
	if err == nil {
		result, err = decodeObject(raw)
	}
	if err == nil {
		number, ok := result["input_tokens"].(json.Number)
		value, parseErr := number.Int64()
		if !ok || parseErr != nil || value < 0 {
			err = fmt.Errorf("invalid upstream token count response")
		}
	}
	r.mu.Lock()
	if err != nil {
		if r.failure == nil {
			r.failure = err
		}
	} else {
		r.tokenCountResponse = append(json.RawMessage(nil), raw...)
	}
	r.mu.Unlock()
	resp.Body = http.NoBody
	resp.ContentLength = 0
	resp.Header.Set("Content-Length", "0")
	resp.Header.Del("Content-Encoding")
	r.stop(resp.Request)
	// The CLI is now cancelled. No synthetic assistant response is generated.
	return err
}

func (r *outboundRelay) completedTokenCount() (Object, bool) {
	r.mu.Lock()
	raw := append([]byte(nil), r.tokenCountResponse...)
	r.mu.Unlock()
	if len(raw) == 0 {
		return nil, false
	}
	result, err := decodeObject(raw)
	return result, err == nil
}
