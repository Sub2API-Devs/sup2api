package admin

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/Wei-Shaw/sub2api/internal/pkg/response"
	"github.com/gin-gonic/gin"
)

// Outbound proxy configuration belongs to the remote runner and applies to new
// CLI processes. Docker and SSH transports themselves are unaffected.
func (h *PluginHandler) CCGatewayProxy(c *gin.Context) {
	c.Header("Cache-Control", "no-store")
	if os.Getenv("CCG_ADMIN_KEY") == "" {
		response.Error(c, 503, "Configure CCG_ADMIN_KEY first")
		return
	}
	var body io.Reader
	if c.Request.Method == http.MethodPut {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
		var input struct {
			Mode string `json:"mode"`
			URL  string `json:"url,omitempty"`
		}
		if c.ShouldBindJSON(&input) != nil {
			response.BadRequest(c, "Invalid proxy configuration")
			return
		}
		encoded, err := json.Marshal(input)
		if err != nil {
			response.BadRequest(c, "Invalid proxy configuration")
			return
		}
		body = bytes.NewReader(encoded)
	}
	res, err := h.ccgatewayRequest(c.Request.Context(), c.Request.Method, "/admin/proxy", body)
	if err != nil {
		response.Error(c, 502, "Cannot reach the remote proxy configuration service")
		return
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		response.BadRequest(c, "Proxy configuration rejected; use an HTTP/HTTPS URL or update the remote CCGateway image")
		return
	}
	// Allowlist the response: a misconfigured/older sidecar cannot return secrets.
	var view struct {
		Mode        string `json:"mode"`
		Configured  bool   `json:"configured"`
		URLRedacted string `json:"url_redacted"`
		Revision    uint64 `json:"revision"`
	}
	if json.NewDecoder(io.LimitReader(res.Body, 16384)).Decode(&view) != nil {
		response.Error(c, 502, "Invalid remote proxy response")
		return
	}
	if view.Mode != "inherit" && view.Mode != "direct" && view.Mode != "proxy" {
		response.Error(c, 502, "Invalid remote proxy mode")
		return
	}
	if view.URLRedacted != "" {
		parsed, err := url.Parse(view.URLRedacted)
		if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
			view.URLRedacted = ""
		} else {
			view.URLRedacted = parsed.Scheme + "://" + parsed.Host
		}
	}
	response.Success(c, view)
}
