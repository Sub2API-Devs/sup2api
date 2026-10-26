package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// The request log never waits (REQUEST-LOG-ASYNC-DESIGN.md §2, §7): with its
// writer stuck, its queue full and its bytes over the limit, a request still
// does everything at once, the client gets every byte, and the log says what
// it lost once the writer goes on.
func TestRequestLogHandOverNeverWaits(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	store.sink.close(logSinkDrain)
	store.sink = newLogSink(4, 32<<10)
	release := stallSink(t, store.sink)

	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	chunk := sse("message_start", sseStart)
	started := time.Now()
	out := d.capture(w, r)
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[{"role":"user","content":"`+strings.Repeat("x", 64<<10)+`"}]}`)), r.Header)
	d.commandStarted("build", []byte(`{}`))
	for i := range 100 {
		d.trace("event", Object{"i": i})
	}
	out.Header().Set("Content-Type", "text/event-stream")
	for range 100 {
		_, _ = out.Write([]byte(chunk))
	}
	d.finish()
	require.Less(t, time.Since(started), time.Second, "the request waited for its log")
	require.Equal(t, strings.Repeat(chunk, 100), w.Body.String())
	d.mu.Lock()
	require.Equal(t, "partial", d.fields["log_status"])
	require.Positive(t, d.droppedBytes)
	require.Equal(t, responseCaptureDropped, d.responseStop)
	d.mu.Unlock()

	release()
	store.flush()
	metadata := readMetadata(t, d.directory)
	require.Equal(t, "partial", metadata["log_status"])
	require.Positive(t, metadata["log_dropped_bytes"])
	require.Positive(t, metadata["log_dropped_writes"])
	require.Equal(t, responseCaptureDropped, metadata["response_capture"])
	events, err := os.ReadFile(filepath.Join(d.directory, "events.jsonl"))
	require.NoError(t, err)
	require.Contains(t, string(events), `"event":"log_dropped"`)
	require.Len(t, listLogs(t, store, `{}`).Items, 1, "the completion is never dropped")
	store.mu.Lock()
	require.Empty(t, store.active)
	store.mu.Unlock()
	require.Zero(t, store.sink.inflight.Load(), "the bytes in flight are all given back")
}

// The client gets the same status, headers and bytes with no log, a full log,
// and a full log whose writer is stuck.
func TestRequestLogLeavesTheAnswerUnchanged(t *testing.T) {
	run := func(store *requestLogStore) (int, http.Header, string) {
		g, _ := upstreamGateway(t, store, true, nil)
		request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(upstreamTestBody))
		request.Header.Set("x-api-key", "fixture")
		request.Header.Set("X-Request-ID", "rid-same")
		response := httptest.NewRecorder()
		g.ServeHTTP(response, request)
		return response.Code, response.Header(), response.Body.String()
	}
	code, header, body := run(nil)
	require.Equal(t, 200, code, body)

	full := fullLogStore(t, t.TempDir())
	fullCode, fullHeader, fullBody := run(full)
	require.Equal(t, code, fullCode)
	require.Equal(t, header, fullHeader)
	require.Equal(t, body, fullBody)

	stuck := fullLogStore(t, t.TempDir())
	release := stallSink(t, stuck.sink)
	stuckCode, stuckHeader, stuckBody := run(stuck)
	require.Equal(t, code, stuckCode)
	require.Equal(t, header, stuckHeader)
	require.Equal(t, body, stuckBody)
	release()

	// Both logs hold what the client got.
	for _, store := range []*requestLogStore{full, stuck} {
		store.flush()
		dirs := logDirectories(t, store)
		require.Len(t, dirs, 1)
		dir := filepath.Join(store.root, dirs[0])
		// The fake CLI's message_start carries no message: the stream is kept raw.
		raw, err := os.ReadFile(filepath.Join(dir, responseBodyFile))
		require.NoError(t, err)
		require.Equal(t, body, string(raw))
		m := readMetadata(t, dir)
		require.Equal(t, false, m["response_assembled"])
		require.Equal(t, true, m["upstream_captured"])
		_, err = os.Stat(filepath.Join(dir, upstreamBodyFile))
		require.NoError(t, err)
	}
}

// A request's files land before its metadata, which is written last.
func TestRequestLogCompletionWritesMetadataLast(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	release := stallSink(t, store.sink)
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	var mu sync.Mutex
	var order []string
	hook := func(dir, name string) {
		if dir == d.directory {
			mu.Lock()
			order = append(order, name)
			mu.Unlock()
		}
	}
	logFileWrittenHook.Store(&hook)
	t.Cleanup(func() { logFileWrittenHook.Store(nil) })
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[]}`)), r.Header)
	d.commandStarted("build", []byte(`{"envelope":true}`))
	out.Header().Set("Content-Type", "application/json")
	_, _ = out.Write([]byte(`{"type":"message","content":[]}`))
	d.finish()
	release()
	store.flush()
	mu.Lock()
	defer mu.Unlock()
	require.Equal(t, "request-headers.json", order[0])
	require.Equal(t, "metadata.json", order[len(order)-1], order)
	for _, name := range []string{"request.body", "build-components.json", "events.jsonl", "response-headers.json", responseJSONFile} {
		require.Contains(t, order[:len(order)-1], name)
	}
	require.Less(t, slices.Index(order, "response-headers.json"), slices.Index(order, responseJSONFile))
	raw, err := os.ReadFile(filepath.Join(d.directory, responseJSONFile))
	require.NoError(t, err)
	require.Equal(t, `{"type":"message","content":[]}`, string(raw))
	m := readMetadata(t, d.directory)
	require.Equal(t, true, m["response_assembled"])
	require.NotContains(t, m, "response_events", "a JSON answer has no events")
}

// Clearing every log while a request's writes wait: none of them lands, the
// directory is not made again, and logging goes on.
func TestRequestLogClearAllWhileWritesWait(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	release := stallSink(t, store.sink)
	d := queuedRequest(t, store)
	code, _ := putLogs(t, store, `{"clear_all":true}`)
	require.Equal(t, 200, code, "clearing waited for the writer")
	release()
	store.flush()
	_, err := os.Stat(d.directory)
	require.True(t, os.IsNotExist(err), "a waiting write made the log again")
	require.Empty(t, listLogs(t, store, `{}`).Items)
	store.mu.Lock()
	require.Empty(t, store.active)
	store.mu.Unlock()
	require.Len(t, logDirectories(t, store), 0)
	finishLog(queuedRequest(t, store))
	require.Len(t, listLogs(t, store, `{}`).Items, 1, "logging stopped")
}

// Clearing the content while a request's writes wait: its content is not
// written, its summary is.
func TestRequestLogClearFullWhileWritesWait(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	release := stallSink(t, store.sink)
	d := queuedRequest(t, store)
	code, _ := putLogs(t, store, `{"clear_full":true}`)
	require.Equal(t, 200, code)
	release()
	store.flush()
	for _, name := range []string{"request.body", "build-components.json", responseJSONFile, responseBodyFile} {
		_, err := os.Stat(filepath.Join(d.directory, name))
		require.True(t, os.IsNotExist(err), name)
	}
	for _, name := range []string{"metadata.json", "events.jsonl", "request-headers.json", "response-headers.json"} {
		_, err := os.Stat(filepath.Join(d.directory, name))
		require.NoError(t, err, name)
	}
	list := listLogs(t, store, `{}`)
	require.Len(t, list.Items, 1)
	require.False(t, list.Items[0].HasContent)
}

// queuedRequest runs a whole request against store and returns it finished;
// its log is written when the store's writer gets to it.
func queuedRequest(t *testing.T, store *requestLogStore) *requestDiagnostic {
	t.Helper()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	require.NotEmpty(t, d.directory)
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[{"role":"user","content":"`+privateMarker+`"}]}`)), r.Header)
	d.commandStarted("build", []byte(privateMarker))
	out.Header().Set("Content-Type", "application/json")
	_, _ = out.Write([]byte(`{"text":"` + privateMarker + `"}`))
	d.finish()
	return d
}

// A stopping Worker gives its writer a bounded time; nothing is taken after.
func TestRequestLogSinkCloseIsBounded(t *testing.T) {
	s := newLogSink(8, 1<<20)
	release := stallSink(t, s)
	started := time.Now()
	s.close(100 * time.Millisecond)
	require.Less(t, time.Since(started), 2*time.Second, "close waited for a stuck write")
	require.False(t, s.submit(0, func() int64 { return 0 }))
	release()

	var ran atomic.Int32
	s = newLogSink(8, 1<<20)
	for range 5 {
		require.True(t, s.submit(10, func() int64 { ran.Add(1); return 0 }))
	}
	s.close(5 * time.Second)
	require.EqualValues(t, 5, ran.Load(), "the queue is drained on close")

	// A request after its store stopped is answered as ever.
	store := fullLogStore(t, t.TempDir())
	store.close()
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	_, _ = out.Write([]byte("answer"))
	d.finish()
	require.Equal(t, "answer", w.Body.String())
}

// A write that panics is the log's alone: the writer goes on and gives its
// bytes back.
func TestRequestLogSinkSurvivesPanics(t *testing.T) {
	s := newLogSink(8, 1<<20)
	t.Cleanup(func() { s.close(logSinkDrain) })
	require.True(t, s.submit(100, func() int64 { panic("boom") }))
	ran := false
	require.True(t, s.submit(0, func() int64 { ran = true; return 0 }))
	s.flush()
	require.True(t, ran)
	require.EqualValues(t, 1, s.panics.Load())
	require.Zero(t, s.inflight.Load())
}

// A prune leaves a running request's log alone; staged sent requests left
// behind are removed after a while.
func TestRequestLogPruneLeavesRunningRequests(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	_ = d.capture(w, r)
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[]}`)), r.Header)
	store.flush()
	store.prune()
	_, err := os.Stat(filepath.Join(d.directory, "request.body"))
	require.NoError(t, err, "a running request's log was pruned")
	finishLog(d)
	require.Len(t, listLogs(t, store, `{}`).Items, 1)

	old := time.Now().Add(-time.Hour)
	stale, fresh := filepath.Join(store.staging, "stale"), filepath.Join(store.staging, "fresh")
	require.NoError(t, os.WriteFile(stale, []byte("x"), 0600))
	require.NoError(t, os.WriteFile(fresh, []byte("x"), 0600))
	require.NoError(t, os.Chtimes(stale, old, old))
	store.prune()
	_, err = os.Stat(stale)
	require.True(t, os.IsNotExist(err))
	_, err = os.Stat(fresh)
	require.NoError(t, err)
}

// Without its staging directory the log cannot keep the sent request: the
// answer is the same and the log says it missed it.
func TestUpstreamCaptureWithoutStaging(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	g, _ := upstreamGateway(t, store, true, nil)
	require.NoError(t, os.RemoveAll(store.staging))
	response, dir := upstreamPost(t, g, upstreamTestBody, nil)
	require.Equal(t, 200, response.Code, response.Body.String())
	m := upstreamMetadata(t, dir)
	require.Equal(t, false, m["upstream_captured"])
	events, _ := os.ReadFile(filepath.Join(dir, "events.jsonl"))
	require.Contains(t, string(events), `"reason":"unreadable"`)
	for _, name := range []string{upstreamRequestFile, upstreamBodyFile} {
		_, err := os.Stat(filepath.Join(dir, name))
		require.True(t, os.IsNotExist(err), name)
	}
	request, err := os.ReadFile(filepath.Join(dir, "request.body"))
	require.NoError(t, err)
	require.True(t, bytes.Equal(request, []byte(upstreamTestBody)))
	var record Object
	raw, _ := os.ReadFile(filepath.Join(dir, "metadata.json"))
	require.NoError(t, json.Unmarshal(raw, &record))
	require.Equal(t, "complete", record["log_status"])
}
