// Package anthropicoauth implements the native Anthropic Messages wire
// contract for genuine Claude Code OAuth and setup-token requests.
package anthropicoauth

import (
	"fmt"
	"net/http"
	"strings"

	controlv1 "github.com/Sub2API-Devs/sup2api/ai-gateway/gen/control/v1"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/caddyserver/caddy/v2"
)

var forwardedHeaders = map[string]struct{}{
	"accept": {}, "x-stainless-retry-count": {}, "x-stainless-timeout": {},
	"x-stainless-lang": {}, "x-stainless-package-version": {}, "x-stainless-os": {},
	"x-stainless-arch": {}, "x-stainless-runtime": {}, "x-stainless-runtime-version": {},
	"x-stainless-helper-method": {}, "anthropic-dangerous-direct-browser-access": {},
	"anthropic-version": {}, "x-app": {}, "anthropic-beta": {}, "accept-language": {},
	"sec-fetch-mode": {}, "user-agent": {}, "content-type": {}, "accept-encoding": {},
	"x-claude-code-session-id": {}, "x-client-request-id": {},
}

func init() { caddy.RegisterModule(Transformer{}) }

// Transformer applies a strict Claude Code client-header boundary. The body
// remains streaming and byte-preserving except for the generic top-level model
// rewrite owned by sup2api_gateway.
type Transformer struct{}

func (Transformer) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{ID: "sup2api.protocols.anthropic_oauth", New: func() caddy.Module { return new(Transformer) }}
}

func (*Transformer) ForwardClientAddress() bool { return false }

func (*Transformer) TransformRequest(request *http.Request, plan *controlv1.ExecutionPlan, state *requeststate.State) error {
	if request == nil || plan == nil || request.Body == nil {
		return fmt.Errorf("Anthropic OAuth request body is required")
	}
	mode := strings.TrimSpace(plan.GetProtocolOptions()["client_mode"])
	if mode != "claude_code_passthrough" && mode != "mimic" {
		return fmt.Errorf("unsupported Anthropic OAuth client mode %q", mode)
	}
	if mode == "mimic" {
		body, actualMode, contentLength, err := prepareMimicBody(request.Body, plan, state)
		if err != nil {
			return err
		}
		request.Body = body
		request.ContentLength = contentLength
		request.GetBody = nil
		mode = actualMode
		plan.ProtocolOptions["client_mode"] = mode
		if mode == "claude_code_passthrough" {
			applyLatePassthroughPlan(plan)
		}
	}

	for key := range request.Header {
		_, allowed := forwardedHeaders[strings.ToLower(strings.TrimSpace(key))]
		if mode == "mimic" || !allowed {
			request.Header.Del(key)
		}
	}
	// Provider credentials and authoritative beta/version values are applied
	// later from the execution plan by the terminal reverse proxy.
	request.Header.Del("authorization")
	request.Header.Del("proxy-authorization")
	request.Header.Del("x-api-key")
	request.Header.Del("x-goog-api-key")
	request.Header.Del("cookie")
	request.Header.Del("anthropic-beta")
	request.Header.Del("anthropic-version")
	return nil
}

var mimicOnlyHeaders = []string{
	"User-Agent", "X-Stainless-Lang", "X-Stainless-Package-Version", "X-Stainless-OS",
	"X-Stainless-Arch", "X-Stainless-Runtime", "X-Stainless-Runtime-Version",
	"X-Stainless-Retry-Count", "X-Stainless-Timeout", "X-App",
	"Anthropic-Dangerous-Direct-Browser-Access", "x-stainless-helper-method", "x-client-request-id",
}

func applyLatePassthroughPlan(plan *controlv1.ExecutionPlan) {
	if plan == nil {
		return
	}
	for _, key := range mimicOnlyHeaders {
		delete(plan.UpstreamHeaders, key)
	}
	beta := strings.TrimSpace(plan.GetProtocolOptions()["passthrough_beta"])
	if beta == "" {
		delete(plan.UpstreamHeaders, "anthropic-beta")
	} else {
		plan.UpstreamHeaders["anthropic-beta"] = beta
	}
}

func (*Transformer) TransformResponse(response *http.Response, _ *controlv1.ExecutionPlan, state *requeststate.State) error {
	if response == nil || response.Body == nil || state == nil {
		return nil
	}
	if rewrites := state.ResponseRewrites(); len(rewrites) > 0 {
		response.Body = rewriteResponseBody(response.Body, rewrites)
		response.ContentLength = -1
		response.Header.Del("Content-Length")
	}
	return nil
}

var _ caddy.Module = (*Transformer)(nil)
