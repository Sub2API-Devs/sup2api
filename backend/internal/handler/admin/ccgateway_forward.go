package admin

import (
	"context"
	"crypto/subtle"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/Wei-Shaw/sub2api/internal/remotedocker"
	"github.com/gin-gonic/gin"
)

// Each call owns its SSH connection for the entire response body lifetime.
// No local forwarded port or externally reachable Docker listener is required.
func (h *PluginHandler) ccgatewayClient(ctx context.Context) (string, *http.Client, func(), error) {
	if h.remoteConfig != nil {
		cfg, err := h.remoteConfig.Get(ctx)
		if err != nil {
			return "", nil, nil, err
		}
		if cfg.Mode == "ssh" {
			client, closeSSH, err := remotedocker.NewHTTPClient(ctx, remotedocker.Config{
				Host: cfg.Host, Port: cfg.Port, User: cfg.User, AuthMode: cfg.AuthMode,
				Password: cfg.Password, PrivateKey: cfg.PrivateKey, Passphrase: cfg.Passphrase,
				HostKeyFingerprint: cfg.HostKeyFingerprint,
			}, "127.0.0.1:8787")
			if err != nil {
				return "", nil, nil, err
			}
			return "http://127.0.0.1:8787", client, func() { _ = closeSSH() }, nil
		}
	}
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return ccgatewayURL(), client, func() {}, nil
}

type ccgatewayResponseBody struct {
	io.ReadCloser
	closeTunnel func()
}

func (b *ccgatewayResponseBody) Close() error {
	err := b.ReadCloser.Close()
	b.closeTunnel()
	return err
}

func (h *PluginHandler) ccgatewayRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	ctx, cancel := context.WithTimeout(ctx, 50*time.Second)
	base, client, closeSSH, err := h.ccgatewayClient(ctx)
	if err != nil {
		cancel()
		return nil, err
	}
	cleanup := func() { closeSSH(); cancel() }
	req, err := http.NewRequestWithContext(ctx, method, base+path, body)
	if err != nil {
		cleanup()
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+os.Getenv("CCG_ADMIN_KEY"))
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		cleanup()
		return nil, err
	}
	res.Body = &ccgatewayResponseBody{ReadCloser: res.Body, closeTunnel: cleanup}
	return res, nil
}

func (h *PluginHandler) ConnectRemoteCCGateway(accounts *AccountHandler) gin.HandlerFunc {
	return func(c *gin.Context) {
		base := ccgatewayURL()
		// New accounts always use the bridge, so switching local/SSH later does
		// not leave their persisted upstream URL pointing at the previous host.
		if h.serverConfig != nil && h.serverConfig.Server.Port > 0 {
			base = fmt.Sprintf("http://127.0.0.1:%d/builtin/ccgateway", h.serverConfig.Server.Port)
		}
		if h.remoteConfig != nil {
			cfg, err := h.remoteConfig.Get(c.Request.Context())
			if err != nil {
				response.Error(c, 503, "Cannot load remote configuration")
				return
			}
			if cfg.Mode == "ssh" {
				if h.serverConfig == nil || h.serverConfig.Server.Port <= 0 {
					response.Error(c, 503, "Local gateway address unavailable")
					return
				}
			}
		}
		accounts.connectCCGateway(c, h.ccgatewayRequest, base)
	}
}

// This bridge is an internal upstream for accounts created by ConnectRemoteCCGateway.
// The normal /v1/messages entry still performs scheduling and billing first.
func (h *PluginHandler) CCGatewayMessages(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	host, _, err := net.SplitHostPort(c.Request.RemoteAddr)
	ip := net.ParseIP(host)
	key := os.Getenv("CCG_API_KEY")
	provided := c.GetHeader("x-api-key")
	if provided == "" {
		provided = strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	}
	if err != nil || ip == nil || !ip.IsLoopback() || key == "" || subtle.ConstantTimeCompare([]byte(key), []byte(provided)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"type": "error", "error": gin.H{"type": "authentication_error", "message": "Internal gateway authentication required"}})
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 4*time.Minute)
	defer cancel()
	base, client, closeSSH, err := h.ccgatewayClient(ctx)
	if err != nil {
		response.Error(c, 502, "SSH gateway unavailable")
		return
	}
	defer closeSSH()
	target, err := url.Parse(base)
	if err != nil || target.Host == "" {
		response.Error(c, 502, "Invalid gateway address")
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 32<<20)
	proxy := &httputil.ReverseProxy{
		Transport: client.Transport, FlushInterval: -1,
		Rewrite: func(p *httputil.ProxyRequest) {
			p.SetURL(target)
			p.Out.URL.Path = strings.TrimRight(target.Path, "/") + "/v1/messages"
			p.Out.URL.RawPath = ""
			p.Out.URL.RawQuery = ""
			p.Out.Header.Del("Authorization")
			p.Out.Header.Set("x-api-key", key)
		},
		ErrorHandler: func(w http.ResponseWriter, _ *http.Request, _ error) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadGateway)
			_, _ = io.WriteString(w, `{"type":"error","error":{"type":"api_error","message":"Remote gateway unavailable"}}`)
		},
	}
	proxy.ServeHTTP(c.Writer, c.Request.WithContext(ctx))
}
