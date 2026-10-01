// Package updater bridges authenticated console requests to the local shell.
// Plugins cannot access this bridge through the Host API.
package updater

import (
	"context"
	"io"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *httpapi.Router, socketPath string) {
	client := &http.Client{Timeout: 30 * time.Second, Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
	}}}
	handler := func(c *gin.Context) {
		if socketPath == "" {
			c.JSON(503, gin.H{"error": gin.H{"code": "updater_unavailable", "message": "This node is not managed by the update shell"}})
			return
		}
		body := http.MaxBytesReader(c.Writer, c.Request.Body, 32<<10)
		path := strings.TrimPrefix(c.Request.URL.Path, "/api/v1")
		req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, "http://shell"+path, body)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		req.URL.RawQuery = c.Request.URL.RawQuery
		req.Header.Set("Content-Type", "application/json")
		uid, _ := core.UserID(c.Request.Context())
		req.Header.Set("X-Updater-Actor", strconv.FormatInt(uid, 10))
		response, err := client.Do(req)
		if err != nil {
			c.JSON(503, gin.H{"error": gin.H{"code": "updater_unavailable", "message": "Local update shell is unavailable"}})
			return
		}
		defer response.Body.Close()
		c.Header("Content-Type", "application/json")
		c.Status(response.StatusCode)
		_, _ = io.Copy(c.Writer, io.LimitReader(response.Body, 8<<20))
	}
	for _, path := range []string{"/system/releases", "/system/upgrades", "/system/upgrades/:id", "/system/upgrades/:id/events"} {
		r.Perm("GET", path, "system:update:read", handler)
	}
	r.Perm("POST", "/system/upgrades/preflight", "system:update:read", handler)
	r.Perm("POST", "/system/upgrades", "system:update:execute", handler)
	for _, action := range []string{"pause", "resume", "cancel", "rollback"} {
		r.Perm("POST", "/system/upgrades/:id/"+action, "system:update:recover", handler)
	}
	for _, action := range []string{"disable", "enable"} {
		r.Perm("POST", "/system/nodes/:id/"+action, "system:update:recover", handler)
	}
}
