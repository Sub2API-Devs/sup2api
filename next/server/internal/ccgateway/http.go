package ccgateway

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/perm"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
	"github.com/gin-gonic/gin"
)

// detached returns a context that outlives the HTTP request (the caller or a
// proxy in front of the core may give up first) with its own timeout. The
// audit identity of the request is preserved.
func detached(c *gin.Context, d time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.WithoutCancel(audit.Context(c)), d)
}

func (s *Service) RegisterRoutes(r *httpapi.Router) {
	r.PermScoped("POST", "/system/ccgateway/accounts/:id/cc-features/preview", s.accountFeaturePreview, perm.AccountAction(accountAction(http.MethodPost)))
	r.Perm("GET", "/system/ccgateway/cli/:id", "settings:read", s.cliManagement)
	r.Perm("POST", "/system/ccgateway/cli/:id", "settings:manage", s.cliManagement)
	r.Perm("PUT", "/system/ccgateway/cli/:id", "settings:manage", s.cliManagement)
	r.Perm("GET", "/system/ccgateway/features", "settings:read", s.featuresGet)
	// Per-account runtime: whoever may read / update that account (own
	// level: accounts it created), not settings administrators (CONTRACTS
	// §49.5).
	r.PermScoped("GET", "/system/ccgateway/accounts/:id/:action", s.accountManage, perm.AccountAction(accountAction(http.MethodGet)))
	r.PermScoped("POST", "/system/ccgateway/accounts/:id/:action", s.accountManage, perm.AccountAction(accountAction(http.MethodPost)))
	// PUT only sets the request logs, which is not an own-level action.
	r.PermAny("PUT", "/system/ccgateway/accounts/:id/:action", func(c *gin.Context) {
		if c.Param("action") != "request-logs" {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
		s.accountManage(c)
	}, RuntimeScope(http.MethodPut).All...)
	// Reading the request logs (REQUEST-LOG-VIEWER-DESIGN.md §6).
	s.registerRequestLogViewer(r)
	// Draft runtimes of accounts being created (CONTRACTS §49.9).
	s.registerDraftRoutes(r)
	r.Perm("GET", "/system/ccgateway/remote-config", "settings:read", func(c *gin.Context) {
		httpapi.NoStore(c)
		v, e := s.Load(c.Request.Context())
		if e != nil {
			httpapi.Fail(c, core.ErrUnavailable)
			return
		}
		httpapi.OK(c, v.Public())
	})
	// Installing or reaching code on a host (the SSH target, the controller,
	// the runtimes and their workers) takes a step-up proof each time
	// (CONTRACTS §80.2): a leaked key must not point the core at another host
	// or load another runtime.
	host := r.StepUp(core.StepUpHostInstall)
	host.Perm("PUT", "/system/ccgateway/remote-config", "settings:manage", s.save)
	// Host key probe for the SSH install method (§53.9).
	host.Perm("POST", "/system/ccgateway/remote-fingerprint", "settings:manage", s.fingerprint)
	// Controller installation over SSH or on this machine, then the
	// connection to it (CONTRACTS §53.3 / §53.9).
	host.Perm("POST", "/system/ccgateway/controller/install", "settings:manage", s.controllerInstall)
	// Runtime installation / upgrade over SSH (CONTRACTS §49.16) or through
	// the control panel (§53.6).
	r.Perm("GET", "/system/ccgateway/runtime", "settings:read", s.runtimeGet)
	host.Perm("POST", "/system/ccgateway/runtime/install", "settings:manage", s.runtimeInstall)
	// Sending image bytes runs nothing (and goes in many chunks); loading
	// the image is what takes the proof.
	r.Perm("POST", "/system/ccgateway/runtime/uploads", "settings:manage", s.uploadCreate)
	r.Perm("PUT", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadPut)
	r.Perm("GET", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadGet)
	r.Perm("DELETE", "/system/ccgateway/runtime/uploads/:id", "settings:manage", s.uploadGet)
	host.Perm("POST", "/system/ccgateway/runtime/uploads/:id/load", "settings:manage", s.uploadLoad)
	// The runtime images bundled in the plugin package (§53.10).
	host.Perm("POST", "/system/ccgateway/runtime/bundled", "settings:manage", s.runtimeBundled)
	// Worker update in place, never recreating account containers (§53.7).
	host.Perm("POST", "/system/ccgateway/runtime/workers", "settings:manage", s.runtimeWorkers)
	host.Perm("POST", "/system/ccgateway/runtimes/:key/worker", "settings:manage", s.runtimeWorker)
	r.Perm("POST", "/system/ccgateway/runtime/cleanup", "settings:manage", s.runtimeCleanup)
	// Runtimes of deleted accounts kept for their retention period.
	r.Perm("GET", "/system/ccgateway/runtimes/retained", "settings:read", s.retainedRuntimes)
	r.Perm("POST", "/system/ccgateway/runtimes/:key/purge", "settings:manage", s.runtimePurge)
	// The shared-container endpoints (status, proxy, auth/*, remote-action)
	// are gone: per-account runtimes are the only mode (§53.9).
	host.Perm("POST", "/system/ccgateway/remote-test", "settings:manage", s.remoteTest)
}
func (s *Service) record(c *gin.Context, action string) { s.recordDetail(c, action, nil) }

// recordDetail audits with a non-sensitive detail object (enum values,
// counts, timestamps; never secrets or log contents).
func (s *Service) recordDetail(c *gin.Context, action string, detail any) {
	ctx, cancel := detached(c, 5*time.Second)
	defer cancel()
	uid, _ := core.UserID(ctx)
	if e := audit.Audit(ctx, s.DB.Pool, uid, "ccgateway."+action, "system", "ccgateway", detail); e != nil {
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
