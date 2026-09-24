// Package webui serves the embedded console (server/web/dist): hashed assets
// with long cache headers, and index.html for every other browser path (SPA
// fallback) with a per-request CSP nonce replacing the build placeholder.
package webui

import (
	"bytes"
	"crypto/rand"
	"encoding/base64"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// NoncePlaceholder is written into index.html by the Vite build (web/vite.config.ts).
const NoncePlaceholder = "__CSP_NONCE__"

// reservedPrefixes never fall back to index.html.
var reservedPrefixes = []string{"/api/", "/plugin-ui/", "/healthz"}

type Handler struct {
	files fs.FS
	index []byte
}

// New takes the embed FS rooted above "dist".
func New(embedded fs.FS) (*Handler, error) {
	sub, err := fs.Sub(embedded, "dist")
	if err != nil {
		return nil, err
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return nil, err
	}
	return &Handler{files: sub, index: index}, nil
}

// Serve is meant for engine.NoRoute, after the gateway dispatcher.
func (h *Handler) Serve(c *gin.Context) {
	p := c.Request.URL.Path
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		httpapi.Fail(c, core.ErrNotFound)
		return
	}
	for _, pre := range reservedPrefixes {
		if strings.HasPrefix(p, pre) {
			httpapi.Fail(c, core.ErrNotFound)
			return
		}
	}
	name := strings.TrimPrefix(path.Clean(p), "/")
	if name != "" && name != "index.html" {
		if data, err := fs.ReadFile(h.files, name); err == nil {
			h.serveFile(c, name, data)
			return
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
