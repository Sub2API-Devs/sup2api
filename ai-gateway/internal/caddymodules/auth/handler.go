package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/netip"
	"strings"
	"time"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/runtime"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

const maxCredentialBytes = 128

func init() {
	caddy.RegisterModule(Handler{})
}

type authRuntime interface {
	ResolveAPIKey(context.Context, string, string) (*controlv1.ResolveAPIKeyResponse, bool, error)
}

// Handler extracts the client credential, resolves a short-lived AuthGrant,
// enforces its IP policy locally, and removes the plaintext credential from
// the remainder of the data-plane pipeline.
type Handler struct {
	runtime authRuntime
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_auth",
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
	state, ok := requeststate.FromContext(r.Context())
	if !ok || state.RequestID == "" {
		httpapi.WriteError(w, protocol, http.StatusInternalServerError, "INVALID_PIPELINE_STATE", "Gateway request state is unavailable", 0)
		return nil
	}
	if h.runtime == nil {
		httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "CONTROL_PLANE_UNAVAILABLE", "Gateway control plane is unavailable", 0)
		return nil
	}
	if r.URL.Query().Has("key") || r.URL.Query().Has("api_key") {
		httpapi.WriteError(w, protocol, http.StatusBadRequest, "api_key_in_query_deprecated", "API key in query parameters is not accepted", 0)
		return nil
	}

	credential := extractCredential(r.Header)
	if credential == "" || len(credential) > maxCredentialBytes {
		httpapi.WriteError(w, protocol, http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key", 0)
		return nil
	}
	response, _, err := h.runtime.ResolveAPIKey(r.Context(), state.RequestID, credential)
	if err != nil {
		status := http.StatusServiceUnavailable
		if errors.Is(err, context.DeadlineExceeded) {
			status = http.StatusGatewayTimeout
		}
		httpapi.WriteError(w, protocol, status, "CONTROL_PLANE_UNAVAILABLE", "Gateway authentication is unavailable", 0)
		return nil
	}
	if response == nil || response.GetDecision() != controlv1.Decision_DECISION_ALLOW || response.GetGrant() == nil {
		writeDenial(w, protocol, response.GetDenial())
		return nil
	}

	grant := authGrant(response.GetGrant())
	clientIP := httpapi.RemoteIP(r.RemoteAddr)
	allowed, policyErr := ipAllowed(clientIP, grant.IPWhitelist, grant.IPBlacklist)
	if policyErr != nil {
		httpapi.WriteError(w, protocol, http.StatusServiceUnavailable, "INVALID_AUTH_POLICY", "Gateway authentication policy is unavailable", 0)
		return nil
	}
	if !allowed {
		httpapi.WriteError(w, protocol, http.StatusForbidden, "ACCESS_DENIED", "Access denied", 0)
		return nil
	}
	if grant.APIKeyExpiresUnixMilli > 0 && time.Now().UnixMilli() >= grant.APIKeyExpiresUnixMilli {
		httpapi.WriteError(w, protocol, http.StatusForbidden, "API_KEY_EXPIRED", "API key has expired", 0)
		return nil
	}

	state.Auth = grant
	state.ClientIP = clientIP
	stripClientCredential(r.Header)
	return next.ServeHTTP(w, r)
}

func extractCredential(header http.Header) string {
	authorization := strings.TrimSpace(header.Get("Authorization"))
	if authorization != "" {
		parts := strings.SplitN(authorization, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}
	if value := strings.TrimSpace(header.Get("x-api-key")); value != "" {
		return value
	}
	return strings.TrimSpace(header.Get("x-goog-api-key"))
}

func stripClientCredential(header http.Header) {
	header.Del("Authorization")
	header.Del("x-api-key")
	header.Del("x-goog-api-key")
}

func authGrant(grant *controlv1.AuthGrant) *requeststate.AuthGrant {
	return &requeststate.AuthGrant{
		GrantToken:             grant.GetGrantToken(),
		CredentialDigest:       grant.GetCredentialDigest(),
		APIKeyID:               grant.GetApiKeyId(),
		UserID:                 grant.GetUserId(),
		GroupID:                grant.GetGroupId(),
		ExpiresAtUnixMilli:     grant.GetExpiresAtUnixMs(),
		APIKeyExpiresUnixMilli: grant.GetApiKeyExpiresAtUnixMs(),
		IPWhitelist:            append([]string(nil), grant.GetIpWhitelist()...),
		IPBlacklist:            append([]string(nil), grant.GetIpBlacklist()...),
		PolicyVersion:          grant.GetPolicyVersion(),
	}
}

func ipAllowed(clientIP string, whitelist, blacklist []string) (bool, error) {
	address, err := netip.ParseAddr(clientIP)
	if err != nil {
		return false, err
	}
	blacklisted, err := matchesAny(address, blacklist)
	if err != nil || blacklisted {
		return false, err
	}
	if len(whitelist) == 0 {
		return true, nil
	}
	return matchesAny(address, whitelist)
}

func matchesAny(address netip.Addr, rules []string) (bool, error) {
	for _, rule := range rules {
		rule = strings.TrimSpace(rule)
		if rule == "" {
			continue
		}
		if prefix, err := netip.ParsePrefix(rule); err == nil {
			if prefix.Contains(address) {
				return true, nil
			}
			continue
		}
		candidate, err := netip.ParseAddr(rule)
		if err != nil {
			return false, fmt.Errorf("invalid IP rule %q: %w", rule, err)
		}
		if candidate == address {
			return true, nil
		}
	}
	return false, nil
}

func writeDenial(w http.ResponseWriter, protocol controlv1.Protocol, denial *controlv1.Denial) {
	if denial == nil {
		httpapi.WriteError(w, protocol, http.StatusUnauthorized, "INVALID_API_KEY", "Invalid API key", 0)
		return
	}
	status := int(denial.GetHttpStatus())
	if status < 400 || status > 599 {
		status = http.StatusUnauthorized
	}
	httpapi.WriteError(w, protocol, status, denial.GetErrorCode(), denial.GetMessage(), int(denial.GetRetryAfterSeconds()))
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
