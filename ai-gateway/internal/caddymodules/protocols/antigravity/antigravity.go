// Package antigravity implements the Sup2API Caddy data-plane adapter for
// Antigravity OAuth accounts.
package antigravity

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
	"github.com/google/uuid"
)

const maxBodyBytes int64 = 64 << 20

func init() { caddy.RegisterModule(Transformer{}) }

type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.antigravity", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }
func (*Transformer) HandlesModelRewrite() bool  { return true }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Antigravity request state is incomplete")
	}
	mode := strings.TrimSpace(plan.GetProtocolOptions()["mode"])
	if mode == "claude" {
		return transformClaudeRequest(request, plan, state)
	}
	if mode != "native_gemini" {
		return fmt.Errorf("unsupported Antigravity protocol mode")
	}
	action := strings.TrimSpace(plan.GetProtocolOptions()["action"])
	if action != "generateContent" && action != "streamGenerateContent" && action != "countTokens" {
		return fmt.Errorf("invalid Antigravity action")
	}
	payload, err := readBounded(request.Body, maxBodyBytes, "Antigravity request")
	if err != nil {
		return clientError(err)
	}
	root, err := decodeObject(payload)
	if err != nil {
		return clientError(err)
	}
	stripClientRoutingFields(root)
	filterEmptyContents(root)
	if err := cleanToolSchemas(root); err != nil {
		return clientError(err)
	}
	ensureFunctionCallThoughtSignatures(root)
	injectIdentity(root)
	projectID := strings.TrimSpace(plan.GetProtocolOptions()["project_id"])
	model := strings.TrimSpace(plan.GetMappedModel())
	if projectID == "" || model == "" {
		return fmt.Errorf("Antigravity execution plan is incomplete")
	}
	wrapped := map[string]any{
		"project": projectID, "requestId": "agent-" + uuid.NewString(),
		"userAgent": "antigravity", "requestType": "agent",
		"model": model, "request": root,
	}
	transformed, err := marshalJSON(wrapped)
	if err != nil {
		return fmt.Errorf("encode Antigravity request: %w", err)
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = func() (io.ReadCloser, error) {
		return io.NopCloser(bytes.NewReader(transformed)), nil
	}
	for key := range request.Header {
		request.Header.Del(key)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Del("Content-Length")
	return nil
}

func (*Transformer) TransformResponse(response *http.Response, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if response == nil || response.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Antigravity response state is incomplete")
	}
	if strings.TrimSpace(plan.GetProtocolOptions()["mode"]) == "claude" {
		return transformClaudeResponse(response, plan, state)
	}
	countTokens, err := optionBool(plan, "count_tokens")
	if err != nil {
		return err
	}
	if countTokens {
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
	if aggregate && response.StatusCode >= 200 && response.StatusCode < 300 {
		body, aggregateErr := aggregateSSE(response.Body)
		if aggregateErr != nil {
			return fmt.Errorf("aggregate Antigravity stream: %w", aggregateErr)
		}
		response.Header.Set("Content-Type", "application/json")
		installBody(response, body)
		return nil
	}
	if upstreamStream && response.StatusCode >= 200 && response.StatusCode < 300 {
		response.Body = transformSSE(response.Body)
		response.ContentLength = -1
		response.Header.Set("Content-Type", "text/event-stream")
		response.Header.Del("Content-Length")
		return nil
	}
	body, readErr := readBounded(response.Body, maxBodyBytes, "Antigravity response")
	if readErr != nil {
		return readErr
	}
	installBody(response, unwrapResponse(body))
	return nil
}

func optionBool(plan *controlv1.ExecutionPlan, key string) (bool, error) {
	value, err := strconv.ParseBool(strings.TrimSpace(plan.GetProtocolOptions()[key]))
	if err != nil {
		return false, fmt.Errorf("invalid Antigravity %s option", key)
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
func (e requestError) ErrorCode() string { return "invalid_antigravity_request" }

var _ caddy.Module = (*Transformer)(nil)
