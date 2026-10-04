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

func (s *Service) connectCCGateway(c *gin.Context) {
	if !s.can(c.Request.Context(), "account:create") {
		httpapi.Fail(c, core.ErrPermissionDenied)
		return
	}
	if s.d.CCGateway == nil || s.d.CCGateway.Ready(c.Request.Context()) != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("请先配置并授权 CCGateway"))
		return
	}
	var in struct {
		Name         string            `json:"name"`
		GroupIDs     []int64           `json:"group_ids"`
		Models       []string          `json:"models"`
		ModelMapping map[string]string `json:"model_mapping"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, connectMaxBody)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Name == "" {
		in.Name = "CCGateway"
	}
	body, _ := json.Marshal(map[string]any{"name": in.Name, "group_ids": in.GroupIDs, "models": in.Models, "model_mapping": in.ModelMapping, "plugin_key": "ccgateway", "type": "managed", "credentials": map[string]any{}})
	c.Request.Body = io.NopCloser(bytes.NewReader(body))
	c.Request.ContentLength = int64(len(body))
	s.create(c)
}
