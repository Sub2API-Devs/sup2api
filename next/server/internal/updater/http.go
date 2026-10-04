// Package updater bridges authenticated console requests to the local gateway.
// Plugins cannot access this bridge through the Host API.
package updater

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *httpapi.Router, socketPath string, db *store.DB) {
	client := &http.Client{Timeout: 60 * time.Second, Transport: &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", socketPath)
	}}}
	handler := func(c *gin.Context) {
		if socketPath == "" {
			c.JSON(503, gin.H{"error": gin.H{"code": "updater_unavailable", "message": "This node is not managed by the gateway"}})
			return
		}
		body := http.MaxBytesReader(c.Writer, c.Request.Body, 32<<10)
		path := strings.TrimPrefix(c.Request.URL.Path, "/api/v1")
		var releaseRequest struct {
			Repository string `json:"repository"`
			Tag        string `json:"tag"`
		}
		if (path == "/system/update-source" && c.Request.Method == "PUT") || (path == "/system/releases/import" && c.Request.Method == "POST") {
			raw, err := io.ReadAll(body)
			if err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument)
				return
			}
			_ = json.Unmarshal(raw, &releaseRequest)
			body = io.NopCloser(bytes.NewReader(raw))
		}
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
			c.JSON(503, gin.H{"error": gin.H{"code": "updater_unavailable", "message": "Local gateway is unavailable"}})
			return
		}
		defer response.Body.Close()
		payload, err := io.ReadAll(io.LimitReader(response.Body, 8<<20))
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if action, targetType := auditAction(c.Request.Method, c.FullPath()); action != "" && response.StatusCode >= 200 && response.StatusCode < 300 {
			id := c.Param("id")
			var result struct {
				Data struct {
					ID         string `json:"id"`
					Digest     string `json:"digest"`
					Repository string `json:"repository"`
				} `json:"data"`
			}
			_ = json.Unmarshal(payload, &result)
			if result.Data.ID != "" {
				id = result.Data.ID
			}
			details := map[string]any{"source": "console", "request_target": c.Param("id")}
			if action == "system.update_source.update" {
				details["repository"] = result.Data.Repository
			}
			if action == "system.release.import" {
				id = result.Data.Digest
				details["digest"] = id
				details["tag"] = releaseRequest.Tag
				details["repository"] = releaseRequest.Repository
			}
			// The gateway has committed independently. Never turn an audit-write
			// failure into a failed action response that invites duplicate work.
			auditCtx, cancel := context.WithTimeout(context.WithoutCancel(audit.Context(c)), 5*time.Second)
			if err := audit.Audit(auditCtx, db.Pool, uid, action, targetType, id, details); err != nil {
				slog.Error("audit updater action failed", "action", action, "target", id, "err", err)
			}
			cancel()
		}
		c.Header("Content-Type", "application/json")
		c.Status(response.StatusCode)
		_, _ = c.Writer.Write(payload)
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
	// CPU offload is a system setting of the managed cluster.
	r.Perm("GET", "/system/offload", "settings:read", handler)
	r.Perm("PUT", "/system/offload", "settings:manage", handler)
	r.Perm("GET", "/system/update-source", "settings:read", handler)
	r.Perm("PUT", "/system/update-source", "settings:manage", handler)
	r.Perm("GET", "/system/update-check", "system:update:read", handler)
	r.Perm("POST", "/system/releases/import", "system:update:execute", handler)
}

func auditAction(method, path string) (string, string) {
	if method == "PUT" && path == "/api/v1/system/update-source" {
		return "system.update_source.update", "system"
	}
	if method == "POST" && path == "/api/v1/system/releases/import" {
		return "system.release.import", "release"
	}
	if method == "PUT" && path == "/api/v1/system/offload" {
		return "system.offload.update", "system"
	}
	if method != "POST" {
		return "", ""
	}
	if path == "/api/v1/system/upgrades" {
		return "system.upgrade.create", "upgrade"
	}
	for _, action := range []string{"pause", "resume", "cancel", "rollback"} {
		if path == "/api/v1/system/upgrades/:id/"+action {
			return "system.upgrade." + action, "upgrade"
		}
	}
	for _, action := range []string{"enable", "disable"} {
		if path == "/api/v1/system/nodes/:id/"+action {
			return "system.node." + action, "node"
		}
	}
	return "", ""
}
