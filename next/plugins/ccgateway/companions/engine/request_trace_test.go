package engine

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestTraceUnadaptedUpstreamAndLiveDisable(t *testing.T) {
	root := t.TempDir()
	store := &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := httptest.NewRecorder()
	in := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, in)
	d.store = store
	d.capture(w, in, "")
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		if string(b) != `{"model":"test"}` {
			t.Error("diagnostics changed upstream request")
		}
		w.Header().Set("Set-Cookie", "secret-cookie")
		_, _ = io.WriteString(w, "upstream reply")
	}))
	defer up.Close()
	r, err := startOutboundRelay(&Request{diagnostic: d}, []string{"ANTHROPIC_BASE_URL=" + up.URL})
	if err != nil {
		t.Fatal(err)
	}
	defer r.Close()
	request, _ := http.NewRequest("POST", r.URL+"/v1/messages", strings.NewReader(`{"model":"test"}`))
	request.Header.Set("Authorization", "Bearer secret-key")
	resp, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(b) != "upstream reply" {
		t.Fatal("diagnostics changed response")
	}
	files, _ := filepath.Glob(filepath.Join(d.directory, "upstream-*-request.body"))
	if len(files) != 2 {
		t.Fatalf("raw and forwarded bodies missing: %v", files)
	}
	files, _ = filepath.Glob(filepath.Join(d.directory, "upstream-*-response.body"))
	if len(files) != 1 {
		t.Fatal("raw response missing")
	}
	entries, _ := os.ReadDir(d.directory)
	for _, f := range entries {
		b, _ := os.ReadFile(filepath.Join(d.directory, f.Name()))
		if strings.Contains(string(b), "secret-key") || strings.Contains(string(b), "secret-cookie") {
			t.Fatal("credential in trace", f.Name())
		}
	}
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				d.trace("parallel", Object{"value": j})
			}
		}()
	}
	store.serve(httptest.NewRecorder(), httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(`{"enabled":false}`)))
	wg.Wait()
	d.artifact("late.json", Object{"late": true})
	d.finish()
	if _, err := os.Stat(store.root); !os.IsNotExist(err) {
		t.Fatal("disabled trace recreated logs")
	}
}

func TestTraceOverflowRetainsPartialArtifactsAndCompletion(t *testing.T) {
	d := &requestDiagnostic{fields: Object{}, directory: t.TempDir()}
	d.save("retained.body", []byte("before overflow"))
	directory := d.directory
	d.bytes = 64 << 20
	d.trace("overflow", Object{"x": "payload"})
	if !d.discarded || d.directory != directory || d.bytes != 64<<20 {
		t.Fatal("trace bypassed storage limit")
	}
	d.artifact("late.json", Object{"must": "not be written"})
	d.trace("later", Object{})
	d.finish()
	retained, err := os.ReadFile(filepath.Join(directory, "retained.body"))
	if err != nil || string(retained) != "before overflow" {
		t.Fatal("overflow destroyed earlier capture", err)
	}
	if _, err := os.Stat(filepath.Join(directory, "late.json")); !os.IsNotExist(err) {
		t.Fatal("capture continued after overflow")
	}
	metadata, err := os.ReadFile(filepath.Join(directory, "metadata.json"))
	var record Object
	if err != nil || json.Unmarshal(metadata, &record) != nil || record["log_status"] != "truncated" || record["event"] != "request_finished" {
		t.Fatalf("partial completion metadata missing: %s, %v", metadata, err)
	}
}
