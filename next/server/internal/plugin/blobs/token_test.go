package blobs

import (
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// The shell store authenticates every request to the management socket
// with the updater token; the shell refuses requests without it.
func TestShellSendsUpdaterToken(t *testing.T) {
	token := strings.Repeat("0f", 32)
	var mu sync.Mutex
	stored := map[string][]byte{}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer "+token {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		sum := strings.TrimPrefix(r.URL.Path, "/system/plugin-blobs/")
		mu.Lock()
		defer mu.Unlock()
		switch r.Method {
		case http.MethodPut:
			b, _ := io.ReadAll(r.Body)
			stored[sum] = b
			w.WriteHeader(http.StatusNoContent)
		case http.MethodGet:
			b, ok := stored[sum]
			if !ok {
				http.NotFound(w, r)
				return
			}
			_, _ = w.Write(b)
		}
	}))
	t.Cleanup(srv.Close)
	addr := strings.TrimPrefix(srv.URL, "http://")
	dial := func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "tcp", addr)
	}
	ctx := context.Background()
	data := []byte("package bytes")

	s := newShell(dial, token, 1<<20)
	if err := s.Put(ctx, sumOf(data), data); err != nil {
		t.Fatalf("put with token: %v", err)
	}
	if got, err := s.Get(ctx, sumOf(data)); err != nil || string(got) != string(data) {
		t.Fatalf("get with token: %q %v", got, err)
	}
	for _, bad := range []string{"", strings.Repeat("1f", 32)} {
		s := newShell(dial, bad, 1<<20)
		if err := s.Put(ctx, sumOf(data), data); err == nil || !strings.Contains(err.Error(), "401") {
			t.Fatalf("put with token %q: %v", bad, err)
		}
		if _, err := s.Get(ctx, sumOf(data)); err == nil || !strings.Contains(err.Error(), "401") {
			t.Fatalf("get with token %q: %v", bad, err)
		}
	}
}
