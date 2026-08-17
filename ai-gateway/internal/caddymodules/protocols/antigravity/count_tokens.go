package antigravity

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
)

func (*Transformer) WrapTransport(base http.RoundTripper, plan *controlv1.ExecutionPlan, state *requeststate.State) (http.RoundTripper, error) {
	if base == nil || plan == nil || state == nil {
		return nil, fmt.Errorf("Antigravity transport state is incomplete")
	}
	countTokens, err := optionBool(plan, "count_tokens")
	if err != nil {
		return nil, err
	}
	if !countTokens {
		if plan.GetMaxAttempts() < 2 {
			return base, nil
		}
		return &signatureRecoveryTransport{base: base, state: state}, nil
	}
	return roundTripFunc(func(request *http.Request) (*http.Response, error) {
		body := []byte(`{"totalTokens":0}`)
		return &http.Response{
			StatusCode: http.StatusOK, Status: "200 OK", Request: request,
			Header: http.Header{"Content-Type": []string{"application/json"}, "Content-Length": []string{strconv.Itoa(len(body))}},
			Body:   io.NopCloser(bytes.NewReader(body)), ContentLength: int64(len(body)),
		}, nil
	}), nil
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(request *http.Request) (*http.Response, error) { return f(request) }

type signatureRecoveryTransport struct {
	base  http.RoundTripper
	state *requeststate.State
}

func (t *signatureRecoveryTransport) RoundTrip(request *http.Request) (*http.Response, error) {
	response, err := t.base.RoundTrip(request)
	if err != nil || response == nil || response.StatusCode != http.StatusBadRequest || request.GetBody == nil {
		return response, err
	}
	originalErrorBody := response.Body
	errorBody, readErr := io.ReadAll(io.LimitReader(originalErrorBody, (1<<20)+1))
	if readErr != nil || len(errorBody) > 1<<20 {
		response.Body = &recoveryReadCloser{Reader: io.MultiReader(bytes.NewReader(errorBody), originalErrorBody), closer: originalErrorBody}
		return response, nil
	}
	_ = originalErrorBody.Close()
	installBody(response, errorBody)
	if !isThoughtSignatureError(errorBody) {
		return response, nil
	}
	original, getErr := request.GetBody()
	if getErr != nil {
		return response, nil
	}
	payload, bodyErr := io.ReadAll(io.LimitReader(original, maxBodyBytes+1))
	_ = original.Close()
	if bodyErr != nil || int64(len(payload)) > maxBodyBytes {
		return response, nil
	}
	cleaned, changed, cleanErr := stripSignatureSensitiveParts(payload)
	if cleanErr != nil || !changed {
		return response, nil
	}
	retry := request.Clone(request.Context())
	retry.Header = request.Header.Clone()
	retry.Body = io.NopCloser(bytes.NewReader(cleaned))
	retry.ContentLength = int64(len(cleaned))
	retry.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(cleaned)), nil }
	retry.Header.Del("Content-Length")
	t.state.MarkUpstreamRetry()
	return t.base.RoundTrip(retry)
}

type recoveryReadCloser struct {
	io.Reader
	closer io.Closer
}

func (r *recoveryReadCloser) Close() error { return r.closer.Close() }

func isThoughtSignatureError(body []byte) bool {
	lower := strings.ToLower(string(body))
	return strings.Contains(lower, "thought_signature") || strings.Contains(lower, "thought signature") || strings.Contains(lower, "invalid signature")
}

func stripSignatureSensitiveParts(payload []byte) ([]byte, bool, error) {
	var root any
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	if err := decoder.Decode(&root); err != nil {
		return nil, false, err
	}
	changed := cleanSignatureValue(root)
	if !changed {
		return payload, false, nil
	}
	cleaned, err := marshalJSON(root)
	return cleaned, true, err
}

func cleanSignatureValue(value any) bool {
	changed := false
	switch current := value.(type) {
	case map[string]any:
		if _, exists := current["thoughtSignature"]; exists {
			delete(current, "thoughtSignature")
			changed = true
		}
		for key, child := range current {
			if parts, ok := child.([]any); ok && key == "parts" {
				filtered := parts[:0]
				for _, raw := range parts {
					part, _ := raw.(map[string]any)
					if thought, _ := part["thought"].(bool); thought {
						changed = true
						continue
					}
					if cleanSignatureValue(raw) {
						changed = true
					}
					filtered = append(filtered, raw)
				}
				current[key] = filtered
				continue
			}
			if cleanSignatureValue(child) {
				changed = true
			}
		}
	case []any:
		for _, child := range current {
			if cleanSignatureValue(child) {
				changed = true
			}
		}
	}
	return changed
}
