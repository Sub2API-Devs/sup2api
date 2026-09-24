// Package routes serves plugin-owned console endpoints
// (ANY /api/v1/p/:key/*path) and plugin package assets
// (GET /plugin-ui/:key/:version_hash/*path).
package routes

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// MaxBodyBytes caps request bodies forwarded to plugins.
const MaxBodyBytes = 1 << 20

// Handler serves plugin routes from the current registry generation.
type Handler struct {
	reg    core.PluginRegistry
	tokens core.TokenVerifier
	authz  core.Authorizer
	stepUp core.StepUpVerifier
}

// New creates the handler. stepUp may be nil (sensitive plugin permissions
// are then refused).
func New(reg core.PluginRegistry, tokens core.TokenVerifier, authz core.Authorizer, stepUp core.StepUpVerifier) *Handler {
	return &Handler{reg: reg, tokens: tokens, authz: authz, stepUp: stepUp}
}

// RegisterRoutes mounts ANY /api/v1/p/:key/*path.
func (h *Handler) RegisterRoutes(r *httpapi.Router) {
	r.Group().Any("/p/:key/*path", h.serveAPI)
}

// RegisterAssets mounts GET/HEAD /plugin-ui/:key/:vh/*path on the engine.
func (h *Handler) RegisterAssets(e gin.IRoutes) {
	e.GET("/plugin-ui/:key/:vh/*path", h.serveAsset)
	e.HEAD("/plugin-ui/:key/:vh/*path", h.serveAsset)
}

var (
	errMethodNotAllowed = core.NewError(http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
	errTooLarge         = core.NewError(http.StatusRequestEntityTooLarge, "payload_too_large", "request body too large")
	errRouteNotFound    = core.ErrNotFound.WithMessage("plugin route not found")
)

// Request headers never forwarded to plugins.
var strippedRequestHeaders = map[string]bool{
	"authorization":       true,
	"cookie":              true,
	"x-step-up-token":     true,
	"proxy-authorization": true,
	"connection":          true,
	"keep-alive":          true,
	"te":                  true,
	"trailer":             true,
	"transfer-encoding":   true,
	"upgrade":             true,
}

// Response headers never copied from plugins.
var strippedResponseHeaders = map[string]bool{
	"set-cookie":                       true,
	"content-length":                   true,
	"connection":                       true,
	"keep-alive":                       true,
	"transfer-encoding":                true,
	"upgrade":                          true,
	"trailer":                          true,
	"content-security-policy":          true,
	"access-control-allow-origin":      true,
	"access-control-allow-credentials": true,
}

func (h *Handler) serveAPI(c *gin.Context) {
	key := c.Param("key")
	sub := c.Param("path")
	if sub == "" {
		sub = "/"
	}
	gen := h.reg.Current()
	if _, ok := gen.Plugin(key); !ok {
		httpapi.Fail(c, core.ErrPluginUnavailable.WithDetails(map[string]any{"plugin_key": key}))
		return
	}
	var (
		chosen        *core.RouteBinding
		params        map[string]string
		methodMissing bool
	)
	for idx, rb := range gen.Routes(key) {
		p, ok := matchPath(rb.Route.Path, sub)
		if !ok {
			continue
		}
		if !strings.EqualFold(rb.Route.Method, c.Request.Method) {
			methodMissing = true
			continue
		}
		routes := gen.Routes(key)
		chosen, params = &routes[idx], p
		break
	}
	if chosen == nil {
		if methodMissing {
			httpapi.Fail(c, errMethodNotAllowed)
		} else {
			httpapi.Fail(c, errRouteNotFound)
		}
		return
	}

	ctx := c.Request.Context()
	var userID int64
	switch chosen.Route.Scope {
	case "admin", "user":
		token, ok := strings.CutPrefix(c.GetHeader("Authorization"), "Bearer ")
		if !ok || token == "" || h.tokens == nil {
			httpapi.Fail(c, core.ErrUnauthenticated)
			return
		}
		uid, err := h.tokens.VerifyAccessToken(ctx, token)
		if err != nil {
			httpapi.Fail(c, core.ErrUnauthenticated.WithCause(err))
			return
		}
		userID = uid
		ctx = core.WithUserID(ctx, uid)
		if perm := chosen.Route.Permission; perm != "" {
			full := "plugin." + key + ":" + perm
			if h.authz == nil {
				httpapi.Fail(c, core.ErrPermissionDenied)
				return
			}
			allowed, err := h.authz.Can(ctx, uid, full)
			if err != nil {
				httpapi.Fail(c, err)
				return
			}
			if !allowed {
				httpapi.Fail(c, core.ErrPermissionDenied.WithDetails(map[string]any{"permission": full}))
				return
			}
			if h.authz.IsSensitive(full) {
				if h.stepUp == nil {
					httpapi.Fail(c, core.ErrStepUpRequired)
					return
				}
				if err := h.stepUp.VerifyStepUp(ctx, uid, c.GetHeader("X-Step-Up-Token")); err != nil {
					httpapi.Fail(c, core.ErrStepUpRequired.WithCause(err))
					return
				}
			}
		}
	case "public", "webhook":
	default:
		httpapi.Fail(c, errRouteNotFound)
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, MaxBodyBytes))
	if err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			httpapi.Fail(c, errTooLarge)
			return
		}
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("read request body").WithCause(err))
		return
	}

	req := &pluginv1.HTTPRequest{
		Caller: &pluginv1.Caller{
			UserId:    userID,
			RequestId: core.RequestID(ctx),
			ClientIp:  c.ClientIP(),
			Locale:    core.Locale(ctx),
		},
		Method:     c.Request.Method,
		Path:       sub,
		RoutePath:  chosen.Route.Path,
		PathParams: params,
		Query:      map[string]*pluginv1.HeaderValues{},
		Headers:    map[string]*pluginv1.HeaderValues{},
		Body:       body,
	}
	for k, v := range c.Request.URL.Query() {
		req.Query[k] = &pluginv1.HeaderValues{Values: v}
	}
	for k, v := range c.Request.Header {
		lk := strings.ToLower(k)
		if strippedRequestHeaders[lk] {
			continue
		}
		req.Headers[lk] = &pluginv1.HeaderValues{Values: v}
	}
	resp, err := chosen.Client.HandleHTTP(ctx, req)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	writeResponse(c, resp)
}

func writeResponse(c *gin.Context, resp *pluginv1.HTTPResponse) {
	hdr := c.Writer.Header()
	for k, v := range resp.GetHeaders() {
		lk := strings.ToLower(k)
		if strippedResponseHeaders[lk] || strings.HasPrefix(lk, "proxy-") || v == nil {
			continue
		}
		hdr.Del(k)
		for _, x := range v.GetValues() {
			hdr.Add(k, x)
		}
	}
	body := resp.GetBody()
	if hdr.Get("Content-Type") == "" && len(body) > 0 {
		if json.Valid(body) {
			hdr.Set("Content-Type", "application/json; charset=utf-8")
		} else {
			hdr.Set("Content-Type", "application/octet-stream")
		}
	}
	// Plugin responses share the console origin: never let them render as
	// an active document.
	hdr.Set("X-Content-Type-Options", "nosniff")
	hdr.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; sandbox")
	status := int(resp.GetStatus())
	if status < 100 || status > 599 {
		status = http.StatusOK
	}
	c.Status(status)
	if c.Request.Method != http.MethodHead && len(body) > 0 {
		_, _ = c.Writer.Write(body)
	}
}

// matchPath matches a manifest route pattern ("/rules/:id", "/files/*rest")
// against a request path.
func matchPath(pattern, p string) (map[string]string, bool) {
	ps := splitPath(pattern)
	xs := splitPath(p)
	params := map[string]string{}
	for i, seg := range ps {
		if strings.HasPrefix(seg, "*") {
			params[strings.TrimPrefix(seg, "*")] = "/" + strings.Join(xs[min(i, len(xs)):], "/")
			return params, true
		}
		if i >= len(xs) {
			return nil, false
		}
		if strings.HasPrefix(seg, ":") {
			if xs[i] == "" {
				return nil, false
			}
			params[seg[1:]] = xs[i]
			continue
		}
		if seg != xs[i] {
			return nil, false
		}
	}
	if len(xs) != len(ps) {
		return nil, false
	}
	return params, true
}

func splitPath(p string) []string {
	p = strings.Trim(p, "/")
	if p == "" {
		return nil
	}
	return strings.Split(p, "/")
}

// ------------------------------------------------------------------ assets

const iframeCSP = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
	"img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; " +
	"object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; sandbox allow-scripts"

const svgCSP = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

func (h *Handler) serveAsset(c *gin.Context) {
	key, vh := c.Param("key"), c.Param("vh")
	gen := h.reg.Current()
	info, ok := gen.Plugin(key)
	if !ok || info.AssetBase != "/plugin-ui/"+key+"/"+vh {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	raw := c.Param("path")
	if strings.Contains(raw, "..") || strings.Contains(raw, "\\") {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	name := strings.TrimPrefix(path.Clean("/"+raw), "/")
	if !assetAllowed(info, name) {
		c.AbortWithStatus(http.StatusNotFound)
		return
	}
	data, ct, err := gen.ReadAsset(key, name)
	if err != nil {
		if e := core.AsError(err); e.Status == http.StatusNotFound {
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		httpapi.Fail(c, err)
		return
	}
	hdr := c.Writer.Header()
	hdr.Set("Cache-Control", "public, max-age=31536000, immutable")
	hdr.Set("X-Content-Type-Options", "nosniff")
	switch {
	case strings.HasPrefix(ct, "text/html"):
		hdr.Set("Content-Security-Policy", iframeCSP)
		hdr.Set("X-Frame-Options", "SAMEORIGIN")
	case strings.HasPrefix(ct, "image/svg"):
		hdr.Set("Content-Security-Policy", svgCSP)
	}
	if c.Request.Method == http.MethodHead {
		hdr.Set("Content-Type", ct)
		c.Status(http.StatusOK)
		return
	}
	c.Data(http.StatusOK, ct, data)
}

func assetAllowed(info core.PluginInfo, name string) bool {
	for _, prefix := range []string{"ui/", "forms/", "i18n/"} {
		if strings.HasPrefix(name, prefix) && len(name) > len(prefix) {
			return true
		}
	}
	if m := info.Manifest; m != nil && m.Icon != "" && !strings.HasPrefix(m.Icon, "text:") {
		return name == strings.TrimPrefix(path.Clean("/"+m.Icon), "/")
	}
	return false
}
