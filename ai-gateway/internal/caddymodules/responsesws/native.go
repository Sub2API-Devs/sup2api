package responsesws

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/usageobserver"
	"github.com/coder/websocket"
	"google.golang.org/protobuf/proto"
)

func isNativeWebSocketPlan(plan *controlv1.ExecutionPlan) bool {
	if plan == nil {
		return false
	}
	target, err := url.Parse(plan.GetUpstreamUrl())
	if err != nil {
		return false
	}
	return strings.EqualFold(target.Scheme, "ws") || strings.EqualFold(target.Scheme, "wss")
}

func (h *Handler) executeNativeWebSocket(ctx context.Context, downstream *websocket.Conn, state *requeststate.State, sessionID string, progress *turnProgress, frame []byte) error {
	plan := state.Admission.GetPlan()
	target, transportPlan, err := nativeTargets(plan)
	if err != nil {
		return err
	}
	profile := strings.TrimSpace(plan.GetProtocolProfile())
	if profile == "" {
		profile = "passthrough"
	}
	// Native WebSocket responses cannot safely reuse HTTP-only response
	// transformers. Add profiles here only after their frame contract has a
	// provider-specific test suite.
	if profile != "passthrough" && profile != "openai_codex" {
		return fmt.Errorf("protocol %q does not support native Responses WebSocket", profile)
	}
	transformer := h.protocols[profile]
	if transformer == nil {
		return fmt.Errorf("unknown native WebSocket protocol %q", profile)
	}
	upstreamFrame, headers, err := prepareNativeRequest(frame, target, plan, state, transformer)
	if err != nil {
		return err
	}
	transportProfile := strings.TrimSpace(plan.GetTransportProfile())
	if transportProfile == "" {
		transportProfile = "standard"
	}
	factory := h.transports[transportProfile]
	if factory == nil {
		return fmt.Errorf("unknown native WebSocket transport %q", transportProfile)
	}
	transport, err := factory.Transport(transportPlan)
	if err != nil {
		return err
	}
	client := &http.Client{
		Transport: transport,
		CheckRedirect: func(*http.Request, []*http.Request) error {
			return fmt.Errorf("native WebSocket redirects are not allowed")
		},
	}
	key, scope, err := nativeConnectionKey(plan, headers, state, sessionID)
	if err != nil {
		return err
	}
	dial := func(dialCtx context.Context) (*websocket.Conn, error) {
		connection, response, dialErr := websocket.Dial(dialCtx, target.String(), &websocket.DialOptions{HTTPClient: client, HTTPHeader: headers})
		if response != nil && response.Body != nil {
			_ = response.Body.Close()
		}
		if dialErr != nil {
			return nil, fmt.Errorf("dial native upstream WebSocket: %w", dialErr)
		}
		connection.SetReadLimit(maxFrameBytes)
		return connection, nil
	}

	lease, err := h.nativePool.acquire(ctx, key, sessionID, scope, dial)
	if err != nil {
		return err
	}
	if lease.reused {
		pingCtx, cancelPing := context.WithTimeout(ctx, 3*time.Second)
		stale := lease.hasPendingFrame()
		if !stale {
			stale = lease.connection.Ping(pingCtx) != nil
		}
		cancelPing()
		if !stale {
			stale = lease.hasPendingFrame()
		}
		if stale {
			lease.release(false)
			lease, err = h.nativePool.acquire(ctx, key, sessionID, scope, dial)
			if err != nil {
				return err
			}
		}
	}
	keep := false
	defer func() { lease.release(keep) }()
	state.MarkUpstreamStarted()
	if err := lease.connection.Write(ctx, websocket.MessageText, upstreamFrame); err != nil {
		state.SetStatus(http.StatusBadGateway)
		state.SetError("upstream_websocket_write_error")
		return err
	}

	var observedUsage requeststate.Usage
	for {
		var upstreamFrame nativeWSFrame
		select {
		case received, ok := <-lease.frames:
			if !ok {
				upstreamFrame.err = fmt.Errorf("native upstream WebSocket closed")
			} else {
				upstreamFrame = received
			}
		case <-ctx.Done():
			upstreamFrame.err = ctx.Err()
		}
		if upstreamFrame.err != nil {
			state.SetUsage(observedUsage)
			if ctx.Err() != nil {
				if !errors.Is(context.Cause(ctx), requeststate.ErrLeaseRevoked) {
					state.SetError("client_cancelled")
				}
				return ctx.Err()
			}
			state.SetStatus(http.StatusBadGateway)
			state.SetError("upstream_websocket_read_error")
			return upstreamFrame.err
		}
		if upstreamFrame.messageType != websocket.MessageText {
			state.SetError("upstream_websocket_binary_frame")
			return fmt.Errorf("native upstream WebSocket returned a binary frame")
		}
		payload := upstreamFrame.payload
		frameObserver := usageobserver.New("application/json")
		frameObserver.Write(payload)
		mergeUsage(&observedUsage, frameObserver.Finalize())
		message := restoreModel(payload, plan.GetMappedModel(), state.RequestedModel)
		eventType, _ := responseEventMetadata(message)
		progress.observe(message)
		if eventType == "error" || eventType == "response.failed" || eventType == "response.incomplete" {
			state.SetError("upstream_websocket_" + strings.ReplaceAll(eventType, ".", "_"))
		}
		if err := downstream.Write(ctx, websocket.MessageText, message); err != nil {
			state.SetUsage(observedUsage)
			return err
		}
		state.ObserveWrite(http.StatusOK, len(message))
		if isTerminalResponseEvent(message) {
			state.SetUsage(observedUsage)
			keep = eventType != "error"
			return nil
		}
	}
}

func mergeUsage(target *requeststate.Usage, update requeststate.Usage) {
	if update.InputTokens > target.InputTokens {
		target.InputTokens = update.InputTokens
	}
	if update.OutputTokens > target.OutputTokens {
		target.OutputTokens = update.OutputTokens
	}
	if update.CacheReadTokens > target.CacheReadTokens {
		target.CacheReadTokens = update.CacheReadTokens
	}
	if update.CacheCreationTokens > target.CacheCreationTokens {
		target.CacheCreationTokens = update.CacheCreationTokens
	}
	if update.ReasoningTokens > target.ReasoningTokens {
		target.ReasoningTokens = update.ReasoningTokens
	}
}

func nativeTargets(plan *controlv1.ExecutionPlan) (*url.URL, *controlv1.ExecutionPlan, error) {
	if plan == nil {
		return nil, nil, fmt.Errorf("native WebSocket execution plan is missing")
	}
	target, err := url.Parse(plan.GetUpstreamUrl())
	if err != nil || target.Host == "" || target.User != nil || target.Fragment != "" {
		return nil, nil, fmt.Errorf("invalid native WebSocket upstream URL")
	}
	switch strings.ToLower(target.Scheme) {
	case "ws", "wss":
	default:
		return nil, nil, fmt.Errorf("native WebSocket upstream must use ws or wss")
	}
	if host := strings.TrimSpace(plan.GetUpstreamHost()); host != "" && !strings.EqualFold(host, target.Host) {
		return nil, nil, fmt.Errorf("native WebSocket upstream_host override is not supported")
	}
	transportPlan := proto.Clone(plan).(*controlv1.ExecutionPlan)
	transportURL := *target
	if strings.EqualFold(target.Scheme, "wss") {
		transportURL.Scheme = "https"
	} else {
		transportURL.Scheme = "http"
	}
	transportPlan.UpstreamUrl = transportURL.String()
	return target, transportPlan, nil
}

func prepareNativeRequest(frame []byte, target *url.URL, plan *controlv1.ExecutionPlan, state *requeststate.State, transformer interface {
	TransformRequest(*http.Request, *controlv1.ExecutionPlan, *requeststate.State) error
}) ([]byte, http.Header, error) {
	var envelope map[string]any
	decoder := json.NewDecoder(bytes.NewReader(frame))
	decoder.UseNumber()
	if err := decoder.Decode(&envelope); err != nil || envelope == nil {
		return nil, nil, fmt.Errorf("invalid native response.create payload")
	}
	envelope["type"] = "response.create"
	envelope["model"] = plan.GetMappedModel()
	mapped, err := json.Marshal(envelope)
	if err != nil {
		return nil, nil, err
	}
	httpTarget := *target
	if strings.EqualFold(target.Scheme, "wss") {
		httpTarget.Scheme = "https"
	} else {
		httpTarget.Scheme = "http"
	}
	request, err := http.NewRequest(http.MethodPost, httpTarget.String(), bytes.NewReader(mapped))
	if err != nil {
		return nil, nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	if err := transformer.TransformRequest(request, plan, state); err != nil {
		return nil, nil, err
	}
	transformed, err := io.ReadAll(io.LimitReader(request.Body, maxFrameBytes+1))
	if err != nil || int64(len(transformed)) > maxFrameBytes {
		return nil, nil, fmt.Errorf("native response.create payload exceeds limit")
	}
	if json.Unmarshal(transformed, &envelope) != nil || envelope == nil {
		return nil, nil, fmt.Errorf("native protocol produced an invalid response.create payload")
	}
	envelope["type"] = "response.create"
	transformed, err = json.Marshal(envelope)
	if err != nil {
		return nil, nil, err
	}
	stripCredentials(request.Header)
	for key, value := range plan.GetUpstreamHeaders() {
		if allowedPlanHeader(key) {
			request.Header.Set(key, value)
		}
	}
	request.Header.Del("Content-Length")
	return transformed, request.Header.Clone(), nil
}

func nativeConnectionKey(plan *controlv1.ExecutionPlan, headers http.Header, state *requeststate.State, sessionID string) ([sha256.Size]byte, string, error) {
	var zero [sha256.Size]byte
	if plan == nil || state == nil || state.Auth == nil || state.Admission == nil || state.Admission.GetLease() == nil || strings.TrimSpace(sessionID) == "" {
		return zero, "", fmt.Errorf("native WebSocket pool identity is incomplete")
	}
	hash := sha256.New()
	writeHashPart := func(value string) {
		var length [8]byte
		binary.BigEndian.PutUint64(length[:], uint64(len(value)))
		_, _ = hash.Write(length[:])
		_, _ = hash.Write([]byte(value))
	}
	writeHashPart(strconv.FormatInt(state.Admission.GetLease().GetAccountId(), 10))
	writeHashPart(sessionID)
	writeHashPart(state.Auth.CredentialDigest)
	writeHashPart(plan.GetUpstreamUrl())
	writeHashPart(plan.GetUpstreamHost())
	writeHashPart(plan.GetTransportProfile())
	writeHashPart(plan.GetProxyProfile())
	writeHashPart(plan.GetProxyUrl())
	writeHashPart(plan.GetProtocolProfile())
	keys := make([]string, 0, len(headers))
	for key := range headers {
		keys = append(keys, strings.ToLower(key))
	}
	sort.Strings(keys)
	for _, key := range keys {
		writeHashPart(key)
		values := append([]string(nil), headers.Values(key)...)
		sort.Strings(values)
		for _, value := range values {
			writeHashPart(value)
		}
	}
	optionKeys := make([]string, 0, len(plan.GetProtocolOptions()))
	for key := range plan.GetProtocolOptions() {
		optionKeys = append(optionKeys, key)
	}
	sort.Strings(optionKeys)
	for _, key := range optionKeys {
		writeHashPart(key)
		writeHashPart(plan.GetProtocolOptions()[key])
	}
	if fingerprint := plan.GetTlsFingerprint(); fingerprint != nil {
		encoded, err := proto.MarshalOptions{Deterministic: true}.Marshal(fingerprint)
		if err != nil {
			return zero, "", err
		}
		writeHashPart(string(encoded))
	}
	copy(zero[:], hash.Sum(nil))
	scope := sessionID + "/" + strconv.FormatInt(state.Admission.GetLease().GetAccountId(), 10)
	return zero, scope, nil
}

func responseEventMetadata(payload []byte) (eventType, responseID string) {
	var envelope struct {
		Type     string `json:"type"`
		Response struct {
			ID string `json:"id"`
		} `json:"response"`
	}
	if json.Unmarshal(payload, &envelope) != nil {
		return "", ""
	}
	return strings.TrimSpace(envelope.Type), strings.TrimSpace(envelope.Response.ID)
}
