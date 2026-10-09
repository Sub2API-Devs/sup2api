package ccgateway

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/gin-gonic/gin"
	"log/slog"
	"net/http"
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
	// Host key probe for the SSH install method (§53.9).
	r.Perm("POST", "/system/ccgateway/remote-fingerprint", "settings:manage", s.fingerprint)
	// Controller installation over SSH or on this machine, then the
	// connection to it (CONTRACTS §53.3 / §53.9).
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
	// The shared-container endpoints (status, proxy, auth/*, remote-action)
	// are gone: per-account runtimes are the only mode (§53.9).
	r.Perm("POST", "/system/ccgateway/remote-test", "settings:manage", s.remoteTest)
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

// remoteTest serves POST /system/ccgateway/remote-test: the controller's
// health report (§53.4). Only a connected controller can be tested.
func (s *Service) remoteTest(c *gin.Context) {
	cfg, e := s.Load(c.Request.Context())
	if e != nil || cfg.Mode != "controller" {
		httpapi.Fail(c, reasonError(core.ErrInvalidArgument, "controller_not_configured"))
		return
	}
	h, e := s.health(c.Request.Context(), cfg)
	if e != nil {
		httpapi.Fail(c, reasonError(core.ErrUnavailable, "controller_unhealthy"))
		return
	}
	s.record(c, "docker.test")
	httpapi.OK(c, gin.H{"output": h.describe()})
}
