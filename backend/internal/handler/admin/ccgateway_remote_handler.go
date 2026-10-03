package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/ccgatewayremote"
	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/gin-gonic/gin"
)

type ccgatewayRemoteStore interface {
	Get(context.Context) (service.CCGatewayRemoteConfig, error)
	Save(context.Context, service.CCGatewayRemoteConfig) (service.CCGatewayRemoteConfig, error)
}

func (h *PluginHandler) CCGatewayRemoteConfig(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	if h.remoteConfig == nil {
		response.Error(c, http.StatusServiceUnavailable, "Remote configuration unavailable")
		return
	}
	if c.Request.Method == http.MethodGet {
		cfg, err := h.remoteConfig.Get(c.Request.Context())
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Cannot load remote configuration")
			return
		}
		response.Success(c, cfg.Public())
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 64<<10)
	var cfg service.CCGatewayRemoteConfig
	if c.ShouldBindJSON(&cfg) != nil {
		response.BadRequest(c, "Invalid remote configuration")
		return
	}
	saved, err := h.remoteConfig.Save(c.Request.Context(), cfg)
	if err != nil {
		// Store errors can wrap repository/encryption failures; never echo them.
		response.BadRequest(c, "Cannot save remote configuration; check host, authentication and pinned fingerprint. Re-enter credentials when changing the target.")
		return
	}
	response.Success(c, saved.Public())
}

func (h *PluginHandler) CCGatewayRemoteFingerprint(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var in struct {
		Host string `json:"host"`
		Port int    `json:"port"`
	}
	if c.ShouldBindJSON(&in) != nil {
		response.BadRequest(c, "Invalid SSH target")
		return
	}
	if in.Port == 0 {
		in.Port = 22
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	fingerprint, err := ccgatewayremote.ProbeFingerprint(ctx, in.Host, in.Port)
	if err != nil {
		response.BadRequest(c, "Cannot read SSH host fingerprint; check the address and SSH port")
		return
	}
	response.Success(c, gin.H{"fingerprint": fingerprint, "verified": false})
}

func (h *PluginHandler) CCGatewayRemoteTest(c *gin.Context) {
	h.runCCGatewayRemote(c, "test")
}

func (h *PluginHandler) CCGatewayRemoteAction(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 4096)
	var in struct {
		Action string `json:"action"`
	}
	if c.ShouldBindJSON(&in) != nil {
		response.BadRequest(c, "Invalid container action")
		return
	}
	switch in.Action {
	case "status", "start", "stop", "restart", "logs":
		h.runCCGatewayRemote(c, in.Action)
	default:
		response.BadRequest(c, "Unsupported container action")
	}
}

func (h *PluginHandler) runCCGatewayRemote(c *gin.Context, action string) {
	c.Header("Cache-Control", "no-store")
	if h.remoteConfig == nil {
		response.Error(c, http.StatusServiceUnavailable, "Remote configuration unavailable")
		return
	}
	cfg, err := h.remoteConfig.Get(c.Request.Context())
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Cannot load remote configuration")
		return
	}
	if cfg.Mode != "ssh" {
		response.BadRequest(c, "Save an SSH connection before running remote operations")
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 40*time.Second)
	defer cancel()
	output, err := ccgatewayremote.Execute(ctx, ccgatewayremote.Config{
		Host: cfg.Host, Port: cfg.Port, User: cfg.User, AuthMode: cfg.AuthMode,
		Password: cfg.Password, PrivateKey: cfg.PrivateKey, Passphrase: cfg.Passphrase,
		HostKeyFingerprint: cfg.HostKeyFingerprint,
	}, action)
	if err != nil {
		response.BadRequest(c, "Remote operation failed; check SSH authentication, pinned host key, Docker permissions and the ccgateway container")
		return
	}
	response.Success(c, gin.H{"output": output})
}
