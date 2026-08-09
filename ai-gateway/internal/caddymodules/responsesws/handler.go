// Package responsesws implements Responses WebSocket v2 as a turn-scoped
// Caddy data-plane handler. Each response.create frame receives an independent
// control-plane admission lease and durable settlement.
package responsesws

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/upstreamtransport"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"github.com/coder/websocket"
	"go.uber.org/zap"
)

const (
	maxFrameBytes   int64 = 64 << 20
	maxSSELineBytes       = 16 << 20
)

type gatewayRuntime interface {
	OpenRequest(context.Context, *controlv1.OpenRequestRequest) (*controlv1.OpenRequestResponse, error)
	RenewLease(context.Context, *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error)
	AbortRequest(context.Context, *controlv1.AbortRequestRequest) error
	SubmitSettlement(*controlv1.SettleRequestRequest) error
	RenewAuthGrant(context.Context, string, *requeststate.AuthGrant) (*requeststate.AuthGrant, error)
}

func init() { caddy.RegisterModule(Handler{}) }

type Handler struct {
	TransportsRaw         caddy.ModuleMap `json:"transports,omitempty" caddy:"namespace=sup2api.transports"`
	ProtocolsRaw          caddy.ModuleMap `json:"protocols,omitempty" caddy:"namespace=sup2api.protocols"`
	RenewInterval         caddy.Duration  `json:"renew_interval,omitempty"`
	MaxUpstreamWebSockets int             `json:"max_upstream_websockets,omitempty"`
	UpstreamWSIdleTimeout caddy.Duration  `json:"upstream_ws_idle_timeout,omitempty"`

	runtime    gatewayRuntime
	transports map[string]upstreamtransport.Factory
	protocols  map[string]protocoltransform.Transformer
	nativePool *nativeWSPool
	logger     *zap.Logger
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "http.handlers.sup2api_responses_websocket", New: func() caddy.Module { return new(Handler) }}
}

func (h *Handler) Provision(ctx caddy.Context) error {
	if h.RenewInterval == 0 {
		h.RenewInterval = caddy.Duration(30 * time.Second)
	}
	if h.MaxUpstreamWebSockets == 0 {
		h.MaxUpstreamWebSockets = 512
	}
	if h.UpstreamWSIdleTimeout == 0 {
		h.UpstreamWSIdleTimeout = caddy.Duration(2 * time.Minute)
	}
	if h.MaxUpstreamWebSockets <= 0 || h.UpstreamWSIdleTimeout <= 0 {
		return fmt.Errorf("Responses WebSocket pool limits must be positive")
	}
	app, err := ctx.App("sup2api")
	if err != nil {
		return err
	}
	provider, ok := app.(interface{ GatewayRuntime() *runtime.Runtime })
	if !ok || provider.GatewayRuntime() == nil {
		return fmt.Errorf("sup2api app does not expose a gateway runtime")
	}
	h.runtime = provider.GatewayRuntime()
	h.logger = ctx.Logger()
	if err := h.loadModules(ctx); err != nil {
		return err
	}
	h.nativePool = newNativeWSPool(h.MaxUpstreamWebSockets, time.Duration(h.UpstreamWSIdleTimeout))
	return nil
}

func (h *Handler) loadModules(ctx caddy.Context) error {
	if len(h.TransportsRaw) == 0 {
		h.TransportsRaw = caddy.ModuleMap{"standard": json.RawMessage(`{}`)}
	}
	loaded, err := ctx.LoadModule(h, "TransportsRaw")
	if err != nil {
		return err
	}
	h.transports = make(map[string]upstreamtransport.Factory, len(h.TransportsRaw))
	for name, module := range loaded.(map[string]any) {
		factory, ok := module.(upstreamtransport.Factory)
		if !ok {
			return fmt.Errorf("Responses WebSocket transport %q has incompatible type %T", name, module)
		}
		h.transports[name] = factory
	}
	if len(h.ProtocolsRaw) == 0 {
		h.ProtocolsRaw = caddy.ModuleMap{"passthrough": json.RawMessage(`{}`)}
	}
	loaded, err = ctx.LoadModule(h, "ProtocolsRaw")
	if err != nil {
		return err
	}
	h.protocols = make(map[string]protocoltransform.Transformer, len(h.ProtocolsRaw))
	for name, module := range loaded.(map[string]any) {
		transformer, ok := module.(protocoltransform.Transformer)
		if !ok {
			return fmt.Errorf("Responses WebSocket protocol %q has incompatible type %T", name, module)
		}
		h.protocols[name] = transformer
	}
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, _ caddyhttp.Handler) error {
	state, ok := requeststate.FromContext(r.Context())
	if !ok || state.Auth == nil || state.RequestID == "" || h.runtime == nil {
		return caddyhttp.Error(http.StatusInternalServerError, fmt.Errorf("Responses WebSocket pipeline state is unavailable"))
	}
	connection, err := websocket.Accept(w, r, nil)
	if err != nil {
		return nil
	}
	connection.SetReadLimit(maxFrameBytes)
	defer connection.CloseNow()
	defer h.nativePool.closeSession(state.RequestID)
	sessionCtx, sessionCancel := context.WithCancel(r.Context())
	defer sessionCancel()
	grants := &authSession{grant: state.Auth.Clone()}
	go h.renewGrantLoop(sessionCtx, connection, state.RequestID, grants)
	frames := make(chan clientFrame, 8)
	go readClientFrames(sessionCtx, connection, frames)
	var previousModel string
	var active *activeTurn
	var turn int64
	finishActive := func(result turnResult) {
		current := active
		active = nil
		if current == nil {
			return
		}
		if current.cancelled {
			_ = writeWSCancelled(sessionCtx, connection, current.cancelResponseID)
			return
		}
		if result.err != nil && sessionCtx.Err() == nil {
			_ = writeWSError(sessionCtx, connection, "upstream_error", "Responses turn failed")
			if h.logger != nil {
				h.logger.Warn("Responses WebSocket turn failed", zap.String("request_id", state.RequestID), zap.Error(result.err))
			}
		}
	}
	for {
		if active != nil {
			select {
			case result := <-active.done:
				finishActive(result)
				continue
			default:
			}
		}
		var turnDone <-chan turnResult
		if active != nil {
			turnDone = active.done
		}
		select {
		case result := <-turnDone:
			finishActive(result)
		case incoming, ok := <-frames:
			if !ok || incoming.err != nil {
				if active != nil {
					active.cancel()
					<-active.done
				}
				return nil
			}
			if incoming.messageType != websocket.MessageText {
				_ = connection.Close(websocket.StatusPolicyViolation, "Responses WebSocket only accepts text frames")
				return nil
			}
			eventType, responseID, eventErr := clientEvent(incoming.payload)
			if eventErr != nil {
				_ = writeWSError(sessionCtx, connection, "invalid_request_error", eventErr.Error())
				continue
			}
			if eventType == "response.cancel" {
				if active == nil {
					_ = writeWSError(sessionCtx, connection, "invalid_request_error", "no active response to cancel")
					continue
				}
				if active.progress.terminal.Load() {
					result := <-active.done
					finishActive(result)
					_ = writeWSError(sessionCtx, connection, "invalid_request_error", "no active response to cancel")
					continue
				}
				upstreamResponseID := active.progress.responseID()
				if responseID != "" && upstreamResponseID != "" && responseID != upstreamResponseID {
					_ = writeWSError(sessionCtx, connection, "invalid_request_error", "response.cancel response_id does not match the active response")
					continue
				}
				active.cancelled = true
				active.cancelResponseID = upstreamResponseID
				if active.cancelResponseID == "" {
					active.cancelResponseID = responseID
				}
				active.cancel()
				continue
			}
			if active != nil {
				select {
				case result := <-active.done:
					finishActive(result)
				default:
					if active.progress.terminal.Load() {
						result := <-active.done
						finishActive(result)
					} else {
						_ = writeWSError(sessionCtx, connection, "invalid_request_error", "overlapping response.create is not supported")
						continue
					}
				}
			}
			parsed, parseErr := parseTurn(incoming.payload, previousModel)
			if parseErr != nil {
				_ = writeWSError(sessionCtx, connection, "invalid_request_error", parseErr.Error())
				continue
			}
			grant := grants.current()
			if grant == nil {
				_ = connection.Close(websocket.StatusPolicyViolation, "authorization grant unavailable")
				return nil
			}
			previousModel = parsed.model
			turn++
			turnCtx, cancel := context.WithCancel(sessionCtx)
			done := make(chan turnResult, 1)
			active = &activeTurn{cancel: cancel, done: done}
			progress := &active.progress
			go func(turnCtx context.Context, done chan<- turnResult, progress *turnProgress, turn int64, payload turnPayload, grant *requeststate.AuthGrant) {
				done <- turnResult{err: h.executeTurn(turnCtx, connection, r, state, grant, progress, turn, payload)}
			}(turnCtx, done, progress, turn, parsed, grant)
		case <-sessionCtx.Done():
			if active != nil {
				active.cancel()
				<-active.done
			}
			return nil
		}
	}
}

func (h *Handler) Cleanup() error {
	if h.nativePool != nil {
		h.nativePool.closeAll()
	}
	return nil
}

type clientFrame struct {
	messageType websocket.MessageType
	payload     []byte
	err         error
}

type turnResult struct{ err error }

type activeTurn struct {
	cancel           context.CancelFunc
	done             chan turnResult
	cancelled        bool
	cancelResponseID string
	progress         turnProgress
}

type turnProgress struct {
	terminal        atomic.Bool
	responseIDValue atomic.Value
}

func (p *turnProgress) observe(payload []byte) {
	if p == nil {
		return
	}
	_, responseID := responseEventMetadata(payload)
	if responseID != "" && p.responseID() == "" {
		p.responseIDValue.Store(responseID)
	}
	if isTerminalResponseEvent(payload) {
		p.terminal.Store(true)
	}
}

func (p *turnProgress) responseID() string {
	if p == nil {
		return ""
	}
	value := p.responseIDValue.Load()
	responseID, _ := value.(string)
	return responseID
}

func readClientFrames(ctx context.Context, connection *websocket.Conn, output chan<- clientFrame) {
	defer close(output)
	for {
		messageType, payload, err := connection.Read(ctx)
		select {
		case output <- clientFrame{messageType: messageType, payload: payload, err: err}:
		case <-ctx.Done():
			return
		}
		if err != nil {
			return
		}
	}
}

func clientEvent(payload []byte) (eventType, responseID string, err error) {
	var envelope map[string]any
	if json.Unmarshal(payload, &envelope) != nil || envelope == nil {
		return "", "", fmt.Errorf("invalid WebSocket event JSON")
	}
	eventType = strings.TrimSpace(stringValue(envelope["type"]))
	if eventType == "" {
		eventType = "response.create"
	}
	if eventType != "response.create" && eventType != "response.cancel" {
		return "", "", fmt.Errorf("unsupported WebSocket event type %q", eventType)
	}
	return eventType, strings.TrimSpace(stringValue(envelope["response_id"])), nil
}

func writeWSCancelled(ctx context.Context, connection *websocket.Conn, responseID string) error {
	response := map[string]any{"status": "cancelled"}
	if responseID != "" {
		response["id"] = responseID
	}
	payload, _ := json.Marshal(map[string]any{"type": "response.cancelled", "response": response})
	return connection.Write(ctx, websocket.MessageText, payload)
}

type authSession struct {
	mu    sync.RWMutex
	grant *requeststate.AuthGrant
}

func (s *authSession) current() *requeststate.AuthGrant {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.grant.Clone()
}

func (s *authSession) replace(grant *requeststate.AuthGrant) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.grant = grant.Clone()
}

func (h *Handler) renewGrantLoop(ctx context.Context, connection *websocket.Conn, requestID string, session *authSession) {
	for {
		grant := session.current()
		if grant == nil || grant.ExpiresAtUnixMilli <= 0 {
			_ = connection.Close(websocket.StatusPolicyViolation, "authorization grant cannot be renewed")
			return
		}
		wait := time.Until(time.UnixMilli(grant.ExpiresAtUnixMilli).Add(-30 * time.Second))
		if wait < time.Second {
			wait = time.Second
		}
		timer := time.NewTimer(wait)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-timer.C:
		}
		renewed, err := h.runtime.RenewAuthGrant(ctx, requestID, grant)
		if err != nil {
			_ = connection.Close(websocket.StatusPolicyViolation, "authorization grant renewal failed")
			return
		}
		session.replace(renewed)
	}
}

type turnPayload struct {
	raw             []byte
	model           string
	maxOutputTokens int64
	serviceTier     string
	reasoningEffort string
}

func parseTurn(frame []byte, fallbackModel string) (turnPayload, error) {
	decoder := json.NewDecoder(bytes.NewReader(frame))
	decoder.UseNumber()
	var root map[string]any
	if err := decoder.Decode(&root); err != nil || root == nil {
		return turnPayload{}, fmt.Errorf("invalid response.create JSON")
	}
	eventType := strings.TrimSpace(stringValue(root["type"]))
	if eventType == "" {
		eventType = "response.create"
		root["type"] = eventType
	}
	if eventType != "response.create" {
		return turnPayload{}, fmt.Errorf("unsupported WebSocket event type %q", eventType)
	}
	model := strings.TrimSpace(stringValue(root["model"]))
	if model == "" {
		model = strings.TrimSpace(fallbackModel)
		root["model"] = model
	}
	if model == "" {
		return turnPayload{}, fmt.Errorf("model is required in response.create")
	}
	maxTokens := int64(0)
	if number, ok := root["max_output_tokens"].(json.Number); ok {
		maxTokens, _ = number.Int64()
	}
	serviceTier := strings.TrimSpace(stringValue(root["service_tier"]))
	reasoningEffort := strings.TrimSpace(stringValue(root["reasoning_effort"]))
	if reasoningEffort == "" {
		reasoningEffort = strings.TrimSpace(stringValue(root["reasoningEffort"]))
	}
	if reasoning, ok := root["reasoning"].(map[string]any); ok {
		if effort := strings.TrimSpace(stringValue(reasoning["effort"])); effort != "" {
			reasoningEffort = effort
		}
	}
	normalized, err := json.Marshal(root)
	if err != nil {
		return turnPayload{}, err
	}
	return turnPayload{
		raw: normalized, model: model, maxOutputTokens: maxTokens,
		serviceTier: serviceTier, reasoningEffort: reasoningEffort,
	}, nil
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

func writeWSError(ctx context.Context, connection *websocket.Conn, code, message string) error {
	payload, _ := json.Marshal(map[string]any{"type": "error", "error": map[string]any{"type": code, "code": code, "message": message}})
	return connection.Write(ctx, websocket.MessageText, payload)
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddy.CleanerUpper          = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
