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
	r.Perm("GET", "/system/ccgateway/features", "settings:read", s.featuresGet)
	// Per-account runtime: settings administrators, or whoever may read /
	// update that account (own level: accounts it created), CONTRACTS §49.5.
	r.PermAny("GET", "/system/ccgateway/accounts/:id/:action", s.accountManage, "settings:read", "account:read", "account:own:read")
	r.PermAny("POST", "/system/ccgateway/accounts/:id/:action", s.accountManage, "settings:manage", "account:update", "account:own:update")
	r.PermAny("PUT", "/system/ccgateway/accounts/:id/:action", func(c *gin.Context) {
		if c.Param("action") != "request-logs" {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
		s.accountManage(c)
	}, "settings:manage", "account:update", "account:own:update")
	// Draft runtimes of accounts being created (CONTRACTS §49.9).
	s.registerDraftRoutes(r)
	r.Perm("GET", "/system/ccgateway/remote-config", "settings:read", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		v, e := s.Load(c.Request.Context())
		if e != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		httpapi.OK(c, v.Public())
	})
	r.Perm("PUT", "/system/ccgateway/remote-config", "settings:manage", s.save)
	r.Perm("POST", "/system/ccgateway/remote-fingerprint", "settings:manage", s.fingerprint)
	// Control panel mode (CONTRACTS §53): install over SSH, then HTTPS.
	r.Perm("POST", "/system/ccgateway/controller/install", "settings:manage", s.controllerInstall)
	// Runtime installation / upgrade over SSH (CONTRACTS §49.16) or through
	// the control panel (§53.6).
	r.Perm("GET", "/system/ccgateway/runtime", "settings:read", s.runtimeGet)
	r.Perm("POST", "/system/ccgateway/runtime/install", "settings:manage", s.runtimeInstall)
	r.Perm("POST", "/system/ccgateway/runtime/uploads", "settings:manage", s.uploadCreate)
	r.Perm("PUT", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadPut)
	r.Perm("GET", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadGet)
	r.Perm("DELETE", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadGet)
	r.Perm("POST", "/system/ccgateway/runtime/uploads/:id/load", "settings:manage", s.uploadLoad)
	// Worker update in place, never recreating account containers (§53.7).
	r.Perm("POST", "/system/ccgateway/runtime/workers", "settings:manage", s.runtimeWorkers)
	for _, path := range []string{"remote-test", "remote-action"} {
		r.Perm("POST", "/system/ccgateway/"+path, "settings:manage", s.docker)
	}
	for _, path := range []string{"status", "proxy"} {
		r.Perm("GET", "/system/ccgateway/"+path, "settings:read", s.manage)
	}
	r.Perm("PUT", "/system/ccgateway/proxy", "settings:manage", s.manage)
	for _, action := range []string{"start", "complete", "cancel", "logout"} {
		r.Perm("POST", "/system/ccgateway/auth/"+action, "settings:manage", s.manage)
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
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The SSH host key fingerprint could not be read."))
		return
	}
	httpapi.OK(c, gin.H{"fingerprint": fp, "verified": false})
}

func (s *Service) docker(c *gin.Context) {
	action := "test"
	remoteAction := strings.HasSuffix(c.Request.URL.Path, "remote-action")
	if remoteAction {
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
	if e == nil && cfg.Mode == "controller" {
		if remoteAction {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("In control panel mode, containers are managed per account by the controller."))
			return
		}
		h, e := s.health(c.Request.Context(), cfg)
		if e != nil {
			httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
			return
		}
		s.record(c, "docker.test")
		httpapi.OK(c, gin.H{"output": h.describe()})
		return
	}
	if e == nil && cfg.AccountRuntimes && action != "test" {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("With account runtimes on, containers are managed per account."))
		return
	}
	if e != nil || cfg.Mode != "ssh" {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Save the SSH configuration first."))
		return
	}
	out, e := remotedocker.Execute(c.Request.Context(), cfg.SSH(), "ccgateway", action)
	if e != nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("The remote Docker operation failed: check SSH authentication, the host key fingerprint and Docker permissions."))
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
	if e == nil && cfg.AccountRuntimes {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("With account runtimes on, authorization and proxies are set per account."))
		return
	}
	if e != nil || cfg.AdminKey == "" {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("Configure the CCGateway management key first."))
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
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("CCGateway cannot be reached."))
		return
	}
	defer res.Body.Close()
	raw, e := io.ReadAll(io.LimitReader(res.Body, 65537))
	if e != nil || len(raw) > 65536 || res.StatusCode != 200 {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("The CCGateway operation failed: check the container and its authorization."))
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
