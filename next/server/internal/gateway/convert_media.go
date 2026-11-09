package gateway

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime"
	"net/http"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
)

// Media downloads for the conversions to Gemini, which take media inline
// only (CONVERT-MATRIX §9.2, D6). The core fetches an http(s) URL itself:
// directly (no account proxy), through the SSRF guard, at most
// media_download_max_mb per file, each file within mediaDownloadTimeout
// and the request's context. A request downloads each URL once, however
// many account types or attempts convert it; a failed download fails
// every conversion needing it, so those types cannot serve the request.

// mediaDownloadTimeout bounds one download (a variable for tests).
var mediaDownloadTimeout = 60 * time.Second

// mediaFetcher is the MediaFetcher of the request, which caches the
// downloads by URL. The downloader is set up on the first download: most
// requests have nothing to download.
func (c *call) mediaFetcher() convert.MediaFetcher {
	return cachedMedia(func(ctx context.Context, url string) (string, string, error) {
		return c.g.mediaDownloader(c.gw.mediaDownloadMaxBytes()).download(ctx, url)
	})
}

// mediaClients are the guarded HTTP clients, without and with private
// addresses allowed.
var mediaClients = [2]func() *http.Client{
	sync.OnceValue(func() *http.Client { return newMediaClient(false) }),
	sync.OnceValue(func() *http.Client { return newMediaClient(true) }),
}

func newMediaClient(allowPrivate bool) *http.Client {
	return netguard.NewClient(netguard.ClientOptions{AllowPrivate: allowPrivate, Timeout: mediaDownloadTimeout})
}

// mediaDownloader downloads one media URL.
type mediaDownloader struct {
	client       *http.Client
	maxBytes     int64
	allowPrivate bool
	lookup       netguard.Lookup
}

func (g *Gateway) mediaDownloader(maxBytes int64) mediaDownloader {
	allow := 0
	if g.allowPrivate {
		allow = 1
	}
	return mediaDownloader{client: mediaClients[allow](), maxBytes: maxBytes, allowPrivate: g.allowPrivate, lookup: g.lookupIP}
}

// cachedMedia is the MediaFetcher of one request: download runs once per
// URL, concurrent callers of one URL wait for it, and the result (an error
// too) is kept.
func cachedMedia(download convert.MediaFetcher) convert.MediaFetcher {
	type entry struct {
		once      sync.Once
		mime, b64 string
		err       error
	}
	var mu sync.Mutex
	entries := map[string]*entry{}
	return func(ctx context.Context, url string) (string, string, error) {
		mu.Lock()
		e, ok := entries[url]
		if !ok {
			e = &entry{}
			entries[url] = e
		}
		mu.Unlock()
		e.once.Do(func() { e.mime, e.b64, e.err = download(ctx, url) })
		return e.mime, e.b64, e.err
	}
}

// download fetches url and returns its media type and base64 content.
func (d mediaDownloader) download(ctx context.Context, url string) (string, string, error) {
	u, err := netguard.CheckURL(ctx, url, d.allowPrivate, d.lookup)
	if err != nil {
		return "", "", err
	}
	ctx, cancel := context.WithTimeout(ctx, mediaDownloadTimeout)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u.String(), nil)
	if err != nil {
		return "", "", err
	}
	resp, err := d.client.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode/100 != 2 {
		return "", "", fmt.Errorf("status %d", resp.StatusCode)
	}
	tooLarge := fmt.Errorf("larger than %d MB", d.maxBytes>>20)
	if resp.ContentLength > d.maxBytes {
		return "", "", tooLarge
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, d.maxBytes+1))
	switch {
	case err != nil:
		return "", "", err
	case int64(len(data)) > d.maxBytes:
		return "", "", tooLarge
	}
	return mediaType(resp.Header.Get("Content-Type"), data, u.Path), base64.StdEncoding.EncodeToString(data), nil
}

// mediaExtTypes are media types by extension Go's table may lack.
var mediaExtTypes = map[string]string{".heic": "image/heic", ".heif": "image/heif", ".webp": "image/webp"}

// mediaType returns the type a server declared unless it is the generic
// octet-stream; else the type the content sniffs as, else the one of the
// URL's extension.
func mediaType(declared string, data []byte, urlPath string) string {
	generic := func(t string) bool { return t == "" || strings.HasSuffix(t, "/octet-stream") }
	parse := func(s string) string {
		t, _, _ := mime.ParseMediaType(s)
		return t
	}
	if t := parse(declared); !generic(t) {
		return t
	}
	if t := parse(http.DetectContentType(data)); !generic(t) {
		return t
	}
	ext := strings.ToLower(path.Ext(urlPath))
	if t, ok := mediaExtTypes[ext]; ok {
		return t
	}
	if t := parse(mime.TypeByExtension(ext)); t != "" {
		return t
	}
	return "application/octet-stream"
}
