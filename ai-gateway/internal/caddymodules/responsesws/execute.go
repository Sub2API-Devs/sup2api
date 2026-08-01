package responsesws

import (
	"bufio"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/leaselifecycle"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/usageobserver"
	"github.com/coder/websocket"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (h *Handler) executeTurn(ctx context.Context, connection *websocket.Conn, ingress *http.Request, connectionState *requeststate.State, grant *requeststate.AuthGrant, progress *turnProgress, turn int64, payload turnPayload) error {
	turnID := connectionState.RequestID + "-turn-" + uuid.NewString()
	digest := sha256.Sum256(payload.raw)
	response, err := h.runtime.OpenRequest(ctx, &controlv1.OpenRequestRequest{
		RequestId: turnID, ClientIp: connectionState.ClientIP, UserAgent: ingress.UserAgent(),
		Method: http.MethodPost, Path: normalizedResponsesPath(ingress.URL.Path), Protocol: controlv1.Protocol_PROTOCOL_OPENAI,
		RequestedModel: payload.model, Stream: true, SessionHash: connectionState.RequestID,
		BodyDigest: hex.EncodeToString(digest[:]), AuthGrantToken: grant.GrantToken,
		ApiKeyId: grant.APIKeyID, UserId: grant.UserID, GroupId: grant.GroupID,
		MaxOutputTokens: payload.maxOutputTokens, RequestContentLength: int64(len(payload.raw)),
	})
	if err != nil {
		return err
	}
	if response == nil || response.GetDecision() != controlv1.Decision_DECISION_ALLOW || response.GetLease() == nil || response.GetPlan() == nil {
		denial := response.GetDenial()
		code, message := "request_denied", "Responses turn was denied"
		if denial != nil {
			if denial.GetErrorCode() != "" {
				code = denial.GetErrorCode()
			}
			if denial.GetMessage() != "" {
				message = denial.GetMessage()
			}
		}
		return writeWSError(ctx, connection, code, message)
	}
	if validationErr := validateTurnAdmission(response, time.Now()); validationErr != nil {
		lease := response.GetLease()
		if lease != nil && lease.GetLeaseId() != "" {
			_ = h.runtime.AbortRequest(context.WithoutCancel(ctx), &controlv1.AbortRequestRequest{
				RequestId: turnID, LeaseId: lease.GetLeaseId(), Reason: "invalid_websocket_admission",
			})
		}
		return validationErr
	}
	turnState := &requeststate.State{
		RequestID: turnID, ClientIP: connectionState.ClientIP, RequestedModel: payload.model,
		Stream: true, Auth: grant.Clone(), Admission: response, StartedAt: time.Now(),
	}
	turnCtx, cancel := context.WithCancelCause(ctx)
	renewDone := make(chan struct{})
	go h.renewTurn(turnCtx, cancel, renewDone, turnState)
	if isNativeWebSocketPlan(response.GetPlan()) {
		err = h.executeNativeWebSocket(turnCtx, connection, turnState, connectionState.RequestID, progress, payload.raw)
	} else {
		err = h.executeHTTPBridge(turnCtx, connection, turnState, progress, payload.raw)
	}
	cancel(nil)
	<-renewDone
	h.finishTurn(ctx, turnState, err)
	_ = turn
	return err
}

func normalizedResponsesPath(path string) string {
	switch strings.TrimRight(path, "/") {
	case "/responses":
		return "/responses"
	case "/backend-api/codex/responses":
		return "/backend-api/codex/responses"
	default:
		return "/v1/responses"
	}
}

func validateTurnAdmission(response *controlv1.OpenRequestResponse, now time.Time) error {
	lease, plan := response.GetLease(), response.GetPlan()
	if lease == nil || plan == nil || lease.GetLeaseId() == "" || lease.GetAccountId() <= 0 || plan.GetUpstreamUrl() == "" {
		return fmt.Errorf("invalid Responses WebSocket admission")
	}
	if lease.GetExpiresAtUnixMs() <= now.UnixMilli() || lease.GetReservedAmountMicrousd() < 0 {
		return fmt.Errorf("invalid Responses WebSocket lease")
	}
	if lease.GetReservedAmountMicrousd() > 0 && lease.GetBillingReservationId() == "" {
		return fmt.Errorf("invalid Responses WebSocket billing reservation")
	}
	return nil
}

func (h *Handler) renewTurn(ctx context.Context, cancel context.CancelCauseFunc, done chan<- struct{}, state *requeststate.State) {
	defer close(done)
	interval := time.Duration(h.RenewInterval)
	if interval <= 0 {
		interval = 30 * time.Second
	}
	lease := state.Admission.GetLease()
	expiresAt := time.UnixMilli(lease.GetExpiresAtUnixMs())
	for {
		delay := leaselifecycle.RenewalDelay(interval, expiresAt, time.Now())
		timer := time.NewTimer(delay)
		select {
		case <-timer.C:
			if !time.Now().Before(expiresAt) {
				h.revokeTurnLease(state, cancel, "lease_expired")
				return
			}
			response, err := h.runtime.RenewLease(ctx, &controlv1.RenewLeaseRequest{RequestId: state.RequestID, LeaseId: lease.GetLeaseId()})
			if err != nil {
				if ctx.Err() == nil && h.logger != nil {
					h.logger.Warn("Responses WebSocket lease renewal failed", zap.String("request_id", state.RequestID), zap.Error(err))
				}
				if leaselifecycle.TerminalRPCError(err) {
					h.revokeTurnLease(state, cancel, "lease_renewal_rejected")
					return
				}
				continue
			}
			if response == nil || !response.GetRenewed() {
				h.revokeTurnLease(state, cancel, "lease_renewal_rejected")
				return
			}
			candidate := time.UnixMilli(response.GetExpiresAtUnixMs())
			if !candidate.After(time.Now()) {
				h.revokeTurnLease(state, cancel, "lease_renewal_invalid")
				return
			}
			expiresAt = candidate
		case <-ctx.Done():
			if !timer.Stop() {
				select {
				case <-timer.C:
				default:
				}
			}
			return
		}
	}
}

func (h *Handler) revokeTurnLease(state *requeststate.State, cancel context.CancelCauseFunc, code string) {
	state.SetError(code)
	if h.logger != nil {
		h.logger.Warn("Responses WebSocket lease is no longer valid", zap.String("request_id", state.RequestID), zap.String("reason", code))
	}
	cancel(requeststate.ErrLeaseRevoked)
}

func (h *Handler) finishTurn(ctx context.Context, state *requeststate.State, turnErr error) {
	lease := state.Admission.GetLease()
	if lease == nil {
		return
	}
	snapshot := state.Finish()
	if !snapshot.UpstreamStarted {
		_ = h.runtime.AbortRequest(context.WithoutCancel(ctx), &controlv1.AbortRequestRequest{RequestId: state.RequestID, LeaseId: lease.GetLeaseId(), Reason: "websocket_upstream_not_started"})
		return
	}
	plan := state.Admission.GetPlan()
	request := &controlv1.SettleRequestRequest{
		RequestId: state.RequestID, LeaseId: lease.GetLeaseId(), AccountId: lease.GetAccountId(),
		RequestedModel: state.RequestedModel, MappedModel: plan.GetMappedModel(), PricingVersion: lease.GetPricingVersion(),
		Usage: &controlv1.Usage{
			InputTokens: snapshot.Usage.InputTokens, OutputTokens: snapshot.Usage.OutputTokens,
			CacheReadTokens: snapshot.Usage.CacheReadTokens, CacheCreationTokens: snapshot.Usage.CacheCreationTokens,
			ReasoningTokens: snapshot.Usage.ReasoningTokens, ResponseBytes: snapshot.Usage.ResponseBytes,
		},
		Upstream:        &controlv1.UpstreamResult{StatusCode: int32(snapshot.StatusCode), ErrorCode: snapshot.ErrorCode, Attempts: snapshot.Attempts},
		StartedAtUnixMs: state.StartedAt.UnixMilli(), FinishedAtUnixMs: snapshot.FinishedAt.UnixMilli(), ClientCancelled: ctx.Err() != nil,
	}
	if !snapshot.FirstByteAt.IsZero() {
		request.FirstByteAtUnixMs = snapshot.FirstByteAt.UnixMilli()
	}
	if turnErr != nil && request.Upstream.ErrorCode == "" {
		request.Upstream.ErrorCode = "websocket_turn_failed"
	}
	_ = h.runtime.SubmitSettlement(request)
}

func (h *Handler) executeHTTPBridge(ctx context.Context, connection *websocket.Conn, state *requeststate.State, progress *turnProgress, frame []byte) error {
	plan := state.Admission.GetPlan()
	target, err := url.Parse(plan.GetUpstreamUrl())
	if err != nil || (target.Scheme != "http" && target.Scheme != "https") || target.Host == "" {
		return fmt.Errorf("invalid WebSocket bridge execution target")
	}
	body, err := bridgeRequest(frame, plan.GetMappedModel())
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, target.String(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	request.GetBody = func() (io.ReadCloser, error) { return io.NopCloser(bytes.NewReader(body)), nil }
	request.ContentLength = int64(len(body))
	profile := strings.TrimSpace(plan.GetTransportProfile())
	if profile == "" {
		profile = "standard"
	}
	factory := h.transports[profile]
	if factory == nil {
		return fmt.Errorf("unknown WebSocket bridge transport %q", profile)
	}
	transport, err := factory.Transport(plan)
	if err != nil {
		return err
	}
	protocolProfile := strings.TrimSpace(plan.GetProtocolProfile())
	if protocolProfile == "" {
		protocolProfile = "passthrough"
	}
	transformer := h.protocols[protocolProfile]
	if transformer == nil {
		return fmt.Errorf("unknown WebSocket bridge protocol %q", protocolProfile)
	}
	if err := transformer.TransformRequest(request, plan, state); err != nil {
		return err
	}
	if wrapper, ok := transformer.(protocoltransform.TransportWrapper); ok {
		transport, err = wrapper.WrapTransport(transport, plan, state)
		if err != nil {
			return err
		}
	}
	request.URL = target
	request.Host = target.Host
	if plan.GetUpstreamHost() != "" {
		request.Host = plan.GetUpstreamHost()
	}
	if plan.GetUpstreamMethod() != "" {
		request.Method = plan.GetUpstreamMethod()
	}
	stripCredentials(request.Header)
	for key, value := range plan.GetUpstreamHeaders() {
		if allowedPlanHeader(key) {
			request.Header.Set(key, value)
		}
	}
	request.Header.Set("X-Request-ID", state.RequestID)
	state.MarkUpstreamStarted()
	response, err := transport.RoundTrip(request)
	if err != nil {
		if !errors.Is(context.Cause(ctx), requeststate.ErrLeaseRevoked) {
			state.SetStatus(http.StatusBadGateway)
			state.SetErrorIfEmpty("upstream_transport_error")
		}
		return err
	}
	defer response.Body.Close()
	state.SetStatus(response.StatusCode)
	if err := transformer.TransformResponse(response, plan, state); err != nil {
		state.SetError("protocol_response_transform_failed")
		return err
	}
	observer := usageobserver.New(response.Header.Get("Content-Type"))
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		payload, readErr := io.ReadAll(io.LimitReader(response.Body, maxFrameBytes+1))
		if readErr != nil || int64(len(payload)) > maxFrameBytes {
			return fmt.Errorf("read WebSocket bridge error response")
		}
		observer.Write(payload)
		state.ObserveWrite(response.StatusCode, len(payload))
		state.SetUsage(observer.Finalize())
		state.SetError("upstream_http_" + fmt.Sprint(response.StatusCode))
		progress.observe(payload)
		progress.terminal.Store(true)
		return connection.Write(ctx, websocket.MessageText, payload)
	}
	err = relayResponse(ctx, connection, response, state, observer, progress, plan.GetMappedModel(), state.RequestedModel)
	state.SetUsage(observer.Finalize())
	return err
}

func bridgeRequest(frame []byte, mappedModel string) ([]byte, error) {
	var root map[string]any
	decoder := json.NewDecoder(bytes.NewReader(frame))
	decoder.UseNumber()
	if err := decoder.Decode(&root); err != nil || root == nil {
		return nil, fmt.Errorf("invalid response.create payload")
	}
	delete(root, "type")
	delete(root, "generate")
	root["stream"] = true
	root["model"] = mappedModel
	return json.Marshal(root)
}

func relayResponse(ctx context.Context, connection *websocket.Conn, response *http.Response, state *requeststate.State, observer *usageobserver.Observer, progress *turnProgress, mappedModel, requestedModel string) error {
	contentType := strings.ToLower(response.Header.Get("Content-Type"))
	if !strings.Contains(contentType, "text/event-stream") {
		payload, err := io.ReadAll(io.LimitReader(response.Body, maxFrameBytes+1))
		if err != nil || int64(len(payload)) > maxFrameBytes {
			return fmt.Errorf("WebSocket bridge response exceeds limit")
		}
		observer.Write(payload)
		payload = restoreModel(payload, mappedModel, requestedModel)
		progress.observe(payload)
		progress.terminal.Store(true)
		state.ObserveWrite(response.StatusCode, len(payload))
		return connection.Write(ctx, websocket.MessageText, payload)
	}
	scanner := bufio.NewScanner(response.Body)
	scanner.Buffer(make([]byte, 64<<10), maxSSELineBytes)
	for scanner.Scan() {
		line := strings.TrimRight(scanner.Text(), "\r")
		observer.Write([]byte(line + "\n"))
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" || payload == "[DONE]" {
			continue
		}
		message := restoreModel([]byte(payload), mappedModel, requestedModel)
		progress.observe(message)
		if err := connection.Write(ctx, websocket.MessageText, message); err != nil {
			return err
		}
		state.ObserveWrite(response.StatusCode, len(message))
	}
	return scanner.Err()
}

func isTerminalResponseEvent(payload []byte) bool {
	var envelope struct {
		Type string `json:"type"`
	}
	if json.Unmarshal(payload, &envelope) != nil {
		return false
	}
	switch strings.TrimSpace(envelope.Type) {
	case "response.completed", "response.done", "response.failed", "response.incomplete", "response.cancelled", "response.canceled", "error":
		return true
	default:
		return false
	}
}

func restoreModel(payload []byte, mappedModel, requestedModel string) []byte {
	if mappedModel == "" || requestedModel == "" || mappedModel == requestedModel {
		return payload
	}
	var root any
	if json.Unmarshal(payload, &root) != nil {
		return payload
	}
	replaceModelValue(root, mappedModel, requestedModel)
	rewritten, err := json.Marshal(root)
	if err != nil {
		return payload
	}
	return rewritten
}

func replaceModelValue(value any, mappedModel, requestedModel string) {
	switch current := value.(type) {
	case map[string]any:
		for key, child := range current {
			if key == "model" && child == mappedModel {
				current[key] = requestedModel
				continue
			}
			replaceModelValue(child, mappedModel, requestedModel)
		}
	case []any:
		for _, child := range current {
			replaceModelValue(child, mappedModel, requestedModel)
		}
	}
}

func stripCredentials(header http.Header) {
	for _, key := range []string{"Authorization", "Proxy-Authorization", "x-api-key", "x-goog-api-key", "Cookie"} {
		header.Del(key)
	}
}

func allowedPlanHeader(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "", "connection", "content-length", "host", "proxy-authorization", "transfer-encoding", "upgrade":
		return false
	default:
		return true
	}
}
