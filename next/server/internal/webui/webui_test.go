package webui

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/gin-gonic/gin"
)

func testEngine(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	h, err := New(fstest.MapFS{
		"dist/index.html":          {Data: []byte(`<script type="importmap" nonce="__CSP_NONCE__">{}</script>`)},
		"dist/assets/index-abc.js": {Data: []byte("console.log(1)")},
		"dist/favicon.svg":         {Data: []byte("<svg/>")},
	})
	if err != nil {
		t.Fatal(err)
	}
	e := gin.New()
	e.NoRoute(h.Serve)
	return e
}

func get(e *gin.Engine, method, p string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	e.ServeHTTP(w, httptest.NewRequest(method, p, nil))
	return w
}

func TestIndexFallbackWithNonce(t *testing.T) {
	e := testEngine(t)
	for _, p := range []string{"/", "/accounts", "/plugins/anthropic/settings", "/index.html"} {
		w := get(e, http.MethodGet, p)
		if w.Code != 200 || strings.Contains(w.Body.String(), NoncePlaceholder) {
			t.Fatalf("%s: code %d body %q", p, w.Code, w.Body.String())
		}
		csp := w.Header().Get("Content-Security-Policy")
		if !strings.Contains(csp, "'nonce-") || !strings.Contains(w.Body.String(), "nonce=\"") {
			t.Fatalf("%s: csp %q", p, csp)
		}
	}
	a, b := get(e, http.MethodGet, "/"), get(e, http.MethodGet, "/")
	if a.Header().Get("Content-Security-Policy") == b.Header().Get("Content-Security-Policy") {
		t.Fatal("nonce must change per request")
	}
}

func TestAssetsAndReserved(t *testing.T) {
	e := testEngine(t)
	w := get(e, http.MethodGet, "/assets/index-abc.js")
	if w.Code != 200 || !strings.Contains(w.Header().Get("Cache-Control"), "immutable") ||
		!strings.Contains(w.Header().Get("Content-Type"), "javascript") {
		t.Fatalf("asset: %d %v", w.Code, w.Header())
	}
	if w := get(e, http.MethodGet, "/favicon.svg"); w.Code != 200 {
		t.Fatalf("favicon: %d", w.Code)
	}
	if w := get(e, http.MethodGet, "/assets/missing.js"); w.Code != 404 {
		t.Fatalf("missing asset: %d", w.Code)
	}
	for _, p := range []string{"/api/v1/nope", "/plugin-ui/x/y/z.js"} {
		w := get(e, http.MethodGet, p)
		if w.Code != 404 || !strings.Contains(w.Body.String(), "not_found") {
			t.Fatalf("%s: %d %s", p, w.Code, w.Body.String())
		}
	}
	if w := get(e, http.MethodPost, "/accounts"); w.Code != 404 {
		t.Fatalf("post: %d", w.Code)
	}
}
