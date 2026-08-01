// Package bedrock implements the Anthropic Messages contract over AWS Bedrock
// InvokeModel and InvokeModelWithResponseStream.
package bedrock

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	gatewayruntime "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
)

const (
	maxRequestBodyBytes         int64 = 64 << 20
	defaultCCMaxTokens                = 81920
	defaultThinkingBudgetTokens       = 10000
)

var invalidToolUseID = regexp.MustCompile(`[^a-zA-Z0-9_-]`)

func init() { caddy.RegisterModule(Transformer{}) }

type bedrockSigningRuntime interface {
	SignBedrockRequest(context.Context, *controlv1.SignBedrockRequestRequest) (*controlv1.SignBedrockRequestResponse, error)
}

type Transformer struct{ signer bedrockSigningRuntime }

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.bedrock", New: func() caddy.Module { return new(Transformer) }}
}

func (t *Transformer) Provision(ctx caddy.Context) error {
	app, err := ctx.App("sup2api")
	if err != nil {
		return fmt.Errorf("load sup2api app: %w", err)
	}
	provider, ok := app.(interface {
		GatewayRuntime() *gatewayruntime.Runtime
	})
	if !ok || provider.GatewayRuntime() == nil {
		return fmt.Errorf("sup2api app does not expose a gateway runtime")
	}
	t.signer = provider.GatewayRuntime()
	return nil
}

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) HandlesModelRewrite() bool { return true }

func (t *Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || request.Body == nil || plan == nil {
		return fmt.Errorf("Bedrock request state is incomplete")
	}
	for key := range request.Header {
		request.Header.Del(key)
	}
	payload, err := readBoundedBody(request.Body)
	if err != nil {
		return err
	}
	transformed, err := transformRequestBody(payload, plan)
	if err != nil {
		return err
	}
	request.Body = io.NopCloser(bytes.NewReader(transformed))
	request.ContentLength = int64(len(transformed))
	request.GetBody = nil
	request.Header.Set("Content-Type", "application/json")

	if strings.TrimSpace(plan.GetProtocolOptions()["auth_mode"]) == "sigv4" {
		if state == nil || state.Admission == nil || state.Admission.GetLease() == nil {
			return fmt.Errorf("Bedrock signing lease is unavailable")
		}
		if t.signer == nil {
			return fmt.Errorf("Bedrock signing runtime is unavailable")
		}
		response, signErr := t.signer.SignBedrockRequest(request.Context(), &controlv1.SignBedrockRequestRequest{
			RequestId: state.RequestID, LeaseId: state.Admission.GetLease().GetLeaseId(),
			Method: plan.GetUpstreamMethod(), UpstreamUrl: plan.GetUpstreamUrl(),
			PayloadSha256: fmt.Sprintf("%x", sha256Sum(transformed)),
			Headers:       map[string]string{"Content-Type": "application/json", "Accept": plan.GetUpstreamHeaders()["Accept"]},
		})
		if signErr != nil {
			return fmt.Errorf("request Bedrock SigV4 signature: %w", signErr)
		}
		if response == nil || response.GetDecision() != controlv1.Decision_DECISION_ALLOW || len(response.GetSignedHeaders()) == 0 {
			if response != nil && response.GetDenial() != nil {
				denial := response.GetDenial()
				return &SigningError{Status: int(denial.GetHttpStatus()), Code: denial.GetErrorCode(), Message: denial.GetMessage()}
			}
			return fmt.Errorf("control plane denied Bedrock SigV4 signing")
		}
		if plan.UpstreamHeaders == nil {
			plan.UpstreamHeaders = make(map[string]string)
		}
		for key, value := range response.GetSignedHeaders() {
			plan.UpstreamHeaders[key] = value
		}
		if plan.GetUpstreamHeaders()["Authorization"] == "" {
			return fmt.Errorf("control plane returned an incomplete Bedrock signature")
		}
	}
	return nil
}

func (*Transformer) TransformResponse(response *http.Response, _ *controlv1.ExecutionPlan, _ *requeststate.State) error {
	if response == nil || response.Body == nil {
		return nil
	}
	if requestID := strings.TrimSpace(response.Header.Get("x-amzn-requestid")); requestID != "" {
		response.Header.Set("x-request-id", requestID)
	}
	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if strings.Contains(contentType, "application/vnd.amazon.eventstream") {
		response.Body = translateEventStream(response.Body)
		response.ContentLength = -1
		response.Header.Del("Content-Length")
		response.Header.Set("Content-Type", "text/event-stream")
		response.Header.Set("Cache-Control", "no-cache")
		response.Header.Set("X-Accel-Buffering", "no")
		return nil
	}
	payload, err := io.ReadAll(io.LimitReader(response.Body, maxRequestBodyBytes+1))
	_ = response.Body.Close()
	if err != nil {
		return fmt.Errorf("read Bedrock response: %w", err)
	}
	if int64(len(payload)) > maxRequestBodyBytes {
		return fmt.Errorf("Bedrock response exceeds %d bytes", maxRequestBodyBytes)
	}
	payload = transformInvocationMetrics(payload)
	response.Body = io.NopCloser(bytes.NewReader(payload))
	response.ContentLength = int64(len(payload))
	response.Header.Set("Content-Length", strconv.Itoa(len(payload)))
	return nil
}

func readBoundedBody(body io.ReadCloser) ([]byte, error) {
	defer body.Close()
	payload, err := io.ReadAll(io.LimitReader(body, maxRequestBodyBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read Bedrock body: %w", err)
	}
	if int64(len(payload)) > maxRequestBodyBytes {
		return nil, fmt.Errorf("Bedrock body exceeds %d bytes", maxRequestBodyBytes)
	}
	return payload, nil
}

func transformRequestBody(payload []byte, plan *controlv1.ExecutionPlan) ([]byte, error) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	decoder.UseNumber()
	var body map[string]any
	if err := decoder.Decode(&body); err != nil || body == nil {
		return nil, fmt.Errorf("Bedrock body must be a JSON object: %w", err)
	}
	if err := ensureEOF(decoder); err != nil {
		return nil, err
	}
	modelID := strings.TrimSpace(plan.GetMappedModel())
	if modelID == "" {
		return nil, fmt.Errorf("Bedrock model is missing")
	}

	betas, err := resolveBetaTokens(body, plan)
	if err != nil {
		return nil, err
	}
	body["anthropic_version"] = "bedrock-2023-05-31"
	if len(betas) > 0 {
		values := make([]any, len(betas))
		for index, token := range betas {
			values[index] = token
		}
		body["anthropic_beta"] = values
	} else {
		delete(body, "anthropic_beta")
	}
	if !containsString(betas, "context-management-2025-06-27") {
		delete(body, "context_management")
	}

	convertOutputFormat(body)
	for _, key := range []string{"provider", "metadata", "model", "stream", "output_config", "output_format"} {
		delete(body, key)
	}
	removeToolCustomFields(body)
	sanitizeCacheControl(body, modelID)
	ccCompat, _ := strconv.ParseBool(plan.GetProtocolOptions()["cc_compat"])
	if ccCompat {
		delete(body, "service_tier")
		delete(body, "interface_geo")
		delete(body, "context_management")
		if body["max_tokens"] == nil {
			body["max_tokens"] = json.Number(strconv.Itoa(defaultCCMaxTokens))
		}
		sanitizeThinking(body, modelID)
		sanitizeToolUseIDs(body)
	}

	var output bytes.Buffer
	encoder := json.NewEncoder(&output)
	encoder.SetEscapeHTML(false)
	if err := encoder.Encode(body); err != nil {
		return nil, fmt.Errorf("encode Bedrock body: %w", err)
	}
	return bytes.TrimSuffix(output.Bytes(), []byte{'\n'}), nil
}

func resolveBetaTokens(body map[string]any, plan *controlv1.ExecutionPlan) ([]string, error) {
	initial := splitTokens(plan.GetProtocolOptions()["initial_beta_tokens"])
	allowed := stringSet(splitTokens(plan.GetProtocolOptions()["allowed_auto_betas"]))
	blocked := make(map[string]string)
	if raw := strings.TrimSpace(plan.GetProtocolOptions()["blocked_auto_betas"]); raw != "" {
		if err := json.Unmarshal([]byte(raw), &blocked); err != nil {
			return nil, fmt.Errorf("invalid Bedrock beta policy snapshot")
		}
	}
	auto := deriveAutoBetaTokens(body, plan.GetMappedModel())
	result := append([]string(nil), initial...)
	seen := stringSet(result)
	for _, token := range auto {
		if message, denied := blocked[token]; denied {
			if strings.TrimSpace(message) == "" {
				message = "beta feature " + token + " is not allowed"
			}
			return nil, &PolicyError{Message: message}
		}
		if _, ok := allowed[token]; !ok {
			continue
		}
		if _, exists := seen[token]; !exists {
			result = append(result, token)
			seen[token] = struct{}{}
		}
	}
	if _, hasSearch := seen["tool-search-tool-2025-10-19"]; hasSearch {
		if _, exists := seen["tool-examples-2025-10-29"]; !exists {
			if _, ok := allowed["tool-examples-2025-10-29"]; ok {
				result = append(result, "tool-examples-2025-10-29")
			}
		}
	}
	return result, nil
}

func deriveAutoBetaTokens(body map[string]any, modelID string) []string {
	tools, _ := body["tools"].([]any)
	seen := make(map[string]struct{})
	add := func(token string) { seen[token] = struct{}{} }
	for _, raw := range tools {
		tool, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		toolType := stringValue(tool["type"])
		if strings.HasPrefix(toolType, "computer_20") {
			add("computer-use-2025-11-24")
		}
		advanced := containsNestedString(tool, "allowed_callers", "code_execution_20250825") ||
			containsNestedString(tool, "function.allowed_callers", "code_execution_20250825") ||
			hasNestedArray(tool, "input_examples") || hasNestedArray(tool, "function.input_examples")
		search := toolType == "tool_search_tool_regex_20251119" || toolType == "tool_search_tool_bm25_20251119"
		if advanced || (search && modelSupportsToolSearch(modelID)) {
			add("tool-search-tool-2025-10-19")
			add("tool-examples-2025-10-29")
		}
	}
	result := make([]string, 0, len(seen))
	for _, candidate := range []string{"computer-use-2025-11-24", "tool-search-tool-2025-10-19", "tool-examples-2025-10-29"} {
		if _, ok := seen[candidate]; ok {
			result = append(result, candidate)
		}
	}
	return result
}

func ensureEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == io.EOF {
		return nil
	} else if err != nil {
		return fmt.Errorf("read trailing Bedrock body: %w", err)
	}
	return fmt.Errorf("Bedrock body contains trailing JSON data")
}

// PolicyError reports a body-derived beta capability denied by the
// authoritative control-plane snapshot.
type PolicyError struct{ Message string }

func (e *PolicyError) Error() string   { return e.Message }
func (*PolicyError) HTTPStatus() int   { return http.StatusForbidden }
func (*PolicyError) ErrorCode() string { return "BETA_FEATURE_BLOCKED" }

type SigningError struct {
	Status  int
	Code    string
	Message string
}

func (e *SigningError) Error() string {
	if strings.TrimSpace(e.Message) == "" {
		return "Bedrock signing was denied"
	}
	return e.Message
}

func (e *SigningError) HTTPStatus() int {
	if e.Status >= 400 && e.Status <= 599 {
		return e.Status
	}
	return http.StatusServiceUnavailable
}

func (e *SigningError) ErrorCode() string { return e.Code }

var (
	_ caddy.Module      = (*Transformer)(nil)
	_ caddy.Provisioner = (*Transformer)(nil)
)
