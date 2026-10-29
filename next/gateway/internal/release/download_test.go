package release

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// trickle writes b in small flushed chunks, one per gap.
func trickle(w http.ResponseWriter, r *http.Request, b []byte, chunk int, gap time.Duration) {
	for len(b) > 0 {
		n := min(chunk, len(b))
		if _, err := w.Write(b[:n]); err != nil {
			return
		}
		w.(http.Flusher).Flush()
		b = b[n:]
		select {
		case <-r.Context().Done():
			return
		case <-time.After(gap):
		}
	}
}

func TestBundleDownloadOutlivesClientTimeoutWhileBytesArrive(t *testing.T) {
	_, bundle, _ := fixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		trickle(w, r, bundle, 8, 25*time.Millisecond)
	}))
	defer server.Close()
	// The client's own total Timeout stands in for the old fixed 10 minutes.
	client := &http.Client{Timeout: 150 * time.Millisecond}
	m := Manager{AllowHTTP: true, HeaderTimeout: time.Second, IdleTimeout: 300 * time.Millisecond}
	start := time.Now()
	r, err := m.download(context.Background(), server.URL, client)
	if err != nil {
		t.Fatal(err)
	}
	got, err := io.ReadAll(r)
	r.Close()
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, bundle) {
		t.Fatalf("got %d bytes, want %d", len(got), len(bundle))
	}
	if took := time.Since(start); took <= client.Timeout {
		t.Fatalf("transfer took %s, not longer than the client timeout; test proves nothing", took)
	}
	if client.Timeout != 150*time.Millisecond {
		t.Fatal("download mutated the caller's client")
	}
}

func TestPrepareFailsAfterIdleTimeoutWhenDownloadStalls(t *testing.T) {
	s, bundle, keys := fixture(t)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write(bundle[:len(bundle)/2])
		w.(http.Flusher).Flush()
		<-r.Context().Done()
	}))
	defer server.Close()
	m := Manager{Root: t.TempDir(), TrustedKeys: keys, OS: "linux", Arch: "amd64", RuntimeABI: "linux-static-v1", AllowHTTP: true, IdleTimeout: 200 * time.Millisecond}
	start := time.Now()
	_, err := m.Prepare(context.Background(), s, server.URL)
	if !errors.Is(err, errStalled) {
		t.Fatalf("stalled download returned %v", err)
	}
	if took := time.Since(start); took > 3*time.Second {
		t.Fatalf("stall detected after %s", took)
	}
	if _, e := m.Current(); e == nil {
		t.Fatal("stalled download changed current")
	}
}

func TestBundleDownloadFailsWithoutResponseHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { <-r.Context().Done() }))
	defer server.Close()
	m := Manager{AllowHTTP: true, HeaderTimeout: 150 * time.Millisecond}
	start := time.Now()
	if _, err := m.download(context.Background(), server.URL, nil); !errors.Is(err, errNoResponse) {
		t.Fatalf("silent server returned %v", err)
	}
	if took := time.Since(start); took > 3*time.Second {
		t.Fatalf("header timeout fired after %s", took)
	}
}

func TestManifestKeepsTotalDeadlineEvenWhileBytesArrive(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		trickle(w, r, bytes.Repeat([]byte(" "), 1<<20), 1, 10*time.Millisecond)
	}))
	defer server.Close()
	m := Manager{AllowHTTP: true, ManifestTimeout: 200 * time.Millisecond, IdleTimeout: time.Hour}
	start := time.Now()
	if _, err := m.FetchManifest(context.Background(), server.URL); err == nil {
		t.Fatal("endless manifest accepted")
	}
	if took := time.Since(start); took > 3*time.Second {
		t.Fatalf("manifest deadline fired after %s", took)
	}
	if DefaultManifestTimeout > time.Minute {
		t.Fatalf("manifest default %s is not short", DefaultManifestTimeout)
	}
}
