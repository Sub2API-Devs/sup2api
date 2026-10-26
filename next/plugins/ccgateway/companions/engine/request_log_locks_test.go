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
	store := summaryLogStore(t, t.TempDir())
	g := &Gateway{RequestMode: "build", Key: "gateway-key", CLIInfo: buildCLI, Runner: &Runner{}, RequestLogs: store, Slots: make(chan struct{}, 1)}
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
	store.flush()
	entries, _ := os.ReadDir(store.root)
	require.Empty(t, entries, "an unauthenticated request created a log")
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[]}`))
	r.Header.Set("x-api-key", "gateway-key")
	out := httptest.NewRecorder()
	g.ServeHTTP(out, r)
	require.Equal(t, 400, out.Code)
	store.flush()
	entries, _ = os.ReadDir(store.root)
	require.Len(t, entries, 1)
	headers, err := os.ReadFile(filepath.Join(store.root, entries[0].Name(), "request-headers.json"))
	require.NoError(t, err)
	require.NotContains(t, string(headers), "gateway-key")
}

// A request's log files are written under its own lock, never the account's
// (audit C7): a request keeps logging while the account's lock is held.
func TestRequestLogWritesDoNotTakeTheAccountLock(t *testing.T) {
	store, err := openTestLogStore(t, t.TempDir())
	require.NoError(t, err)
	store.mu.Lock()
	store.level, store.fullUntil, store.enabled = logLevelFull, time.Now().Add(time.Hour), true
	store.mu.Unlock()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	require.NotEmpty(t, d.directory)
	store.mu.Lock()
	done := make(chan struct{})
	go func() {
		defer close(done)
		d.request(parseRequestBody([]byte(`{"model":"m","messages":[]}`)), r.Header)
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
	d.flushLogs()
	for _, name := range []string{"request.body", "build-components.json", "events.jsonl", "response.body", "metadata.json"} {
		_, err := os.Stat(filepath.Join(d.directory, name))
		require.NoError(t, err, name)
	}
	// Turning the logs off still removes a running request's files and stops
	// its writes.
	d = newRequestDiagnostic(w, r)
	d.store = store
	out = d.capture(w, r)
	directory := d.directory
	putLogs(t, store, `{"level":"off"}`)
	_, _ = out.Write([]byte("after off"))
	d.save("build-components.json", []byte(`{}`))
	d.finish()
	d.flushLogs()
	_, err = os.Stat(directory)
	require.True(t, os.IsNotExist(err), "a log written after the logs were turned off")
}

// Turning logs off and clearing content remove files without the account's
// lock (W6): a week of logs takes a while, and no request waits for it.
func TestRequestLogRemovalDoesNotHoldTheAccountLock(t *testing.T) {
	entered, release := make(chan string, 64), make(chan struct{})
	removeLogPath = func(path string) error {
		entered <- path
		<-release
		return os.RemoveAll(path)
	}
	t.Cleanup(func() { removeLogPath = os.RemoveAll })
	root := t.TempDir()
	store := fullLogStore(t, root)
	old := logRequest(t, store)
	_, err := os.Stat(filepath.Join(old, "request.body"))
	require.NoError(t, err)
	// A request that starts meanwhile is not held, and its content is not the
	// cleared one.
	unblocked := func(change string) (string, chan int) {
		t.Helper()
		done := make(chan int, 1)
		go func() {
			code, _ := putLogs(t, store, change)
			done <- code
		}()
		<-entered
		started := make(chan string)
		go func() { started <- logRequest(t, store) }()
		select {
		case directory := <-started:
			return directory, done
		case <-time.After(5 * time.Second):
			close(release)
			t.Fatal("a request waited for", change)
		}
		return "", done
	}

	fresh, done := unblocked(`{"clear_full":true}`)
	close(release)
	require.Equal(t, 200, <-done)
	_, err = os.Stat(filepath.Join(old, "request.body"))
	require.True(t, os.IsNotExist(err), "the content logged before was cleared")
	_, err = os.Stat(filepath.Join(old, "metadata.json"))
	require.NoError(t, err, "the summary stays")
	_, err = os.Stat(filepath.Join(fresh, "request.body"))
	require.NoError(t, err, "a request logged after the clear keeps its content")

	// Clearing removed one file at a time: the next change must wait for its
	// own removal, not one of these.
	for len(entered) > 0 {
		<-entered
	}
	release = make(chan struct{})
	off, done := unblocked(`{"level":"off"}`)
	require.Empty(t, off, "logs off: the new request is not logged")
	close(release)
	require.Equal(t, 200, <-done)
	_, err = os.Stat(store.root)
	require.True(t, os.IsNotExist(err))
	aside, _ := filepath.Glob(store.root + discardedSuffix + "*")
	require.Empty(t, aside, "the logs moved aside are removed")
}

// The index is built in the background (audit C7): a request finished while
// the disk is read is listed, and logs turned off meanwhile drop the scan.
func TestRequestLogIndexBuildKeepsRequestsFinishedMeanwhile(t *testing.T) {
	store := summaryLogStore(t, t.TempDir())
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
