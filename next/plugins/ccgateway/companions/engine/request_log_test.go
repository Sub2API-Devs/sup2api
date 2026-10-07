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

func TestFullRequestLogsIncludeRejectedRequestAndResponse(t *testing.T) {
	root := t.TempDir()
	v := basic()
	v["messages"].([]any)[1].(Object)["role"] = "developer"
	body, _ := json.Marshal(v)
	r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(body))
	r.Header.Set("Authorization", "Bearer secret-test-key")
	r.Header.Set("Cookie", "session=secret-cookie")
	w := httptest.NewRecorder()
	g := &Gateway{Runner: &Runner{}, RequestLogDir: root}
	g.ServeHTTP(w, r)
	entries, _ := os.ReadDir(root)
	if len(entries) != 1 || w.Code != 400 || w.Header().Get("request-id") == "" {
		t.Fatalf("missing rejected request log: %d %v", w.Code, entries)
	}
	dir := filepath.Join(root, entries[0].Name())
	request, _ := os.ReadFile(filepath.Join(dir, "request.body"))
	response, _ := os.ReadFile(filepath.Join(dir, "response.body"))
	if !bytes.Equal(request, body) || !bytes.Equal(response, w.Body.Bytes()) {
		t.Fatal("request or response differs from wire data")
	}
	h, _ := os.ReadFile(filepath.Join(dir, "request-headers.json"))
	if strings.Contains(string(h), "secret-test-key") || strings.Contains(string(h), "secret-cookie") {
		t.Fatal("credentials in headers")
	}
	b, _ := os.ReadFile(filepath.Join(dir, "metadata.json"))
	var m Object
	if json.Unmarshal(b, &m) != nil || m["stage"] != "parse_request" || m["request_id"] != w.Header().Get("request-id") || m["event"] != "request_finished" {
		t.Fatalf("wrong diagnostic metadata: %s", b)
	}
}

func TestRequestLogCapturePreservesStreamingFlush(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	out := d.capture(w, r, t.TempDir())
	out.Header().Set("Content-Type", "text/event-stream")
	_, _ = out.Write([]byte("event: message_start\ndata: {}\n\n"))
	if err := http.NewResponseController(out).Flush(); err != nil || !w.Flushed {
		t.Fatal("stream flush broken", err)
	}
	_, _ = out.Write([]byte("event: message_stop\ndata: {}\n\n"))
	d.finish()
	b, _ := os.ReadFile(filepath.Join(d.directory, "response.body"))
	if !bytes.Equal(b, w.Body.Bytes()) {
		t.Fatal("stream response not captured exactly")
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
	old := time.Now().Add(-25 * time.Hour)
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
	configured, err := configureRequestLogs(root)
	if err != nil || configured != "" {
		t.Fatal(configured, err)
	}
	if _, err := os.Stat(dir); !os.IsNotExist(err) {
		t.Fatal("disabled logs retained")
	}
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	w := httptest.NewRecorder()
	d := newRequestDiagnostic(w, r)
	out := d.capture(w, r, dir)
	d.save("request.body", []byte("private"))
	d.bytes = 64 << 20
	_, _ = out.Write([]byte("response"))
	d.finish()
	entries, _ := os.ReadDir(dir)
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
	store := &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r, store.root)
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
	if _, err := os.Stat(store.root); !os.IsNotExist(err) {
		t.Fatal("active log recreated after disable")
	}
	dir, err := configureRequestLogs(root)
	if err != nil || dir != "" {
		t.Fatal("disable not persisted", dir, err)
	}
	if w.Body.String() != "beforeafter" {
		t.Fatal("disable interrupted response")
	}
}

func TestRequestLogOverflowStreamAndLimits(t *testing.T) {
	store := &requestLogStore{root: filepath.Join(t.TempDir(), "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r, "")
	_, _ = out.Write([]byte("before\n"))
	d.mu.Lock()
	d.bytes = 64 << 20
	d.mu.Unlock()
	_, _ = out.Write([]byte("after limit\n"))
	if err := http.NewResponseController(out).Flush(); err != nil || !w.Flushed {
		t.Fatal("overflow interrupted flush", err)
	}
	d.finish()
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
	store := &requestLogStore{root: filepath.Join(t.TempDir(), "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	d.capture(w, r, "")
	for _, body := range []string{`{"enabled":false}`, `{"enabled":true}`} {
		out := httptest.NewRecorder()
		store.serve(out, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(body)))
		if out.Code != 200 {
			t.Fatal(out.Body.String())
		}
	}
	d.finish()
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
	store := &requestLogStore{root: filepath.Join(t.TempDir(), "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := &blockedLogResponseWriter{httptest.NewRecorder(), make(chan struct{}), make(chan struct{})}
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r, "")
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
	if w.Body.String() != "client response" {
		t.Fatal("disable interrupted response")
	}
}

func TestRequestDiagnosticConcurrentTraceAndMetadata(t *testing.T) {
	for _, withStore := range []bool{false, true} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/v1/messages", nil)
		d := newRequestDiagnostic(w, r)
		root := t.TempDir()
		if withStore {
			d.store = &requestLogStore{root: root, enabled: true, active: map[*requestDiagnostic]bool{}}
		}
		d.capture(w, r, root)
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
	d := newRequestDiagnostic(w, r)
	d.capture(w, r, t.TempDir())
	d.setField("messages", strings.Repeat("x", 300<<10))
	d.finish()
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
	after, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	if err != nil || !bytes.Equal(b, after) || d.bytes != before {
		t.Fatal("late producer changed finalized capture", err)
	}
	if _, err := os.Stat(filepath.Join(d.directory, "late-payload.body")); !os.IsNotExist(err) {
		t.Fatal("late producer extended finalized record")
	}
}
