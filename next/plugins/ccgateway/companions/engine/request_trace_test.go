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

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTraceNativeModAndLiveDisable(t *testing.T) {
	root := t.TempDir()
	store := &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
	w := httptest.NewRecorder()
	in := httptest.NewRequest("POST", "/v1/messages", nil)
	in.Header.Set("Authorization", "Bearer secret-key")
	in.Header.Set("Cookie", "secret-cookie")
	d := newRequestDiagnostic(w, in)
	d.store = store
	d.capture(w, in, "")
	control, err := startModControl(&runConfig{diagnostic: d, systems: []string{"client system"}}, "")
	require.NoError(t, err)
	defer control.Close()
	for _, token := range []string{"", "wrong-token"} {
		request, err := http.NewRequest("GET", control.URL, nil)
		require.NoError(t, err)
		if token != "" {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response, err := http.DefaultClient.Do(request)
		require.NoError(t, err)
		response.Body.Close()
		assert.Equal(t, http.StatusNotFound, response.StatusCode)
	}
	request, err := http.NewRequest("GET", control.URL, nil)
	require.NoError(t, err)
	request.Header.Set("Authorization", "Bearer "+control.token)
	resp, err := http.DefaultClient.Do(request)
	require.NoError(t, err)
	b, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, control.config, b)
	assert.FileExists(t, filepath.Join(d.directory, "mod-config.json"))
	entries, err := os.ReadDir(d.directory)
	require.NoError(t, err)
	for _, f := range entries {
		b, err := os.ReadFile(filepath.Join(d.directory, f.Name()))
		require.NoError(t, err)
		for _, secret := range []string{"secret-key", "secret-cookie", control.token} {
			assert.NotContains(t, string(b), secret, f.Name())
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
