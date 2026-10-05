// Package webui serves the embedded console (server/web/dist): hashed assets
// with long cache headers, and index.html for every other browser path (SPA
// fallback) with a per-request CSP nonce replacing the build placeholder.
package webui

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// NoncePlaceholder is written into index.html by the Vite build (web/vite.config.ts).
const NoncePlaceholder = "__CSP_NONCE__"

// Paths under a core route (manifest.ReservedPath: /api, /api/v1/...,
// /plugin-ui/..., /healthz) never fall back to index.html: they get a JSON
// 404. The rule is the one manifest/check applies to plugin endpoints, so the
// console never swallows a core path, and a path a plugin may serve (such as
// /api/v3/...) is treated like any other gateway path.

type Handler struct {
	files  fs.FS
	index  []byte
	shared AssetSource
}

type AssetSource interface {
	Read(context.Context, string) ([]byte, error)
	Ready() bool
}
type Option func(*Handler)

func WithSharedAssets(shared AssetSource) Option { return func(h *Handler) { h.shared = shared } }

// New takes the embed FS rooted above "dist".
func New(embedded fs.FS, options ...Option) (*Handler, error) {
	sub, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, err
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return nil, err
	}
	h := &Handler{files: sub, index: index}
	for _, opt := range options {
		opt(h)
	}
	return h, nil
}

// Serve is meant for engine.NoRoute, after the gateway dispatcher.
func (h *Handler) Serve(c *gin.Context) {
	p := c.Request.URL.Path
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	if manifest.ReservedPath(p) {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	name := strings.TrimPrefix(path.Clean(p), "/")
	if name != "" && name != "index.html" {
		if h.shared != nil && publicAsset(name) && !h.shared.Ready() {
			// A failed publication may indicate a path collision. Until this
			// build is admitted, only already published canonical bytes may
			// be served for an immutable URL, even on a direct request.
			data, err := h.shared.Read(c.Request.Context(), name)
			if err != nil {
				c.Status(http.StatusServiceUnavailable)
				return
			}
			h.serveFile(c, name, data)
			return
		}
		if data, err := fs.ReadFile(h.files, name); err == nil {
			h.serveFile(c, name, data)
			return
		}
		if h.shared != nil && publicAsset(name) {
			data, err := h.shared.Read(c.Request.Context(), name)
			if err == nil {
				h.serveFile(c, name, data)
				return
			}
			if !errors.Is(err, fs.ErrNotExist) {
				c.Status(http.StatusServiceUnavailable)
				return
			}
		}
		if strings.HasPrefix(name, "assets/") || path.Ext(name) != "" {
			c.Status(http.StatusNotFound)
			return
		}
	}
	h.serveIndex(c)
}

func (h *Handler) serveFile(c *gin.Context, name string, data []byte) {
	ct := mime.TypeByExtension(path.Ext(name))
	if ct == "" {
		ct = http.DetectContentType(data)
	}
	if strings.HasPrefix(name, "assets/") {
		c.Header("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		c.Header("Cache-Control", "no-cache")
	}
	c.Header("X-Content-Type-Options", "nosniff")
	c.Data(http.StatusOK, ct, data)
}

func (h *Handler) serveIndex(c *gin.Context) {
	// Do not emit new references after this build's publication lease was
	// lost, including requests sent directly to a node outside the balancer.
	if h.shared != nil && !h.shared.Ready() {
		c.Header("Retry-After", "5")
		c.Status(http.StatusServiceUnavailable)
		return
	}
	nonce := newNonce()
	body := bytes.ReplaceAll(h.index, []byte(NoncePlaceholder), []byte(nonce))
	c.Header("Content-Security-Policy", CSP(nonce))
	c.Header("Cache-Control", "no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Referrer-Policy", "same-origin")
	c.Data(http.StatusOK, "text/html; charset=utf-8", body)
}

// CSP allows same-origin scripts (console chunks and native plugin modules
// under /plugin-ui) plus nonce'd inline scripts (the import map). Plugin
// iframes are same-origin and sandboxed by the console.
func CSP(nonce string) string {
	return strings.Join([]string{
		"default-src 'self'",
		"script-src 'self' 'nonce-" + nonce + "'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		"connect-src 'self'",
		"frame-src 'self'",
		"frame-ancestors 'self'",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
	}, "; ")
}

func newNonce() string {
	var b [16]byte
	_, _ = rand.Read(b[:])
	return base64.StdEncoding.EncodeToString(b[:])
}
