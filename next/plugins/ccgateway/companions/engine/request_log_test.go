package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// fullLogStore is a store in root at the full level for an hour: a test's
// request logs keep their content.
func fullLogStore(t *testing.T, root string) *requestLogStore {
	t.Helper()
	s, err := openTestLogStore(t, root)
	if err != nil {
		t.Fatal(err)
	}
	s.mu.Lock()
	s.level, s.fullUntil, s.enabled = logLevelFull, time.Now().Add(time.Hour), true
	s.mu.Unlock()
	return s
}

// loggedRequest is a request diagnostic logging into a full-level store.
func loggedRequest(t *testing.T, w http.ResponseWriter, r *http.Request) (*requestDiagnostic, http.ResponseWriter) {
	t.Helper()
	d := newRequestDiagnostic(w, r)
	d.store = fullLogStore(t, t.TempDir())
	return d, d.capture(w, r)
}

func TestFullRequestLogsIncludeRejectedRequestAndResponse(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	root := store.root
	v := basic()
	v["messages"].([]any)[1].(Object)["role"] = "developer"
	body, _ := json.Marshal(v)
	r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(body))
	r.Header.Set("Authorization", "Bearer secret-test-key")
	r.Header.Set("Cookie", "session=secret-cookie")
	w := httptest.NewRecorder()
	g := &Gateway{RequestMode: "build", CLIInfo: buildCLI, Runner: &Runner{}, RequestLogs: store, Slots: make(chan struct{}, 1)}
	g.ServeHTTP(w, r)
	store.flush()
	entries, _ := os.ReadDir(root)
	if len(entries) != 1 || w.Code != 400 || w.Header().Get("request-id") == "" {
		t.Fatalf("missing rejected request log: %d %v", w.Code, entries)
	}
	dir := filepath.Join(root, entries[0].Name())
	request, _ := os.ReadFile(filepath.Join(dir, "request.body"))
	// A JSON answer is kept as it is (REQUEST-LOG-ASYNC-DESIGN.md §4).
	response, _ := os.ReadFile(filepath.Join(dir, responseJSONFile))
	if !bytes.Equal(request, body) || !bytes.Equal(response, w.Body.Bytes()) {
		t.Fatal("request or response differs from wire data")
	}
	h, _ := os.ReadFile(filepath.Join(dir, "request-headers.json"))
	if strings.Contains(string(h), "secret-test-key") || strings.Contains(string(h), "secret-cookie") {
		t.Fatal("credentials in headers")
	}
	b, _ := os.ReadFile(filepath.Join(dir, "metadata.json"))
	var m Object
	if json.Unmarshal(b, &m) != nil || m["stage"] != "admission" || m["request_id"] != w.Header().Get("request-id") || m["event"] != "request_finished" {
		t.Fatalf("wrong diagnostic metadata: %s", b)
	}
}

// The stream reaches the client as it was written and flushed; the log keeps
// the one Messages response it carried (REQUEST-LOG-ASYNC-DESIGN.md §4), not
// the raw stream.
func TestRequestLogCapturePreservesStreamingFlush(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d, out := loggedRequest(t, w, r)
	out.Header().Set("Content-Type", "text/event-stream")
	first := "event: message_start\ndata: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"type\":\"message\",\"role\":\"assistant\",\"content\":[],\"usage\":{\"input_tokens\":3}}}\n\n"
	_, _ = out.Write([]byte(first))
	if err := http.NewResponseController(out).Flush(); err != nil || !w.Flushed {
		t.Fatal("stream flush broken", err)
	}
	rest := "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n" +
		"event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"hi\"}}\n\n" +
		"event: content_block_stop\ndata: {\"type\":\"content_block_stop\",\"index\":0}\n\n" +
		"event: message_delta\ndata: {\"type\":\"message_delta\",\"delta\":{\"stop_reason\":\"end_turn\"},\"usage\":{\"output_tokens\":1}}\n\n" +
		"event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
	_, _ = out.Write([]byte(rest))
	finishLog(d)
	if w.Body.String() != first+rest {
		t.Fatal("stream changed on its way to the client")
	}
	b, err := os.ReadFile(filepath.Join(d.directory, responseJSONFile))
	if err != nil {
		t.Fatal(err)
	}
	want := `{"content":[{"text":"hi","type":"text"}],"id":"msg_1","role":"assistant","stop_reason":"end_turn","type":"message","usage":{"input_tokens":3,"output_tokens":1}}`
	if string(b) != want {
		t.Fatalf("stream not assembled: %s", b)
	}
	if _, err := os.Stat(filepath.Join(d.directory, responseBodyFile)); !os.IsNotExist(err) {
		t.Fatal("the raw stream was kept")
	}
	metadata, _ := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	var record Object
	if json.Unmarshal(metadata, &record) != nil || record["response_assembled"] != true || record["response_events"] != float64(6) || record["response_capture"] != "complete" {
		t.Fatalf("response metadata: %s", metadata)
	}
}

func TestRequestLogRetentionSkipsActiveAndUnrelatedDirectories(t *testing.T) {
	root := t.TempDir()
	completed := filepath.Join(root, uuid())
	active := filepath.Join(root, uuid())
	unrelated := filepath.Join(root, "unrelated")
	for _, p := range []string{completed, active, unrelated} {
		_ = os.Mkdir(p, 0700)
	}
	meta := filepath.Join(completed, "metadata.json")
	_ = os.WriteFile(meta, []byte("{}"), 0600)
	_ = os.WriteFile(filepath.Join(completed, "request.body"), []byte("content"), 0600)
	// After a day the content is gone and the summary stays; after a week, all.
	old := time.Now().Add(-25 * time.Hour)
	_ = os.Chtimes(meta, old, old)
	pruneRequestLogs(root)
	if _, err := os.Stat(filepath.Join(completed, "request.body")); !os.IsNotExist(err) {
		t.Fatal("expired content retained")
	}
	if _, err := os.Stat(meta); err != nil {
		t.Fatal("summary removed with the content")
	}
	old = time.Now().Add(-8 * 24 * time.Hour)
	_ = os.Chtimes(meta, old, old)
	pruneRequestLogs(root)
	if _, err := os.Stat(completed); !os.IsNotExist(err) {
		t.Fatal("expired log retained")
	}
	for _, p := range []string{active, unrelated} {
		if _, err := os.Stat(p); err != nil {
			t.Fatal("active or unrelated directory removed")
		}
	}
}

func TestRequestLogDisablePurgesAndOverflowRemainsQueryable(t *testing.T) {
	root := t.TempDir()
	dir := filepath.Join(root, "request-logs")
	_ = os.MkdirAll(dir, 0700)
	_ = os.WriteFile(filepath.Join(dir, "old.body"), []byte("private"), 0600)
	if err := os.WriteFile(filepath.Join(root, "request-logs.disabled"), []byte("disabled"), 0600); err != nil {
		t.Fatal(err)
	}
	store, err := openTestLogStore(t, root)
	if err != nil || store.enabled || store.level != logLevelOff {
		t.Fatal(store, err)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatal("disabled logs retained")
	}
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	w := httptest.NewRecorder()
	d, out := loggedRequest(t, w, r)
	d.save("request.body", []byte("private"))
	d.bytes = 64 << 20
	_, _ = out.Write([]byte("response"))
	d.finish()
	d.flushLogs()
	entries, _ := os.ReadDir(d.store.root)
	if len(entries) != 1 || w.Body.String() != "response" {
		t.Fatal("overflow lost record or broke response")
	}
	metadata, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	if err != nil {
		t.Fatal(err)
	}
	var record Object
	if err := json.Unmarshal(metadata, &record); err != nil || record["log_status"] != "truncated" || record["event"] != "request_finished" {
		t.Fatalf("incomplete log not identified: %s, %v", metadata, err)
	}
	d.save("later.body", []byte("must not extend payloads"))
	if _, err := os.Stat(filepath.Join(d.directory, "later.body")); !os.IsNotExist(err) {
		t.Fatal("overflow capture continued")
	}
}

func TestRequestLogLiveDisableClearsActiveAndPersists(t *testing.T) {
	root := t.TempDir()
	store := fullLogStore(t, root)
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	d.save("request.body", []byte("private"))
	_, _ = out.Write([]byte("before"))
	d.save("upstream-request-test.body", []byte("upstream private"))
	control := httptest.NewRecorder()
	store.serve(control, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(`{"enabled":false}`)))
	if control.Code != 200 {
		t.Fatal(control.Body.String())
	}
	_, _ = out.Write([]byte("after"))
	d.save("upstream-request-after.body", []byte("must not persist"))
	d.finish()
	d.flushLogs()
	if _, err := os.Stat(store.root); !os.IsNotExist(err) {
		t.Fatal("active log recreated after disable")
	}
	if saved, err := openTestLogStore(t, root); err != nil || saved.enabled {
		t.Fatal("disable not persisted", err)
	}
	if _, err := os.Stat(filepath.Join(root, "request-logs.disabled")); err != nil {
		t.Fatal("an older Worker would not see the disable", err)
	}
	if w.Body.String() != "beforeafter" {
		t.Fatal("disable interrupted response")
	}
}

func TestRequestLogOverflowStreamAndLimits(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	_, _ = out.Write([]byte("before\n"))
	d.mu.Lock()
	d.bytes = 64 << 20
	d.mu.Unlock()
	_, _ = out.Write([]byte("after limit\n"))
	if err := http.NewResponseController(out).Flush(); err != nil || !w.Flushed {
		t.Fatal("overflow interrupted flush", err)
	}
	d.finish()
	d.flushLogs()
	if w.Body.String() != "before\nafter limit\n" || d.bytes != 64<<20 {
		t.Fatal("capture limit changed transport or grew budget")
	}
	b, _ := os.ReadFile(filepath.Join(d.directory, "response.body"))
	if string(b) != "before\n" {
		t.Fatal("partial payload lost or extended", string(b))
	}
	control := httptest.NewRecorder()
	store.serve(control, httptest.NewRequest("GET", "/admin/request-logs", nil))
	var limits Object
	if json.Unmarshal(control.Body.Bytes(), &limits) != nil || limits["per_request_limit_bytes"] != float64(64<<20) || limits["retention_hours"] != float64(24) || limits["storage_budget_bytes"] != float64(512<<20) || limits["overflow_behavior"] != "retain_partial_with_metadata" {
		t.Fatal("wrong public log limits", control.Body.String())
	}
}

func TestRequestLogDisableThenEnableDoesNotResurrectActiveLog(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	d.capture(w, r)
	for _, body := range []string{`{"enabled":false}`, `{"enabled":true}`} {
		out := httptest.NewRecorder()
		store.serve(out, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(body)))
		if out.Code != 200 {
			t.Fatal(out.Body.String())
		}
	}
	d.finish()
	d.flushLogs()
	if _, err := os.Stat(store.root); !os.IsNotExist(err) {
		t.Fatal("old completion recreated purged request")
	}
}

type blockedLogResponseWriter struct {
	*httptest.ResponseRecorder
	started chan struct{}
	release chan struct{}
}

func (w *blockedLogResponseWriter) Write(b []byte) (int, error) {
	close(w.started)
	<-w.release
	return w.ResponseRecorder.Write(b)
}

func TestRequestLogSlowClientDoesNotBlockDisable(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := &blockedLogResponseWriter{httptest.NewRecorder(), make(chan struct{}), make(chan struct{})}
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	written := make(chan struct{})
	go func() { _, _ = out.Write([]byte("client response")); close(written) }()
	<-w.started
	disabled := make(chan struct{})
	go func() {
		store.serve(httptest.NewRecorder(), httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(`{"enabled":false}`)))
		close(disabled)
	}()
	select {
	case <-disabled:
	case <-time.After(2 * time.Second):
		close(w.release)
		<-written
		<-disabled
		t.Fatal("slow client held the logging disable mutex")
	}
	close(w.release)
	<-written
	d.finish()
	d.flushLogs()
	if w.Body.String() != "client response" {
		t.Fatal("disable interrupted response")
	}
}

func TestRequestDiagnosticConcurrentTraceAndMetadata(t *testing.T) {
	for range 2 {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/v1/messages", nil)
		d, _ := loggedRequest(t, w, r)
		d.mu.Lock()
		d.bytes = (64 << 20) - 2048
		d.mu.Unlock()
		var wg sync.WaitGroup
		for i := 0; i < 6; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < 30; j++ {
					d.setStage("parallel")
					d.setField("history_mode", "prefix-hit")
					d.trace("mod_or_relay", Object{"step": j})
					d.fail(200, "", "")
				}
			}()
		}
		wg.Wait()
		d.finish()
		d.flushLogs()
		b, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
		var record Object
		if err != nil || json.Unmarshal(b, &record) != nil || record["log_status"] != "truncated" || d.bytes > 64<<20 {
			t.Fatalf("concurrent completion lost: %v %s", err, b)
		}
	}
}

func TestRequestLogCompletionMetadataIsBounded(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d, _ := loggedRequest(t, w, r)
	d.setField("messages", strings.Repeat("x", 300<<10))
	d.finish()
	d.flushLogs()
	b, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	if err != nil || len(b) > 256<<10 {
		t.Fatal("completion metadata exceeded its separate budget", err, len(b))
	}
	var record Object
	if json.Unmarshal(b, &record) != nil || record["metadata_details_truncated"] != true || record["request_id"] == nil {
		t.Fatal("bounded metadata lost request identity", string(b))
	}
	before := d.bytes
	d.trace("late_mod_event", Object{})
	d.save("late-payload.body", []byte("after completion"))
	d.finish()
	d.flushLogs()
	after, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	if err != nil || !bytes.Equal(b, after) || d.bytes != before {
		t.Fatal("late producer changed finalized capture", err)
	}
	if _, err := os.Stat(filepath.Join(d.directory, "late-payload.body")); !os.IsNotExist(err) {
		t.Fatal("late producer extended finalized record")
	}
}
