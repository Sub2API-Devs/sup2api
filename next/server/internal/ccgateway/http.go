package ccgateway

import (
	"bytes"
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/gin-gonic/gin"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.Perm("GET", "/system/ccgateway/remote-config", "settings:read", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		v, e := s.Load(c.Request.Context())
		if e != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		httpapi.OK(c, v.Public())
	})
	r.PermStepUp("PUT", "/system/ccgateway/remote-config", "settings:manage", s.save)
	r.PermStepUp("POST", "/system/ccgateway/remote-fingerprint", "settings:manage", s.fingerprint)
	for _, path := range []string{"remote-test", "remote-action"} {
		r.PermStepUp("POST", "/system/ccgateway/"+path, "settings:manage", s.docker)
	}
	for _, path := range []string{"status", "proxy"} {
		r.Perm("GET", "/system/ccgateway/"+path, "settings:read", s.manage)
	}
	r.PermStepUp("PUT", "/system/ccgateway/proxy", "settings:manage", s.manage)
	for _, action := range []string{"start", "complete", "cancel", "logout"} {
		r.PermStepUp("POST", "/system/ccgateway/auth/"+action, "settings:manage", s.manage)
	}
}
func (s *Service) record(c *gin.Context, action string) {
	ctx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), 5*time.Second)
	defer cancel()
	uid, _ := core.UserID(ctx)
	if e := audit.Audit(ctx, s.DB.Pool, uid, "ccgateway."+action, "system", "ccgateway", nil); e != nil {
		slog.Error("CCGateway audit failed", "action", action)
	}
}
func (s *Service) fingerprint(c *gin.Context) {
	var in struct {
		Host string `json:"host"`
		Port int    `json:"port"`
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Port == 0 {
		in.Port = 22
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	fp, e := remotedocker.ProbeFingerprint(ctx, in.Host, in.Port)
	if e != nil {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("无法读取 SSH 指纹"))
		return
	}
	httpapi.OK(c, gin.H{"fingerprint": fp, "verified": false})
}
func (s *Service) docker(c *gin.Context) {
	action := "test"
	if strings.HasSuffix(c.Request.URL.Path, "remote-action") {
		var in struct {
			Action string `json:"action"`
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
		if !httpapi.BindJSON(c, &in) {
			return
		}
		action = in.Action
	}
	switch action {
	case "test", "status", "start", "stop", "restart", "logs":
	default:
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	cfg, e := s.Load(c.Request.Context())
	if e != nil || cfg.Mode != "ssh" {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("请先保存 SSH 配置"))
		return
	}
	out, e := remotedocker.Execute(c.Request.Context(), cfg.SSH(), "ccgateway", action)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("远程 Docker 操作失败，请检查 SSH 认证、主机指纹及 Docker 权限"))
		return
	}
	s.record(c, "docker."+action)
	httpapi.OK(c, gin.H{"output": out})
}
func (s *Service) manage(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	ctx, cancel := context.WithTimeout(c.Request.Context(), 50*time.Second)
	defer cancel()
	cfg, e := s.Load(ctx)
	if e != nil || cfg.AdminKey == "" {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("请先配置 CCGateway 管理密钥"))
		return
	}
	client, base, close, e := s.open(ctx, cfg)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	defer close()
	path := strings.TrimPrefix(c.Request.URL.Path, "/api/v1/system/ccgateway")
	if path != "/status" && path != "/proxy" && path != "/auth/start" && path != "/auth/complete" && path != "/auth/cancel" && path != "/auth/logout" {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	data, e := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, 8192))
	if e != nil {
		httpapi.Fail(c, core.ErrInvalidArgument)
		return
	}
	req, e := http.NewRequestWithContext(ctx, c.Request.Method, base+"/admin"+path, bytes.NewReader(data))
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	req.Header.Set("Authorization", "Bearer "+cfg.AdminKey)
	req.Header.Set("Content-Type", "application/json")
	res, e := client.Do(req)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("无法连接 CCGateway"))
		return
	}
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(raw) > 65536 || res.StatusCode != 200 {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("CCGateway 操作失败，请检查容器或授权状态"))
		return
	}
	out, e := safeResult(path, raw)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable)
		return
	}
	if c.Request.Method != "GET" {
		s.record(c, strings.ReplaceAll(strings.TrimPrefix(path, "/"), "/", "."))
	}
	httpapi.OK(c, out)
}
