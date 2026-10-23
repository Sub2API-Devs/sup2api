package engine

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// An unauthenticated request leaves no log: no directory, no headers (audit
// C7). The caller's key is still never written for an authenticated one.
func TestUnauthenticatedRequestLeavesNoLog(t *testing.T) {
	store, err := newRequestLogStore(t.TempDir())
	require.NoError(t, err)
	g := &Gateway{RequestMode: "build", Key: "gateway-key", CLIInfo: buildCLI, Runner: &Runner{}, RequestLogs: store, RequestLogDir: store.root, Slots: make(chan struct{}, 1)}
	for _, key := range []string{"", "wrong-key"} {
		r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		if key != "" {
			r.Header.Set("x-api-key", key)
		}
		out := httptest.NewRecorder()
		g.ServeHTTP(out, r)
		require.Equal(t, 401, out.Code)
		require.NotEmpty(t, out.Header().Get("request-id"))
	}
	entries, _ := os.ReadDir(store.root)
	require.Empty(t, entries, "an unauthenticated request created a log")
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[]}`))
	r.Header.Set("x-api-key", "gateway-key")
	out := httptest.NewRecorder()
	g.ServeHTTP(out, r)
	require.Equal(t, 400, out.Code)
	entries, _ = os.ReadDir(store.root)
	require.Len(t, entries, 1)
	headers, err := os.ReadFile(filepath.Join(store.root, entries[0].Name(), "request-headers.json"))
	require.NoError(t, err)
	require.NotContains(t, string(headers), "gateway-key")
}

// A request's log files are written under its own lock, never the account's
// (audit C7): a request keeps logging while the account's lock is held.
func TestRequestLogWritesDoNotTakeTheAccountLock(t *testing.T) {
	store, err := newRequestLogStore(t.TempDir())
	require.NoError(t, err)
	store.mu.Lock()
	store.level, store.fullUntil = logLevelFull, time.Now().Add(time.Hour)
	store.mu.Unlock()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r, "")
	require.NotEmpty(t, d.directory)
	store.mu.Lock()
	done := make(chan struct{})
	go func() {
		defer close(done)
		d.request([]byte(`{"model":"m","messages":[]}`), r.Header)
		d.save("build-components.json", []byte(`{}`))
		d.trace("event", Object{"n": 1})
		_, _ = out.Write([]byte("response"))
	}()
	select {
	case <-done:
	case <-time.After(5 * time.Second):
		t.Fatal("a log write waited for the account's lock")
	}
	store.mu.Unlock()
	d.finish()
	for _, name := range []string{"request.body", "build-components.json", "events.jsonl", "response.body", "metadata.json"} {
		_, err := os.Stat(filepath.Join(d.directory, name))
		require.NoError(t, err, name)
	}
	// Turning the logs off still removes a running request's files and stops
	// its writes.
	d = newRequestDiagnostic(w, r)
	d.store = store
	out = d.capture(w, r, "")
	directory := d.directory
	putLogs(t, store, `{"level":"off"}`)
	_, _ = out.Write([]byte("after off"))
	d.save("build-components.json", []byte(`{}`))
	d.finish()
	_, err = os.Stat(directory)
	require.True(t, os.IsNotExist(err), "a log written after the logs were turned off")
}

// The index is built in the background (audit C7): a request finished while
// the disk is read is listed, and logs turned off meanwhile drop the scan.
func TestRequestLogIndexBuildKeepsRequestsFinishedMeanwhile(t *testing.T) {
	store, err := newRequestLogStore(t.TempDir())
	require.NoError(t, err)
	old := viewerRequest(t, store, "rid-old", 200)
	store.waitIndex()
	meta, err := os.ReadFile(filepath.Join(store.root, old, "metadata.json"))
	require.NoError(t, err)

	building := func() *requestLogStore {
		s := &requestLogStore{root: store.root, enabled: true, level: logLevelSummary, active: map[*requestDiagnostic]bool{}}
		s.indexBuilding, s.indexPending, s.indexPruned = true, map[string]logEntry{}, map[string]bool{}
		s.indexReady = make(chan struct{})
		return s
	}
	s := building()
	s.mu.Lock()
	s.indexed("finished-meanwhile", meta)
	s.mu.Unlock()
	s.buildIndex()
	s.waitIndex()
	require.Contains(t, s.index, old, "the scan")
	require.Contains(t, s.index, "finished-meanwhile", "a request finished during the scan")
	require.Nil(t, s.indexPending)

	s = building()
	s.mu.Lock()
	s.index = map[string]logEntry{} // turned off during the scan
	s.mu.Unlock()
	s.buildIndex()
	require.Empty(t, s.index)
}

// The gateway reads the key comparison the Runtime made (audit C8): the key
// is compared once per request.
func TestGatewayReadsTheRuntimeAuthorization(t *testing.T) {
	g := &Gateway{RequestMode: "build", Key: "gateway-key", CLIInfo: buildCLI, Runner: &Runner{}, Slots: make(chan struct{}, 1)}
	r := httptest.NewRequest("POST", "/v1/other", nil)
	r.Header.Set("x-api-key", "gateway-key")
	out := httptest.NewRecorder()
	g.ServeHTTP(out, r.WithContext(withAuthorization(r.Context(), false)))
	require.Equal(t, 401, out.Code, "the Runtime's answer stands")
	r.Header.Set("x-api-key", "wrong")
	out = httptest.NewRecorder()
	g.ServeHTTP(out, r.WithContext(withAuthorization(r.Context(), true)))
	require.Equal(t, 404, out.Code, "the Runtime's answer stands")
	out = httptest.NewRecorder()
	g.ServeHTTP(out, r)
	require.Equal(t, 401, out.Code, "a Gateway on its own compares the key")
}
