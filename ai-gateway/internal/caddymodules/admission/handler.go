package admission

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

const metadataReadLimit = 256 << 10

func init() {
	caddy.RegisterModule(Handler{})
}

type openRequestRuntime interface {
	OpenRequest(context.Context, *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error)
}

// Handler performs billing admission, concurrency acquisition, and account
// scheduling using the short-lived AuthGrant established by sup2api_auth.
type Handler struct {
	runtime openRequestRuntime
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_admission",
		New: func() caddy.Module { return new(Handler) },
	}
}

func (h *Handler) Provision(ctx caddy.Context) error {
	app, err := ctx.App("sup2api")
	if err != nil {
		return fmt.Errorf("load sup2api app: %w", err)
	}
	provider, ok := app.(interface{ GatewayRuntime() *runtime.Runtime })
	if !ok || provider.GatewayRuntime() == nil {
		return fmt.Errorf("sup2api app does not expose a gateway runtime")
	}
	h.runtime = provider.GatewayRuntime()
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	protocol := httpapi.ProtocolForRequest(r)
	if h.runtime == nil {
		httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "Gateway control plane is unavailable", 0)
		return nil
	}

	state, ok := requeststate.FromContext(r.Context())
	if !ok || state.RequestID == "" || state.Auth == nil {
		httpapi.WriteError(w, protocol, http.StatusInternalServerError, "INVALID_PIPELINE_STATE", "Gateway authentication state is unavailable", 0)
		return nil
	}
	metadata := readRequestMetadata(r)
	requestID := state.RequestID
	response, err := h.runtime.OpenRequest(r.Context(), &controlv1.OpenRequestRequest{
		RequestId:                   requestID,
		ClientIp:                    state.ClientIP,
		UserAgent:                   r.UserAgent(),
		Method:                      r.Method,
		Path:                        r.URL.RequestURI(),
		Protocol:                    protocol,
		RequestedModel:              metadata.Model,
		Stream:                      metadata.Stream,
		AuthGrantToken:              state.Auth.GrantToken,
		ApiKeyId:                    state.Auth.APIKeyID,
		UserId:                      state.Auth.UserID,
		GroupId:                     state.Auth.GroupID,
		MaxOutputTokens:             metadata.MaxOutputTokens,
		RequestContentLength:        r.ContentLength,
		AnthropicBeta:               strings.TrimSpace(r.Header.Get("anthropic-beta")),
		AnthropicMetadataUserId:     metadata.AnthropicMetadataUserID,
		AnthropicBillingAttribution: metadata.AnthropicBillingAttribution,
	})
	if err != nil {
		if errors.Is(err, runtime.ErrBillingWALUnavailable) {
			httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "BILLING_DATA_PLANE_UNAVAILABLE", "Gateway billing persistence is unavailable", 0)
			return nil
		}
		status := http.StatusServiceUnavailable
		if errors.Is(err, context.DeadlineExceeded) {
			status = http.StatusGatewayTimeout
		}
		httpapi.WriteError(w, protocol, status, "CONTROL_PLANE_UNAVAILABLE", "Gateway control plane is unavailable", 0)
		return nil
	}
	if response == nil || response.GetDecision() != controlv1.Decision_DECISION_ALLOW {
		denial := response.GetDenial()
		if denial == nil {
			httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "INVALID_ADMISSION_RESPONSE", "Gateway admission failed", 0)
			return nil
		}
		status := int(denial.GetHttpStatus())
		if status < 400 || status > 599 {
			status = http.StatusForbidden
		}
		httpapi.WriteError(w, protocol, status, denial.GetErrorCode(), denial.GetMessage(), int(denial.GetRetryAfterSeconds()))
		return nil
	}
	if err := validateAdmissionResponse(response, time.Now()); err != nil {
		httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "INVALID_ADMISSION_RESPONSE", "Gateway admission returned an invalid execution lease", 0)
		return nil
	}

	state.RequestedModel = metadata.Model
	state.ModelValueStart = metadata.ModelValueStart
	state.ModelValueEnd = metadata.ModelValueEnd
	state.ModelInPath = metadata.ModelInPath
	state.Stream = metadata.Stream
	state.SetUsageRecordMetadata(metadata.ServiceTier, metadata.ReasoningEffort)
	state.Admission = response
	return next.ServeHTTP(w, r)
}

// readRequestMetadata reads only enough of the body to discover top-level
// model and stream fields, then reconstructs the body without changing its
// externally visible length. It never buffers the complete AI request.
type requestMetadata struct {
	Model                       string
	Stream                      bool
	MaxOutputTokens             int64
	ModelValueStart             int64
	ModelValueEnd               int64
	ModelInPath                 bool
	AnthropicMetadataUserID     string
	AnthropicBillingAttribution bool
	ServiceTier                 string
	ReasoningEffort             string
}

func readRequestMetadata(r *http.Request) requestMetadata {
	if r.Body == nil || r.Method == http.MethodGet || r.Method == http.MethodHead {
		model := modelFromPath(r.URL.Path)
		return requestMetadata{Model: model, ModelInPath: model != ""}
	}

	var captured bytes.Buffer
	limited := io.LimitReader(r.Body, metadataReadLimit)
	decoder := json.NewDecoder(io.TeeReader(limited, &captured))
	metadata := decodeTopLevelMetadata(decoder)
	metadata.ModelValueStart, metadata.ModelValueEnd = topLevelModelValueRange(captured.Bytes())
	r.Body = io.NopCloser(io.MultiReader(bytes.NewReader(captured.Bytes()), r.Body))
	if metadata.Model == "" {
		metadata.Model = modelFromPath(r.URL.Path)
		metadata.ModelInPath = metadata.Model != ""
	}
	return metadata
}

func topLevelModelValueRange(payload []byte) (int64, int64) {
	decoder := json.NewDecoder(bytes.NewReader(payload))
	token, err := decoder.Token()
	if err != nil || token != json.Delim('{') {
		return 0, 0
	}
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return 0, 0
		}
		key, _ := keyToken.(string)
		before := decoder.InputOffset()
		var raw json.RawMessage
		if err := decoder.Decode(&raw); err != nil {
			return 0, 0
		}
		if key != "model" {
			continue
		}
		start := before
		for start < int64(len(payload)) {
			switch payload[start] {
			case ' ', '\t', '\r', '\n', ':':
				start++
			default:
				if len(raw) < 2 || raw[0] != '"' {
					return 0, 0
				}
				return start, decoder.InputOffset()
			}
		}
	}
	return 0, 0
}

func decodeTopLevelMetadata(decoder *json.Decoder) requestMetadata {
	decoder.UseNumber()
	token, err := decoder.Token()
	if err != nil || token != json.Delim('{') {
		return requestMetadata{}
	}
	var metadata requestMetadata
	nestedReasoningEffort := false
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return metadata
		}
		key, _ := keyToken.(string)
		switch key {
		case "model":
			_ = decoder.Decode(&metadata.Model)
		case "stream":
			_ = decoder.Decode(&metadata.Stream)
		case "service_tier":
			_ = decoder.Decode(&metadata.ServiceTier)
		case "reasoning_effort", "reasoningEffort":
			var effort string
			if err := decoder.Decode(&effort); err == nil && !nestedReasoningEffort {
				metadata.ReasoningEffort = effort
			}
		case "reasoning":
			var value struct {
				Effort string `json:"effort"`
			}
			if err := decoder.Decode(&value); err == nil && strings.TrimSpace(value.Effort) != "" {
				metadata.ReasoningEffort = value.Effort
				nestedReasoningEffort = true
			}
		case "max_tokens", "max_output_tokens", "max_completion_tokens":
			var number json.Number
			if err := decoder.Decode(&number); err == nil {
				if value, parseErr := strconv.ParseInt(number.String(), 10, 64); parseErr == nil && value > metadata.MaxOutputTokens {
					metadata.MaxOutputTokens = value
				}
			}
		case "metadata":
			var value struct {
				UserID string `json:"user_id"`
			}
			if err := decoder.Decode(&value); err == nil {
				metadata.AnthropicMetadataUserID = strings.TrimSpace(value.UserID)
			}
		case "system":
			var raw json.RawMessage
			if err := decoder.Decode(&raw); err == nil {
				metadata.AnthropicBillingAttribution = hasAnthropicBillingAttribution(raw)
			}
		default:
			var discard json.RawMessage
			if err := decoder.Decode(&discard); err != nil {
				return metadata
			}
		}
	}
	return metadata
}

func hasAnthropicBillingAttribution(raw json.RawMessage) bool {
	var blocks []struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(raw, &blocks); err != nil {
		return false
	}
	for _, block := range blocks {
		text := strings.TrimSpace(block.Text)
		if strings.HasPrefix(text, "x-anthropic-billing-header") && strings.Contains(text, "cc_entrypoint=") {
			return true
		}
	}
	return false
}

func modelFromPath(path string) string {
	const prefix = "/v1beta/models/"
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	model := strings.TrimPrefix(path, prefix)
	if before, _, ok := strings.Cut(model, ":"); ok {
		model = before
	}
	return strings.TrimSpace(model)
}

func validateAdmissionResponse(response *controlv1.OpenRequestResponse, now time.Time) error {
	lease := response.GetLease()
	plan := response.GetPlan()
	if lease == nil || plan == nil || lease.GetLeaseId() == "" || lease.GetAccountId() <= 0 || plan.GetUpstreamUrl() == "" {
		return fmt.Errorf("missing lease or execution plan fields")
	}
	if lease.GetExpiresAtUnixMs() <= now.UnixMilli() {
		return fmt.Errorf("lease is already expired")
	}
	if lease.GetReservedAmountMicrousd() < 0 {
		return fmt.Errorf("negative billing reservation")
	}
	if lease.GetReservedAmountMicrousd() > 0 && lease.GetBillingReservationId() == "" {
		return fmt.Errorf("billing reservation ID is missing")
	}
	return nil
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
