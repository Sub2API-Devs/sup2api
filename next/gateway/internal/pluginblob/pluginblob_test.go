package pluginblob

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/gateway/internal/peer"
)

func digest(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }

// cluster wires a follower to a primary the way the shells are wired: the
// follower's client reaches only the primary's peer handler.
func cluster(t *testing.T) (primary, follower *Service) {
	t.Helper()
	primary = &Service{Store: &Store{Dir: t.TempDir()}, Primary: func(context.Context) (bool, string, error) { return true, "", nil }}
	srv := httptest.NewServer(asNode("follower", primary.Peer()))
	t.Cleanup(srv.Close)
	follower = &Service{Store: &Store{Dir: t.TempDir()}, Client: srv.Client(),
		Primary: func(context.Context) (bool, string, error) { return false, srv.URL, nil }}
	return primary, follower
}

// asNode stands in for peer.Middleware: the request is authenticated as node.
func asNode(node string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h.ServeHTTP(w, r.WithContext(peer.WithIdentity(r.Context(), peer.Identity{Cluster: "test", NodeID: node, BootID: "boot"})))
	})
}

func call(t *testing.T, h http.Handler, method, sum string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	h.ServeHTTP(w, httptest.NewRequest(method, "/system/plugin-blobs/"+sum, bytes.NewReader(body)))
	return w
}

func TestFollowerUploadReachesThePrimaryBeforeItReturns(t *testing.T) {
	primary, follower := cluster(t)
	data := []byte("uploaded on a follower")
	if w := call(t, follower.Local(), http.MethodPut, digest(data), data); w.Code != http.StatusNoContent {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	if !primary.Store.Has(digest(data)) {
		t.Fatal("upload acknowledged before the primary stored it")
	}
	// Another follower fetches it from the primary.
	_, other := cluster(t)
	other.Primary = follower.Primary
	other.Client = follower.Client
	w := call(t, other.Local(), http.MethodGet, digest(data), nil)
	if w.Code != 200 || w.Body.String() != string(data) || !other.Store.Has(digest(data)) {
		t.Fatalf("follower fetch: %d %q", w.Code, w.Body)
	}
}

func TestPrimaryAndFollowerReportMissingAndRejectBadBytes(t *testing.T) {
	primary, follower := cluster(t)
	missing := digest([]byte("never uploaded"))
	for name, s := range map[string]*Service{"primary": primary, "follower": follower} {
		if w := call(t, s.Local(), http.MethodGet, missing, nil); w.Code != http.StatusNotFound {
			t.Fatalf("%s missing package: %d", name, w.Code)
		}
	}
	if w := call(t, follower.Local(), http.MethodPut, missing, []byte("other bytes")); w.Code != http.StatusBadRequest {
		t.Fatalf("mismatched upload: %d", w.Code)
	}
	if primary.Store.Has(missing) || follower.Store.Has(missing) {
		t.Fatal("mismatched bytes were stored")
	}
	// A primary that serves different bytes cannot poison the follower.
	data := []byte("real")
	sum := digest(data)
	if err := os.MkdirAll(filepath.Join(primary.Store.Dir, sum[:2]), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(primary.Store.Dir, sum[:2], sum), []byte("fake"), 0o600); err != nil {
		t.Fatal(err)
	}
	if w := call(t, follower.Local(), http.MethodGet, sum, nil); w.Code == 200 || follower.Store.Has(sum) {
		t.Fatalf("tampered primary copy accepted: %d", w.Code)
	}
	if w := call(t, follower.Local(), http.MethodGet, "../../etc/passwd", nil); w.Code != http.StatusNotFound {
		t.Fatalf("path escape: %d", w.Code)
	}
}

func TestStoreLimitsSizeAndCollectsUnreferenced(t *testing.T) {
	s := &Store{Dir: t.TempDir(), MaxBytes: 4}
	big := []byte("too large")
	if err := s.Write(digest(big), bytes.NewReader(big)); err == nil || !strings.Contains(err.Error(), "exceeds") {
		t.Fatalf("oversized package: %v", err)
	}
	keep, drop, fresh := []byte("keep"), []byte("drop"), []byte("new")
	for _, b := range [][]byte{keep, drop, fresh} {
		if err := s.Write(digest(b), bytes.NewReader(b)); err != nil {
			t.Fatal(err)
		}
	}
	old := time.Now().Add(-2 * time.Hour)
	for _, b := range [][]byte{keep, drop} {
		if err := os.Chtimes(s.path(digest(b)), old, old); err != nil {
			t.Fatal(err)
		}
	}
	n, err := s.GC(map[string]bool{digest(keep): true}, time.Hour)
	if err != nil || n != 1 || !s.Has(digest(keep)) || s.Has(digest(drop)) || !s.Has(digest(fresh)) {
		t.Fatalf("gc removed %d (%v): keep=%v drop=%v fresh=%v", n, err, s.Has(digest(keep)), s.Has(digest(drop)), s.Has(digest(fresh)))
	}
}

func TestPeerUploadsRequireIdentityLengthAndStoreRoom(t *testing.T) {
	primary := &Service{Store: &Store{Dir: t.TempDir(), MaxBytes: 16, MaxTotalBytes: 20}, Primary: func(context.Context) (bool, string, error) { return true, "", nil }}
	put := func(h http.Handler, data []byte, length int64) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		q := httptest.NewRequest(http.MethodPut, "/internal/plugin-blobs/"+digest(data), bytes.NewReader(data))
		q.ContentLength = length
		h.ServeHTTP(w, q)
		return w
	}
	first := []byte("0123456789ab") // 12 bytes
	if w := put(primary.Peer(), first, int64(len(first))); w.Code != 401 {
		t.Fatalf("unauthenticated upload: %d", w.Code)
	}
	node := asNode("b", primary.Peer())
	if w := put(node, first, -1); w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("undeclared length: %d", w.Code)
	}
	if w := put(node, first, 1<<20); w.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("length above the package limit: %d", w.Code)
	}
	if w := put(node, first, int64(len(first))); w.Code != http.StatusNoContent {
		t.Fatalf("upload: %d %s", w.Code, w.Body)
	}
	// Storing the same package again needs no room.
	if w := put(node, first, int64(len(first))); w.Code != http.StatusNoContent {
		t.Fatalf("re-upload: %d %s", w.Code, w.Body)
	}
	second := []byte("second-pkg") // 10 bytes: 22 > 20 total
	if w := put(node, second, int64(len(second))); w.Code != http.StatusInsufficientStorage || primary.Store.Has(digest(second)) {
		t.Fatalf("store full: %d stored=%v", w.Code, primary.Store.Has(digest(second)))
	}
	if entries, _ := os.ReadDir(filepath.Join(primary.Store.Dir, digest(second)[:2])); len(entries) != 0 {
		t.Fatal("refused upload left a temporary file")
	}
	small := []byte("tiny") // 4 bytes: fits in the remaining 8
	if w := put(node, small, int64(len(small))); w.Code != http.StatusNoContent {
		t.Fatalf("upload within room: %d %s", w.Code, w.Body)
	}
}

func TestPeerUploadsPerNodeAreBounded(t *testing.T) {
	primary := &Service{Store: &Store{Dir: t.TempDir()}, Primary: func(context.Context) (bool, string, error) { return true, "", nil }}
	node := asNode("b", primary.Peer())
	started := make(chan struct{}, uploadsPerNode)
	finish := make(chan struct{})
	var wg sync.WaitGroup
	for i := 0; i < uploadsPerNode; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			data := []byte(strings.Repeat("x", 8+i))
			pr, pw := io.Pipe()
			q := httptest.NewRequest(http.MethodPut, "/internal/plugin-blobs/"+digest(data), pr)
			q.ContentLength = int64(len(data))
			go func() {
				started <- struct{}{}
				<-finish
				pw.Write(data)
				pw.Close()
			}()
			w := httptest.NewRecorder()
			node.ServeHTTP(w, q)
			if w.Code != http.StatusNoContent {
				t.Errorf("slow upload %d: %d %s", i, w.Code, w.Body)
			}
		}(i)
	}
	for i := 0; i < uploadsPerNode; i++ {
		<-started
	}
	extra := []byte("one more")
	w := httptest.NewRecorder()
	q := httptest.NewRequest(http.MethodPut, "/internal/plugin-blobs/"+digest(extra), bytes.NewReader(extra))
	q.ContentLength = int64(len(extra))
	node.ServeHTTP(w, q)
	if w.Code != http.StatusTooManyRequests {
		t.Fatalf("upload beyond the per-node bound: %d", w.Code)
	}
	// Another node is not affected by this node's uploads.
	w = httptest.NewRecorder()
	q = httptest.NewRequest(http.MethodPut, "/internal/plugin-blobs/"+digest(extra), bytes.NewReader(extra))
	q.ContentLength = int64(len(extra))
	asNode("c", primary.Peer()).ServeHTTP(w, q)
	if w.Code != http.StatusNoContent {
		t.Fatalf("other node's upload: %d %s", w.Code, w.Body)
	}
	close(finish)
	wg.Wait()
	if _, ok := primary.admitUpload("b"); !ok {
		t.Fatal("slots were not released")
	}
}
