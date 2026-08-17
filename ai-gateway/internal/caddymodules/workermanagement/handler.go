package workermanagement

import (
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	managerpkg "github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workermanagement"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/workervault"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func init() { caddy.RegisterModule(Handler{}) }

type Handler struct {
	runtime *runtime.Runtime
	manager *managerpkg.Manager
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "http.handlers.sup2api_worker_management", New: func() caddy.Module { return new(Handler) }}
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
	h.manager = h.runtime.WorkerManager()
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, _ caddyhttp.Handler) error {
	if h.manager == nil {
		writeError(w, http.StatusNotFound, "worker_management_disabled", "Worker management is disabled")
		return nil
	}
	if !authorized(r, h.manager.ManagementKey()) {
		w.Header().Set("WWW-Authenticate", `Bearer realm="ai-gateway-worker"`)
		writeError(w, http.StatusUnauthorized, "unauthorized", "Invalid Worker management key")
		return nil
	}
	path := strings.TrimSuffix(r.URL.Path, "/")
	switch {
	case r.Method == http.MethodGet && path == "/worker/v1/identity":
		writeJSON(w, http.StatusOK, map[string]any{
			"protocol_version": managerpkg.ProtocolVersion, "kind": "ai-gateway-caddy",
			"worker_id": h.manager.WorkerID(), "instance_id": h.manager.InstanceID(),
			"generation": 1, "config_revision": 1, "version": h.manager.Version(),
			"capabilities": []string{"openai_api_key", "openai_oauth_pkce", "oauth_refresh", "account_test", "grpc_settlement_logs", "canonical_usage_records", "nats_jetstream_usage", "sqlite_usage_outbox"},
			"caddy":        map[string]any{"enabled": true},
		})
	case r.Method == http.MethodGet && path == "/worker/v1/live":
		writeJSON(w, http.StatusOK, map[string]any{"status": "live", "worker_id": h.manager.WorkerID(), "instance_id": h.manager.InstanceID()})
	case r.Method == http.MethodGet && path == "/worker/v1/ready":
		managerErr := h.manager.Ready(r.Context())
		ready := h.runtime != nil && h.runtime.Ready() && managerErr == nil
		status := http.StatusOK
		if !ready {
			status = http.StatusServiceUnavailable
		}
		body := h.manager.Status(r.Context())
		body["ready"] = ready
		body["control_plane_ready"] = h.runtime != nil && h.runtime.Ready()
		writeJSON(w, status, body)
	case r.Method == http.MethodGet && path == "/worker/v1/status":
		body := h.manager.Status(r.Context())
		body["control_plane_ready"] = h.runtime != nil && h.runtime.Ready()
		writeJSON(w, http.StatusOK, body)
	case r.Method == http.MethodGet && path == "/worker/v1/accounts":
		accounts, err := h.manager.ListAccounts()
		if err != nil {
			writeManagerError(w, err)
			return nil
		}
		writeJSON(w, http.StatusOK, map[string]any{"accounts": accounts})
	case r.Method == http.MethodPost && path == "/worker/v1/accounts/openai/api-key":
		var input managerpkg.AccountInput
		if !decodeJSON(w, r, &input) {
			return nil
		}
		account, err := h.manager.CreateAPIKeyAccount(input)
		if err != nil {
			writeManagerError(w, err)
			return nil
		}
		writeJSON(w, http.StatusCreated, map[string]any{"account": account})
	case r.Method == http.MethodPost && path == "/worker/v1/accounts/openai/oauth/start":
		var input managerpkg.AccountInput
		if !decodeJSON(w, r, &input) {
			return nil
		}
		data, err := h.manager.StartOAuth(input)
		if err != nil {
			writeManagerError(w, err)
			return nil
		}
		writeJSON(w, http.StatusOK, map[string]any{"data": data})
	case r.Method == http.MethodPost && path == "/worker/v1/accounts/openai/oauth/complete":
		var input managerpkg.OAuthCompleteInput
		if !decodeJSON(w, r, &input) {
			return nil
		}
		account, err := h.manager.CompleteOAuth(r.Context(), input)
		if err != nil {
			writeManagerError(w, err)
			return nil
		}
		writeJSON(w, http.StatusCreated, map[string]any{"account": account})
	default:
		h.serveAccountAction(w, r, path)
	}
	return nil
}

func (h *Handler) serveAccountAction(w http.ResponseWriter, r *http.Request, path string) {
	prefix := "/worker/v1/accounts/"
	if !strings.HasPrefix(path, prefix) {
		writeError(w, http.StatusNotFound, "not_found", "Worker management route was not found")
		return
	}
	remainder := strings.TrimPrefix(path, prefix)
	parts := strings.Split(remainder, "/")
	id, err := url.PathUnescape(parts[0])
	if err != nil || strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "invalid_account_id", "Invalid Worker account ID")
		return
	}
	if r.Method == http.MethodDelete && len(parts) == 1 {
		if err := h.manager.DeleteAccount(id); err != nil {
			writeManagerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
		return
	}
	if r.Method != http.MethodPost || len(parts) != 2 {
		writeError(w, http.StatusNotFound, "not_found", "Worker account route was not found")
		return
	}
	switch parts[1] {
	case "refresh":
		account, err := h.manager.Refresh(r.Context(), id)
		if err != nil {
			writeManagerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"refreshed": true, "account": account})
	case "test":
		var input managerpkg.TestInput
		if !decodeJSON(w, r, &input) {
			return
		}
		result, err := h.manager.TestAccount(r.Context(), id, input)
		if err != nil {
			writeManagerError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, result)
	default:
		writeError(w, http.StatusNotFound, "not_found", "Worker account action was not found")
	}
}

func authorized(r *http.Request, secret string) bool {
	raw := strings.TrimSpace(r.Header.Get("Authorization"))
	if !strings.HasPrefix(raw, "Bearer ") {
		return false
	}
	provided := sha256.Sum256([]byte(strings.TrimSpace(strings.TrimPrefix(raw, "Bearer "))))
	expected := sha256.Sum256([]byte(secret))
	return subtle.ConstantTimeCompare(provided[:], expected[:]) == 1
}

func decodeJSON(w http.ResponseWriter, r *http.Request, out any) bool {
	if r.Body == nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "JSON request body is required")
		return false
	}
	decoder := json.NewDecoder(io.LimitReader(r.Body, 1<<20))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(out); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "Invalid JSON request body")
		return false
	}
	return true
}

func writeManagerError(w http.ResponseWriter, err error) {
	status, code := http.StatusUnprocessableEntity, "worker_operation_failed"
	switch {
	case errors.Is(err, workervault.ErrNotFound):
		status, code = http.StatusNotFound, "account_not_found"
	case strings.Contains(err.Error(), "OAuth request") || strings.Contains(err.Error(), "OAuth rejected") || strings.Contains(err.Error(), "connection test") || strings.Contains(err.Error(), "returned HTTP"):
		status, code = http.StatusBadGateway, "upstream_failed"
	case strings.Contains(err.Error(), "session") && strings.Contains(err.Error(), "expired"):
		status, code = http.StatusGone, "oauth_session_expired"
	}
	writeError(w, status, code, err.Error())
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"code": code, "message": message})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
