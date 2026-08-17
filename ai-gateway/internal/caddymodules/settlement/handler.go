package settlement

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/usageobserver"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"go.uber.org/zap"
)

func init() {
	caddy.RegisterModule(Handler{})
}

type settlementRuntime interface {
	SubmitSettlement(*controlv1.SettleRequestRequest) error
	AbortRequest(context.Context, *controlv1.AbortRequestRequest) error
}

// Handler wraps the terminal proxy and turns response facts into an idempotent
// settlement event. It never buffers the response stream.
type Handler struct {
	runtime settlementRuntime
	logger  *zap.Logger
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_settlement",
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
	h.logger = ctx.Logger()
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) (err error) {
	state, ok := requeststate.FromContext(r.Context())
	if !ok {
		return next.ServeHTTP(w, r)
	}

	observer := &responseObserver{ResponseWriter: w, state: state}
	// ReverseProxy deliberately panics with http.ErrAbortHandler when a
	// streaming body is interrupted after headers were sent. Finalization must
	// therefore be deferred so every admitted request reaches AbortRequest or
	// the durable settlement WAL before Caddy handles that panic.
	defer h.finalize(r, observer, state)
	return next.ServeHTTP(observer, r)
}

func (h *Handler) finalize(r *http.Request, observer *responseObserver, state *requeststate.State) {
	state.SetUsage(observer.usage.Finalize())
	snapshot := state.Finish()
	lease := state.Admission.GetLease()
	if lease == nil {
		return
	}

	if !snapshot.UpstreamStarted {
		abortErr := h.runtime.AbortRequest(context.WithoutCancel(r.Context()), &controlv1.AbortRequestRequest{
			RequestId: state.RequestID,
			LeaseId:   lease.GetLeaseId(),
			Reason:    "upstream_not_started",
		})
		if abortErr != nil && h.logger != nil {
			h.logger.Error("abort request RPC failed", zap.String("request_id", state.RequestID), zap.Error(abortErr))
		}
		return
	}

	plan := state.Admission.GetPlan()
	request := &controlv1.SettleRequestRequest{
		RequestId:      state.RequestID,
		LeaseId:        lease.GetLeaseId(),
		AccountId:      lease.GetAccountId(),
		RequestedModel: state.RequestedModel,
		MappedModel:    plan.GetMappedModel(),
		PricingVersion: lease.GetPricingVersion(),
		Usage: &controlv1.Usage{
			InputTokens:            snapshot.Usage.InputTokens,
			OutputTokens:           snapshot.Usage.OutputTokens,
			CacheReadTokens:        snapshot.Usage.CacheReadTokens,
			CacheCreationTokens:    snapshot.Usage.CacheCreationTokens,
			CacheCreation_5MTokens: snapshot.Usage.CacheCreation5mTokens,
			CacheCreation_1HTokens: snapshot.Usage.CacheCreation1hTokens,
			ReasoningTokens:        snapshot.Usage.ReasoningTokens,
			ResponseBytes:          snapshot.Usage.ResponseBytes,
		},
		Upstream:         &controlv1.UpstreamResult{StatusCode: int32(snapshot.StatusCode), ErrorCode: snapshot.ErrorCode, Attempts: snapshot.Attempts},
		StartedAtUnixMs:  state.StartedAt.UnixMilli(),
		FinishedAtUnixMs: snapshot.FinishedAt.UnixMilli(),
		ClientCancelled:  requeststate.ClientCancelled(r.Context()),
		ServiceTier:      requeststate.NormalizeServiceTier(state.ServiceTier),
		ReasoningEffort:  requeststate.NormalizeReasoningEffort(state.ReasoningEffort),
		OpenaiWsMode:     state.OpenAIWSMode,
	}
	if !snapshot.FirstByteAt.IsZero() {
		request.FirstByteAtUnixMs = snapshot.FirstByteAt.UnixMilli()
	}
	if submitErr := h.runtime.SubmitSettlement(request); submitErr != nil && h.logger != nil {
		h.logger.Error("submit settlement failed", zap.String("request_id", state.RequestID), zap.Error(submitErr))
	}
}

type responseObserver struct {
	http.ResponseWriter
	state       *requeststate.State
	wroteHeader bool
	status      int
	usage       *usageobserver.Observer
}

func (w *responseObserver) WriteHeader(status int) {
	if w.wroteHeader {
		return
	}
	w.wroteHeader = true
	w.status = status
	w.usage = usageobserver.New(w.Header().Get("Content-Type"))
	w.state.SetStatus(status)
	w.ResponseWriter.WriteHeader(status)
}

func (w *responseObserver) Write(p []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	n, err := w.ResponseWriter.Write(p)
	if n > 0 && w.usage != nil {
		w.usage.Write(p[:n])
	}
	w.state.ObserveWrite(w.status, n)
	return n, err
}

func (w *responseObserver) Flush() {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	_ = http.NewResponseController(w.ResponseWriter).Flush()
}

func (w *responseObserver) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return http.NewResponseController(w.ResponseWriter).Hijack()
}

func (w *responseObserver) Push(target string, options *http.PushOptions) error {
	if pusher, ok := w.ResponseWriter.(http.Pusher); ok {
		return pusher.Push(target, options)
	}
	return http.ErrNotSupported
}

func (w *responseObserver) ReadFrom(reader io.Reader) (int64, error) {
	return io.Copy(writerOnly{w}, reader)
}

func (w *responseObserver) Unwrap() http.ResponseWriter { return w.ResponseWriter }

type writerOnly struct{ io.Writer }

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
	_ http.Flusher                = (*responseObserver)(nil)
	_ http.Hijacker               = (*responseObserver)(nil)
	_ io.ReaderFrom               = (*responseObserver)(nil)
)
