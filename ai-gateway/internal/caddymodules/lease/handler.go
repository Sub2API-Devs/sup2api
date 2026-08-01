package lease

import (
	"context"
	"fmt"
	"net/http"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/leaselifecycle"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
	"go.uber.org/zap"
)

func init() {
	caddy.RegisterModule(Handler{})
}

type leaseRuntime interface {
	RenewLease(context.Context, *controlv1.RenewLeaseRequest) (*controlv1.RenewLeaseResponse, error)
}

// Handler renews admission leases while a long-lived HTTP, SSE, or WebSocket
// request remains active. Transient RPC failures are retried while the last
// acknowledged lease is valid. An explicit rejection or actual expiry
// cancels the upstream request fail-closed.
type Handler struct {
	RenewInterval caddy.Duration `json:"renew_interval,omitempty"`

	runtime leaseRuntime
	logger  *zap.Logger
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_lease",
		New: func() caddy.Module { return new(Handler) },
	}
}

func (h *Handler) Provision(ctx caddy.Context) error {
	if h.RenewInterval == 0 {
		h.RenewInterval = caddy.Duration(30 * time.Second)
	}
	if time.Duration(h.RenewInterval) <= 0 {
		return fmt.Errorf("renew_interval must be positive")
	}
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

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, next caddyhttp.Handler) error {
	state, ok := requeststate.FromContext(r.Context())
	if !ok || state.Admission.GetLease() == nil || state.Admission.GetLease().GetExpiresAtUnixMs() <= 0 {
		return next.ServeHTTP(w, r)
	}

	ctx, cancel := context.WithCancelCause(r.Context())
	done := make(chan struct{})
	go h.renewLoop(ctx, cancel, done, state)
	err := next.ServeHTTP(w, r.WithContext(ctx))
	cancel(nil)
	<-done
	return err
}

func (h *Handler) renewLoop(ctx context.Context, cancel context.CancelCauseFunc, done chan<- struct{}, state *requeststate.State) {
	defer close(done)
	leaseID := state.Admission.GetLease().GetLeaseId()
	expiresAt := time.UnixMilli(state.Admission.GetLease().GetExpiresAtUnixMs())
	for {
		delay := leaselifecycle.RenewalDelay(time.Duration(h.RenewInterval), expiresAt, time.Now())
		timer := time.NewTimer(delay)
		select {
		case <-timer.C:
			if !time.Now().Before(expiresAt) {
				h.revoke(state, cancel, "lease_expired")
				return
			}
			response, err := h.runtime.RenewLease(ctx, &controlv1.RenewLeaseRequest{
				RequestId: state.RequestID,
				LeaseId:   leaseID,
			})
			if err != nil && ctx.Err() == nil && h.logger != nil {
				h.logger.Warn("renew lease RPC failed", zap.String("request_id", state.RequestID), zap.Error(err))
			}
			if err != nil {
				if leaselifecycle.TerminalRPCError(err) {
					h.revoke(state, cancel, "lease_renewal_rejected")
					return
				}
				continue
			}
			if response == nil || !response.GetRenewed() {
				h.revoke(state, cancel, "lease_renewal_rejected")
				return
			}
			candidate := time.UnixMilli(response.GetExpiresAtUnixMs())
			if !candidate.After(time.Now()) {
				h.revoke(state, cancel, "lease_renewal_invalid")
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

func (h *Handler) revoke(state *requeststate.State, cancel context.CancelCauseFunc, code string) {
	state.SetError(code)
	if h.logger != nil {
		h.logger.Warn("request lease is no longer valid", zap.String("request_id", state.RequestID), zap.String("reason", code))
	}
	cancel(requeststate.ErrLeaseRevoked)
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
