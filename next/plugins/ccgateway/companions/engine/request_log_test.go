package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
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

func TestRequestLogDisablePurgesAndOverflowRetainsNothing(t *testing.T) {
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
	if len(entries) != 0 || w.Body.String() != "response" {
		t.Fatal("overflow retained data or broke response")
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
