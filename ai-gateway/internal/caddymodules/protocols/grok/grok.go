// Package grok implements xAI's OAuth Responses wire contract, including the
// Codex private-tool compatibility layer and OpenAI compact emulation.
package grok

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
	maxRequestBodyBytes  int64 = 64 << 20
	maxResponseBodyBytes int64 = 64 << 20
	mappingStateKey            = "grok.client_tool_mapping.v1"
)

func init() { caddy.RegisterModule(Transformer{}) }

type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.grok", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) HandlesModelRewrite() bool { return true }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil || state == nil || state.Auth == nil || state.Auth.APIKeyID <= 0 {
		return fmt.Errorf("Grok request state is incomplete")
	}
	compact, err := protocolBool(plan, "compact")
	if err != nil {
		return err
	}
	knownFree, err := protocolBool(plan, "known_free_account")
	if err != nil {
		return err
	}
	allowClientToolCache, err := protocolBool(plan, "allow_client_tool_cache")
	if err != nil {
		return err
	}
	mappedModel := strings.TrimSpace(plan.GetMappedModel())
	if mappedModel == "" {
		return fmt.Errorf("Grok mapped model is missing")
	}

	seeds := captureCacheSeedHeaders(request.Header)
	requestCachePolicy := strings.TrimSpace(request.Header.Get("X-Sup2API-Grok-Client-Tool-Cache"))
	if requestCachePolicy == "" {
		// Backward compatibility with clients released before the Sup2API rename.
		requestCachePolicy = strings.TrimSpace(request.Header.Get("X-Sub2API-Grok-Client-Tool-Cache"))
	}
	requestCachePolicy = strings.ToLower(requestCachePolicy)
	stripClientHeaders(request.Header)

	body, err := readBounded(request.Body, maxRequestBodyBytes, "Grok request")
	if err != nil {
		return clientRequestError("invalid_request_error", err)
	}
	root, err := decodeJSONObject(body)
	if err != nil {
		return clientRequestError("invalid_request_error", err)
	}
	rawIntent := cloneJSONObject(root)

	if err := promoteAdditionalTools(root); err != nil {
		return clientRequestError("invalid_tools", err)
	}
	mapping, err := adaptClientTools(root)
	if err != nil {
		return clientRequestError("invalid_tools", err)
	}
	if err := normalizeRequest(root, mappedModel); err != nil {
		return clientRequestError("invalid_request_error", err)
	}
	toolIntent := cloneJSONObject(root)
	if compact {
		if err := buildCompactRequest(root); err != nil {
			return clientRequestError("invalid_request_error", err)
		}
	} else {
		identity := resolveCacheIdentity(state.Auth.APIKeyID, mappedModel, seeds, root)
		applyCacheIdentity(root, identity)
		if identity != "" {
			request.Header.Set("X-Grok-Conv-Id", identity)
		}
		allowClientToolCache = applyRequestCachePolicy(allowClientToolCache, requestCachePolicy)
		applyFreeCacheRoute(root, rawIntent, toolIntent, identity, knownFree, allowClientToolCache)
	}
	stripBodySessionFields(root)

	transformed, err := marshalJSON(root)
	if err != nil {
		return fmt.Errorf("encode Grok request: %w", err)
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = func() (io.ReadCloser, error) {
		return io.NopCloser(bytes.NewReader(transformed)), nil
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json, text/event-stream")
	request.Header.Del("Content-Length")

	if mapping.active() {
		encoded, err := json.Marshal(mapping)
		if err != nil {
			return fmt.Errorf("encode Grok client-tool mapping: %w", err)
		}
		state.SetProtocolData(mappingStateKey, encoded)
	}
	return nil
}

func (*Transformer) TransformResponse(response *http.Response, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if response == nil || response.Body == nil || plan == nil || state == nil {
		return fmt.Errorf("Grok response state is incomplete")
	}
	compact, err := protocolBool(plan, "compact")
	if err != nil {
		return err
	}
	mapping, err := mappingFromState(state)
	if err != nil {
		return err
	}
	// Preserve provider error envelopes verbatim. Tool and compact rewrites are
	// response-success contracts; attempting to decode an HTML/text error here
	// would incorrectly replace the upstream status with a proxy 502.
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil
	}
	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if strings.Contains(contentType, "text/event-stream") {
		if compact {
			return fmt.Errorf("Grok compact upstream unexpectedly returned an event stream")
		}
		if mapping.active() {
			response.Body = transformSSEBody(response.Body, mapping)
			response.ContentLength = -1
			response.Header.Del("Content-Length")
		}
		return nil
	}
	if !compact && !mapping.active() {
		return nil
	}
	body, err := readBounded(response.Body, maxResponseBodyBytes, "Grok response")
	if err != nil {
		return err
	}
	if mapping.active() {
		body, err = restoreClientToolPayload(body, mapping)
		if err != nil {
			return fmt.Errorf("restore Grok client tools: %w", err)
		}
	}
	if compact && response.StatusCode >= 200 && response.StatusCode < 300 {
		body, err = convertCompactResponse(body)
		if err != nil {
			return fmt.Errorf("convert Grok compact response: %w", err)
		}
	}
	response.Body = io.NopCloser(bytes.NewReader(body))
	response.ContentLength = int64(len(body))
	response.Header.Set("Content-Length", strconv.Itoa(len(body)))
	return nil
}

func protocolBool(plan *controlv1.ExecutionPlan, key string) (bool, error) {
	raw := strings.TrimSpace(plan.GetProtocolOptions()[key])
	value, err := strconv.ParseBool(raw)
	if err != nil {
		return false, fmt.Errorf("invalid Grok %s option", key)
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

func mappingFromState(state *requeststate.State) (clientToolMapping, error) {
	raw := state.ProtocolData(mappingStateKey)
	if len(raw) == 0 {
		return clientToolMapping{}, nil
	}
	var mapping clientToolMapping
	if err := json.Unmarshal(raw, &mapping); err != nil {
		return clientToolMapping{}, fmt.Errorf("decode Grok client-tool mapping: %w", err)
	}
	return mapping, nil
}

type requestTransformError struct {
	code string
	err  error
}

func clientRequestError(code string, err error) error {
	return requestTransformError{code: code, err: err}
}

func (e requestTransformError) Error() string     { return e.err.Error() }
func (e requestTransformError) Unwrap() error     { return e.err }
func (e requestTransformError) HTTPStatus() int   { return http.StatusBadRequest }
func (e requestTransformError) ErrorCode() string { return e.code }

var (
	_ caddy.Module = (*Transformer)(nil)
)
