package account

import (
	"bytes"
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
	"io"
	"net/http"
)

// connectMaxBody fits the largest models / model_mapping an account accepts
// (500 ids each, CONTRACTS §18): the console prefills the plugin presets (§41).
const connectMaxBody = 512 << 10

// kickCCGateway prepares a CCGateway account's runtime (container + egress)
// right after it is created or changed instead of waiting for the next 3 s
// sweep, so the editor can start OAuth authorization at once. The ccgateway
// service ignores the kick unless per-account runtimes are enabled.
func (s *Service) kickCCGateway(id int64, pluginKey, typ string) {
	if s.d.CCGateway != nil && pluginKey == "ccgateway" && (typ == "managed" || typ == "apikey") {
		s.d.CCGateway.Kick(id)
	}
}

func (s *Service) connectCCGateway(c *gin.Context) {
	ctx := c.Request.Context()
	if !s.can(ctx, "account:create") {
		httpapi.Fail(c, core.ErrPermissionDenied)
		return
	}
	if s.d.CCGateway == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("请先配置并授权 CCGateway"))
		return
	}
	// The shared container must be configured and authorized; per-account
	// runtimes have no shared /admin/status, each account is authorized on
	// its own after it is created (CONTRACTS §49).
	runtimes := false
	if cfg, err := s.d.CCGateway.Load(ctx); err == nil {
		runtimes = cfg.AccountRuntimes
	}
	if !runtimes && s.d.CCGateway.Ready(ctx) != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("请先配置并授权 CCGateway"))
		return
	}
	var in struct {
		Name         string            `json:"name"`
		GroupIDs     []int64           `json:"group_ids"`
		Models       []string          `json:"models"`
		ModelMapping map[string]string `json:"model_mapping"`
		// The proxy a per-account runtime egresses through (required there:
		// without one the runtime stays blocked).
		ProxyID  *int64  `json:"proxy_id"`
		ProxyURL *string `json:"proxy_url"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, connectMaxBody)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Name == "" {
		in.Name = "CCGateway"
	}
	payload := map[string]any{"name": in.Name, "group_ids": in.GroupIDs, "models": in.Models, "model_mapping": in.ModelMapping, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}}
	if in.ProxyID != nil {
		payload["proxy_id"] = *in.ProxyID
	}
	if in.ProxyURL != nil {
		payload["proxy_url"] = *in.ProxyURL
	}
	body, _ := json.Marshal(payload)
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	c.Request.ContentLength = int64(len(body))
	// account:create was checked above: create the account at that level
	// (the route itself is granted by settings:manage). create kicks the
	// runtime (kickCCGateway).
	c.Request = c.Request.WithContext(core.WithGranted(ctx, append(append([]string{}, core.Granted(ctx)...), "account:create")))
	s.create(c)
}
