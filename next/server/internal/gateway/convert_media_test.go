package gateway

import (
	"context"
	"encoding/base64"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/netguard"
)

var pngBytes, _ = base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")

// mediaServer serves media test files: /png (no declared type), /typed
// (declared image/webp), /big (2 MiB, no length), /slow, /missing (404).
func mediaServer(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/png":
			w.Header().Set("Content-Type", "application/octet-stream")
			_, _ = w.Write(pngBytes)
		case "/blob.heic":
			w.Header().Set("Content-Type", "application/octet-stream")
			_, _ = w.Write([]byte{0, 0, 0, 24, 'f', 't', 'y', 'p', 'h', 'e', 'i', 'c'})
		case "/typed":
			w.Header().Set("Content-Type", "image/webp; charset=binary")
			_, _ = w.Write(pngBytes)
		case "/big":
			w.(http.Flusher).Flush() // no Content-Length
			_, _ = w.Write(make([]byte, 2<<20))
		case "/slow":
			select {
			case <-r.Context().Done():
			case <-time.After(5 * time.Second):
			}
		default:
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func testDownloader(allowPrivate bool) mediaDownloader {
	return mediaDownloader{client: newMediaClient(allowPrivate), maxBytes: 1 << 20, allowPrivate: allowPrivate,
		lookup: netguard.DefaultLookup}
}

func TestMediaDownload(t *testing.T) {
	srv := mediaServer(t)
	d := testDownloader(true)
	ctx := context.Background()

	cases := map[string]string{"/png": "image/png", "/typed": "image/webp", "/blob.heic": "image/heic"}
	for p, want := range cases {
		mt, b64, err := d.download(ctx, srv.URL+p)
		if err != nil || mt != want {
			t.Errorf("%s: %q %v, want %s", p, mt, err, want)
		}
		if p == "/png" && b64 != base64.StdEncoding.EncodeToString(pngBytes) {
			t.Errorf("%s: data %q", p, b64)
		}
	}
	for p, want := range map[string]string{"/big": "larger than 1 MB", "/missing": "status 404"} {
		if _, _, err := d.download(ctx, srv.URL+p); err == nil || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: %v, want %s", p, err, want)
		}
	}
	d.maxBytes = 16
	if _, _, err := d.download(ctx, srv.URL+"/png"); err == nil || !strings.Contains(err.Error(), "larger than") {
		t.Errorf("declared length over the limit: %v", err)
	}
}

func TestMediaDownloadTimeout(t *testing.T) {
	srv := mediaServer(t)
	saved := mediaDownloadTimeout
	mediaDownloadTimeout = 50 * time.Millisecond
	t.Cleanup(func() { mediaDownloadTimeout = saved })
	start := time.Now()
	_, _, err := testDownloader(true).download(context.Background(), srv.URL+"/slow")
	if !errors.Is(err, context.DeadlineExceeded) || time.Since(start) > 2*time.Second {
		t.Fatalf("got %v after %s", err, time.Since(start))
	}
}

func TestMediaDownloadSSRF(t *testing.T) {
	srv := mediaServer(t)
	d := testDownloader(false)
	if _, _, err := d.download(context.Background(), srv.URL+"/png"); !errors.Is(err, netguard.ErrPrivate) {
		t.Fatalf("loopback: %v", err)
	}
	// A public name resolving to a private address is refused before dialing.
	d.lookup = func(context.Context, string) ([]net.IP, error) { return []net.IP{net.ParseIP("10.0.0.1")}, nil }
	if _, _, err := d.download(context.Background(), "http://media.example/x.png"); !errors.Is(err, netguard.ErrPrivate) {
		t.Fatalf("private resolution: %v", err)
	}
	if _, _, err := d.download(context.Background(), "ftp://media.example/x.png"); err == nil {
		t.Fatal("non-http scheme accepted")
	}
}

func TestCachedMedia(t *testing.T) {
	var calls atomic.Int32
	fetch := cachedMedia(func(_ context.Context, url string) (string, string, error) {
		calls.Add(1)
		if strings.HasSuffix(url, "bad") {
			return "", "", errors.New("boom")
		}
		return "image/png", "QQ==", nil
	})
	for range 3 {
		if mt, b64, err := fetch(context.Background(), "https://a/x"); mt != "image/png" || b64 != "QQ==" || err != nil {
			t.Fatalf("%q %q %v", mt, b64, err)
		}
		if _, _, err := fetch(context.Background(), "https://a/bad"); err == nil {
			t.Fatal("cached failure lost")
		}
	}
	if n := calls.Load(); n != 2 {
		t.Fatalf("%d downloads, want one per URL", n)
	}
}

// A conversion to Gemini inlines downloaded media and cannot convert media
// Gemini does not take (CONVERT-MATRIX §9.2).
func TestMediaConversionToGemini(t *testing.T) {
	srv := mediaServer(t)
	conv, ok := convert.Default().Resolve("openai.chat", "gemini.generate")
	if !ok {
		t.Fatal("no chat -> gemini converter")
	}
	g := &Gateway{allowPrivate: true, lookupIP: netguard.DefaultLookup}
	fetch := cachedMedia(g.mediaDownloader(1 << 20).download)
	req := func(path string) []byte {
		return []byte(`{"model":"gemini-2.5-flash","messages":[{"role":"user","content":[` +
			`{"type":"image_url","image_url":{"url":"` + srv.URL + path + `"}}]}]}`)
	}
	_, out, err := conv.Prepare(req("/png"), convert.Options{Ctx: context.Background(), Fetch: fetch})
	if err != nil || !strings.Contains(string(out), `"inlineData":{"data":"`+base64.StdEncoding.EncodeToString(pngBytes)+`","mimeType":"image/png"}`) {
		t.Fatalf("inline: %s %v", out, err)
	}
	var re *convert.RequestError
	for path, want := range map[string]string{"/blob.heic": "", "/missing": "status 404"} {
		_, _, err := conv.Prepare(req(path), convert.Options{Ctx: context.Background(), Fetch: fetch})
		if want == "" {
			if err != nil {
				t.Errorf("%s: %v", path, err)
			}
			continue
		}
		if !errors.As(err, &re) || !strings.Contains(err.Error(), want) {
			t.Errorf("%s: %v", path, err)
		}
	}
	// A type Gemini does not take: the content sniffs as plain HTML.
	html := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("<html><body>hi</body></html>"))
	}))
	defer html.Close()
	_, _, err = conv.Prepare([]byte(`{"model":"gemini-2.5-flash","messages":[{"role":"user","content":[`+
		`{"type":"image_url","image_url":{"url":"`+html.URL+`/page"}}]}]}`), convert.Options{Ctx: context.Background(), Fetch: fetch})
	if !errors.As(err, &re) || !strings.Contains(err.Error(), `"text/html" is not supported`) {
		t.Fatalf("unsupported type: %v", err)
	}
	if mediaFetcher == nil {
		t.Fatal("the gateway gives conversions no fetcher")
	}
}
