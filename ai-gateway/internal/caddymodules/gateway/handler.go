package gateway

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/protocoltransform"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requestrewrite"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/requeststate"
	"github.com/Sub2API-Devs/sup2api/ai-gateway/internal/upstreamtransport"
	"github.com/caddyserver/caddy/v2"
	"github.com/caddyserver/caddy/v2/modules/caddyhttp"
)

func init() {
	caddy.RegisterModule(Handler{})
}

// Handler is the terminal data-plane handler. The foundation transport uses
// net/http ReverseProxy; provider-specific TLS fingerprints, per-account proxy
// routing, and protocol transforms can replace the transport behind this
// module without changing admission or settlement contracts.
type Handler struct {
	TransportsRaw caddy.ModuleMap `json:"transports,omitempty" caddy:"namespace=sup2api.transports"`
	ProtocolsRaw  caddy.ModuleMap `json:"protocols,omitempty" caddy:"namespace=sup2api.protocols"`

	transports map[string]upstreamtransport.Factory
	protocols  map[string]protocoltransform.Transformer
}

func (Handler) CaddyModule() caddy.ModuleInfo {
	return caddy.ModuleInfo{
		ID:  "http.handlers.sup2api_gateway",
		New: func() caddy.Module { return new(Handler) },
	}
}

func (h *Handler) Provision(ctx caddy.Context) error {
	if len(h.TransportsRaw) == 0 {
		h.TransportsRaw = caddy.ModuleMap{"standard": json.RawMessage(`{}`)}
	}
	loaded, err := ctx.LoadModule(h, "TransportsRaw")
	if err != nil {
		return fmt.Errorf("load Sup2API upstream transports: %w", err)
	}
	h.transports = make(map[string]upstreamtransport.Factory, len(h.TransportsRaw))
	for name, module := range loaded.(map[string]any) {
		factory, ok := module.(upstreamtransport.Factory)
		if !ok {
			return fmt.Errorf("upstream transport %q has incompatible type %T", name, module)
		}
		h.transports[name] = factory
	}
	if h.transports["standard"] == nil {
		return fmt.Errorf("standard upstream transport is required")
	}
	if len(h.ProtocolsRaw) == 0 {
		h.ProtocolsRaw = caddy.ModuleMap{"passthrough": json.RawMessage(`{}`)}
	}
	loaded, err = ctx.LoadModule(h, "ProtocolsRaw")
	if err != nil {
		return fmt.Errorf("load Sup2API protocol transformers: %w", err)
	}
	h.protocols = make(map[string]protocoltransform.Transformer, len(h.ProtocolsRaw))
	for name, module := range loaded.(map[string]any) {
		transformer, ok := module.(protocoltransform.Transformer)
		if !ok {
			return fmt.Errorf("protocol transformer %q has incompatible type %T", name, module)
		}
		h.protocols[name] = transformer
	}
	if h.protocols["passthrough"] == nil {
		return fmt.Errorf("passthrough protocol transformer is required")
	}
	return nil
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request, _ caddyhttp.Handler) error {
	state, ok := requeststate.FromContext(r.Context())
	if !ok || state.Admission == nil || state.Admission.GetPlan() == nil {
		return caddyhttp.Error(http.StatusInternalServerError, fmt.Errorf("missing Sup2API execution plan"))
	}
	plan := state.Admission.GetPlan()
	target, err := url.Parse(plan.GetUpstreamUrl())
	if err != nil || target.Scheme == "" || target.Host == "" {
		state.SetError("invalid_execution_plan")
		return caddyhttp.Error(http.StatusBadGateway, fmt.Errorf("invalid upstream URL in execution plan"))
	}
	if target.Scheme != "http" && target.Scheme != "https" {
		state.SetError("unsupported_upstream_scheme")
		return caddyhttp.Error(http.StatusBadGateway, fmt.Errorf("unsupported upstream scheme %q", target.Scheme))
	}
	profile := strings.TrimSpace(plan.GetTransportProfile())
	if profile == "" {
		profile = "standard"
	}
	factory := h.transports[profile]
	if factory == nil {
		state.SetError("unknown_transport_profile")
		return caddyhttp.Error(http.StatusBadGateway, fmt.Errorf("unknown upstream transport profile %q", profile))
	}
	roundTripper, err := factory.Transport(plan)
	if err != nil {
		state.SetError("upstream_transport_unavailable")
		return caddyhttp.Error(http.StatusBadGateway, err)
	}
	protocolProfile := strings.TrimSpace(plan.GetProtocolProfile())
	if protocolProfile == "" {
		protocolProfile = "passthrough"
	}
	transformer := h.protocols[protocolProfile]
	// Direct construction is used by narrow unit tests. Provisioned runtime
	// handlers always have the registered passthrough transformer.
	if transformer == nil && !(protocolProfile == "passthrough" && h.protocols == nil) {
		state.SetError("unknown_protocol_profile")
		return caddyhttp.Error(http.StatusBadGateway, fmt.Errorf("unknown protocol profile %q", protocolProfile))
	}
	forwardClientAddress := true
	if policy, ok := transformer.(protocoltransform.ClientAddressPolicy); ok {
		forwardClientAddress = policy.ForwardClientAddress()
	}
	handlesModelRewrite := false
	if owner, ok := transformer.(protocoltransform.ModelRewriteOwner); ok {
		handlesModelRewrite = owner.HandlesModelRewrite()
	}
	if mappedModel := strings.TrimSpace(plan.GetMappedModel()); !handlesModelRewrite && mappedModel != "" && mappedModel != state.RequestedModel && state.RequestedModel != "" {
		if state.ModelValueEnd <= state.ModelValueStart {
			if !state.ModelInPath {
				state.SetError("model_rewrite_unavailable")
				return caddyhttp.Error(http.StatusBadGateway, fmt.Errorf("mapped model cannot be applied to request body"))
			}
		} else {
			rewritten, delta, rewriteErr := requestrewrite.ReplaceModel(r.Body, state.ModelValueStart, state.ModelValueEnd, mappedModel)
			if rewriteErr != nil {
				state.SetError("model_rewrite_failed")
				return caddyhttp.Error(http.StatusBadGateway, rewriteErr)
			}
			r.Body = rewritten
			if r.ContentLength >= 0 {
				r.ContentLength += delta
			}
		}
	}
	if transformer != nil {
		if err := transformer.TransformRequest(r, plan, state); err != nil {
			status := http.StatusBadGateway
			code := "protocol_request_transform_failed"
			if protocolErr, ok := err.(protocoltransform.HTTPError); ok {
				if candidate := protocolErr.HTTPStatus(); candidate >= 400 && candidate <= 599 {
					status = candidate
				}
				if candidate := strings.TrimSpace(protocolErr.ErrorCode()); candidate != "" {
					code = candidate
				}
			}
			state.SetError(code)
			return caddyhttp.Error(status, fmt.Errorf("transform upstream request: %w", err))
		}
		if wrapper, ok := transformer.(protocoltransform.TransportWrapper); ok {
			roundTripper, err = wrapper.WrapTransport(roundTripper, plan, state)
			if err != nil || roundTripper == nil {
				state.SetError("protocol_transport_unavailable")
				if err == nil {
					err = fmt.Errorf("protocol transport wrapper returned nil")
				}
				return caddyhttp.Error(http.StatusBadGateway, err)
			}
		}
	}

	proxy := &httputil.ReverseProxy{
		Transport: roundTripper,
		Rewrite: func(out *httputil.ProxyRequest) {
			out.SetURL(target)
			out.Out.URL.Path = target.Path
			out.Out.URL.RawPath = target.RawPath
			out.Out.URL.RawQuery = mergeQuery(target.RawQuery, out.In.URL.RawQuery)
			out.Out.Host = target.Host
			if host := strings.TrimSpace(plan.GetUpstreamHost()); host != "" {
				out.Out.Host = host
			}
			if method := strings.TrimSpace(plan.GetUpstreamMethod()); method != "" {
				out.Out.Method = method
			}
			stripClientCredentials(out.Out.Header)
			for key, value := range plan.GetUpstreamHeaders() {
				if allowedPlanHeader(key) {
					out.Out.Header.Set(key, value)
				}
			}
			out.Out.Header.Set("X-Request-ID", state.RequestID)
			if forwardClientAddress {
				out.SetXForwarded()
			}
		},
		ModifyResponse: func(response *http.Response) error {
			if transformer == nil {
				return nil
			}
			if err := transformer.TransformResponse(response, plan, state); err != nil {
				state.SetError("protocol_response_transform_failed")
				return fmt.Errorf("transform upstream response: %w", err)
			}
			return nil
		},
		ErrorHandler: func(rw http.ResponseWriter, _ *http.Request, proxyErr error) {
			state.SetErrorIfEmpty("upstream_transport_error")
			rw.Header().Set("Content-Type", "application/json")
			rw.WriteHeader(http.StatusBadGateway)
			_, _ = rw.Write([]byte(`{"error":{"type":"upstream_transport_error","message":"Upstream request failed"}}`))
			_ = proxyErr
		},
	}

	state.MarkUpstreamStarted()
	proxy.ServeHTTP(w, r)
	return nil
}

func stripClientCredentials(header http.Header) {
	header.Del("Authorization")
	header.Del("Proxy-Authorization")
	header.Del("x-api-key")
	header.Del("x-goog-api-key")
}

func allowedPlanHeader(key string) bool {
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "connection", "content-length", "host", "proxy-authorization", "transfer-encoding", "upgrade":
		return false
	default:
		return key != ""
	}
}

func mergeQuery(planQuery, clientQuery string) string {
	if planQuery == "" {
		return clientQuery
	}
	if clientQuery == "" {
		return planQuery
	}
	return planQuery + "&" + clientQuery
}

var (
	_ caddy.Module                = (*Handler)(nil)
	_ caddy.Provisioner           = (*Handler)(nil)
	_ caddyhttp.MiddlewareHandler = (*Handler)(nil)
)
