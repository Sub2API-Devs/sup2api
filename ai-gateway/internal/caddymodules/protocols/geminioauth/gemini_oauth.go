// Package geminioauth implements native Gemini requests over OAuth-backed AI
// Studio and Gemini Code Assist accounts.
package geminioauth

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
	"github.com/caddyserver/caddy/v2"
)

const (
	maxBodyBytes     int64 = 64 << 20
	countEstimateKey       = "gemini_oauth.count_estimate.v1"
)

func init() { caddy.RegisterModule(Transformer{}) }

type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.gemini_oauth", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }
func (*Transformer) HandlesModelRewrite() bool  { return true }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Gemini OAuth request state is incomplete")
	}
	mode := strings.TrimSpace(plan.GetProtocolOptions()["mode"])
	if mode != "code_assist" && mode != "ai_studio" {
		return fmt.Errorf("invalid Gemini OAuth mode")
	}
	countTokens, err := optionBool(plan, "count_tokens")
	if err != nil {
		return err
	}
	payload, err := readBounded(request.Body, maxBodyBytes, "Gemini OAuth request")
	if err != nil {
		return clientError(err)
	}
	root, err := decodeObject(payload)
	if err != nil {
		return clientError(err)
	}
	filterEmptyContents(root)
	ensureFunctionCallThoughtSignatures(root)
	if countTokens {
		state.SetProtocolData(countEstimateKey, []byte(strconv.Itoa(estimateCountTokens(root))))
	}
	if mode == "code_assist" {
		projectID := strings.TrimSpace(plan.GetProtocolOptions()["project_id"])
		model := strings.TrimSpace(plan.GetMappedModel())
		if projectID == "" || model == "" {
			return fmt.Errorf("Gemini Code Assist execution plan is incomplete")
		}
		root = map[string]any{"model": model, "project": projectID, "request": root}
	}
	transformed, err := marshalJSON(root)
	if err != nil {
		return fmt.Errorf("encode Gemini OAuth request: %w", err)
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = nil
	for key := range request.Header {
		request.Header.Del(key)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Del("Content-Length")
	return nil
}

func (*Transformer) TransformResponse(response *http.Response, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if response == nil || response.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Gemini OAuth response state is incomplete")
	}
	countTokens, err := optionBool(plan, "count_tokens")
	if err != nil {
		return err
	}
	if countTokens && response.StatusCode >= 400 {
		body, readErr := readBounded(response.Body, maxBodyBytes, "Gemini countTokens error")
		if readErr != nil {
			return readErr
		}
		if insufficientScope(response.Header, body) {
			estimate, _ := strconv.Atoi(string(state.ProtocolData(countEstimateKey)))
			body, _ = json.Marshal(map[string]int{"totalTokens": estimate})
			response.StatusCode = http.StatusOK
			response.Status = "200 OK"
			response.Header.Set("Content-Type", "application/json")
			installBody(response, body)
			return nil
		}
		body = unwrapResponse(body)
		installBody(response, body)
		return nil
	}

	aggregate, err := optionBool(plan, "aggregate_stream")
	if err != nil {
		return err
	}
	upstreamStream, err := optionBool(plan, "upstream_stream")
	if err != nil {
		return err
	}
	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if aggregate && response.StatusCode >= 200 && response.StatusCode < 300 {
		body, err := aggregateSSE(response.Body)
		if err != nil {
			return fmt.Errorf("aggregate Gemini Code Assist stream: %w", err)
		}
		response.Header.Set("Content-Type", "application/json")
		installBody(response, body)
		return nil
	}
	if (upstreamStream || strings.Contains(contentType, "text/event-stream")) && response.StatusCode >= 200 && response.StatusCode < 300 {
		response.Body = transformSSE(response.Body)
		response.ContentLength = -1
		response.Header.Set("Content-Type", "text/event-stream")
		response.Header.Del("Content-Length")
		return nil
	}
	body, err := readBounded(response.Body, maxBodyBytes, "Gemini OAuth response")
	if err != nil {
		return err
	}
	body = unwrapResponse(body)
	installBody(response, body)
	return nil
}

func optionBool(plan *controlv1.ExecutionPlan, key string) (bool, error) {
	value, err := strconv.ParseBool(strings.TrimSpace(plan.GetProtocolOptions()[key]))
	if err != nil {
		return false, fmt.Errorf("invalid Gemini OAuth %s option", key)
	}
	return value, nil
}

func readBounded(body io.ReadCloser, limit int64, label string) ([]byte, error) {
	defer body.Close()
	payload, err := io.ReadAll(io.LimitReader(body, limit+1))
	if err != nil {
		return nil, fmt.Errorf("read %s body: %w", label, err)
	}
	if int64(len(payload)) > limit {
		return nil, fmt.Errorf("%s body exceeds %d bytes", label, limit)
	}
	return payload, nil
}

func installBody(response *http.Response, body []byte) {
	response.Body = io.NopCloser(bytes.NewReader(body))
	response.ContentLength = int64(len(body))
	response.Header.Set("Content-Length", strconv.Itoa(len(body)))
}

type requestError struct{ err error }

func clientError(err error) error        { return requestError{err: err} }
func (e requestError) Error() string     { return e.err.Error() }
func (e requestError) Unwrap() error     { return e.err }
func (e requestError) HTTPStatus() int   { return http.StatusBadRequest }
func (e requestError) ErrorCode() string { return "invalid_gemini_request" }

var _ caddy.Module = (*Transformer)(nil)
