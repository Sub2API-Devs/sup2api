package readiness

import (
	"fmt"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func init() {
	caddy.RegisterModule(Handler{})
}

type readyRuntime interface {
	Ready() bool
}

// Handler reports whether the data plane can admit new requests. Liveness is
// intentionally a static Caddy route so orchestration can distinguish a live
// process from an unavailable control-plane dependency.
type Handler struct {
	runtime readyRuntime
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_readiness",
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

func (h *Handler) ServeHTTP(w http.ResponseWriter, _ *http.Request, _ caddyhttp.Handler) error {
	w.Header().Set("Content-Type", "application/json")
	if h.runtime == nil || !h.runtime.Ready() {
		w.WriteHeader(http.StatusServiceUnavailable)
		_, _ = w.Write([]byte(`{"status":"not_ready"}`))
		return nil
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ready"}`))
	return nil
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
