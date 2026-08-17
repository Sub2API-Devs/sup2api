package grok

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

const maxRetryErrorBodyBytes int64 = 1 << 20

func (*Transformer) WrapTransport(base http.RoundTripper, plan *controlv1.ExecutionPlan, state *requeststate.State) (http.RoundTripper, error) {
	if base == nil || plan == nil || state == nil {
		return nil, fmt.Errorf("Grok retry transport state is incomplete")
	}
	if plan.GetMaxAttempts() < 2 {
		return base, nil
	}
	return &invalidEncryptedContentRetryTransport{base: base, state: state}, nil
}

type invalidEncryptedContentRetryTransport struct {
	base  http.RoundTripper
	state *requeststate.State
}

func (t *invalidEncryptedContentRetryTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	response, err := t.base.RoundTrip(request)
	if err != nil || response == nil || response.StatusCode != http.StatusBadRequest || request.GetBody == nil {
		return response, err
	}
	errorBody, complete, readErr := readRetryErrorBody(response)
	if readErr != nil || !complete || !invalidEncryptedContentError(errorBody) {
		return response, nil
	}
	originalBody, getErr := request.GetBody()
	if getErr != nil {
		return response, nil
	}
	body, readBodyErr := io.ReadAll(io.LimitReader(originalBody, maxRequestBodyBytes+1))
	_ = originalBody.Close()
	if readBodyErr != nil || int64(len(body)) > maxRequestBodyBytes {
		return response, nil
	}
	retryBody, changed, trimErr := trimInvalidEncryptedContent(body)
	if trimErr != nil || !changed {
		return response, nil
	}
	_ = response.Body.Close()
	retry := request.Clone(request.Context())
	retry.Header = request.Header.Clone()
	retry.Body = io.NopCloser(bytes.NewReader(retryBody))
	retry.ContentLength = int64(len(retryBody))
	retry.GetBody = func() (io.ReadCloser, error) {
		return io.NopCloser(bytes.NewReader(retryBody)), nil
	}
	retry.Header.Del("Content-Length")
	t.state.MarkUpstreamRetry()
	return t.base.RoundTrip(retry)
}

func readRetryErrorBody(response *http.Response) ([]byte, bool, error) {
	prefix, err := io.ReadAll(io.LimitReader(response.Body, maxRetryErrorBodyBytes+1))
	if err != nil {
		response.Body = &joinedReadCloser{Reader: io.MultiReader(bytes.NewReader(prefix), response.Body), closer: response.Body}
		return nil, false, nil
	}
	if int64(len(prefix)) > maxRetryErrorBodyBytes {
		response.Body = &joinedReadCloser{Reader: io.MultiReader(bytes.NewReader(prefix), response.Body), closer: response.Body}
		return nil, false, nil
	}
	_ = response.Body.Close()
	response.Body = io.NopCloser(bytes.NewReader(prefix))
	response.ContentLength = int64(len(prefix))
	return prefix, true, nil
}

type joinedReadCloser struct {
	io.Reader
	closer io.Closer
}

func (r *joinedReadCloser) Close() error { return r.closer.Close() }

func invalidEncryptedContentError(payload []byte) bool {
	var root map[string]any
	if json.Unmarshal(payload, &root) != nil {
		return false
	}
	code := strings.TrimSpace(stringValue(root["code"]))
	message := ""
	switch value := root["error"].(type) {
	case string:
		message = value
	case map[string]any:
		message = stringValue(value["message"])
		if message == "" {
			message = stringValue(value["error"])
		}
		if code == "" {
			code = strings.TrimSpace(stringValue(value["code"]))
		}
	default:
		message = stringValue(root["message"])
	}
	normalized := strings.ToLower(strings.TrimSpace(message))
	if normalized == "" {
		return false
	}
	if strings.EqualFold(code, "invalid_encrypted_content") {
		return true
	}
	if code != "" && !strings.EqualFold(code, "invalid-argument") {
		return false
	}
	if code == "" && !strings.Contains(normalized, "decrypt") {
		return false
	}
	return strings.Contains(normalized, "encrypted_content") &&
		(strings.Contains(normalized, "decrypt") || strings.Contains(normalized, "unmodified"))
}

func trimInvalidEncryptedContent(payload []byte) ([]byte, bool, error) {
	root, err := decodeJSONObject(payload)
	if err != nil {
		return nil, false, err
	}
	input, exists := root["input"]
	if !exists {
		return payload, false, nil
	}
	changed := false
	sanitize := func(raw any) (any, bool) {
		item, ok := raw.(map[string]any)
		if !ok || strings.TrimSpace(stringValue(item["type"])) != "reasoning" {
			return raw, true
		}
		if _, exists := item["encrypted_content"]; !exists {
			return raw, true
		}
		delete(item, "encrypted_content")
		if item["content"] == nil {
			delete(item, "content")
		}
		changed = true
		return item, len(item) > 1
	}
	switch typed := input.(type) {
	case []any:
		filtered := make([]any, 0, len(typed))
		for _, raw := range typed {
			item, keep := sanitize(raw)
			if keep {
				filtered = append(filtered, item)
			}
		}
		if changed {
			if len(filtered) == 0 {
				delete(root, "input")
			} else {
				root["input"] = filtered
			}
		}
	case map[string]any:
		item, keep := sanitize(typed)
		if changed {
			if keep {
				root["input"] = item
			} else {
				delete(root, "input")
			}
		}
	}
	if !changed {
		return payload, false, nil
	}
	result, err := marshalJSON(root)
	return result, err == nil, err
}
