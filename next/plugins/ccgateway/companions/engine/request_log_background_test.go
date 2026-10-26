package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

// The log's fields are the ones the inline description wrote, and the file
// that reads them is written only once they are all there: finish waits for
// the background description.
func TestBackgroundRequestSummaryLandsBeforeMetadata(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	out := d.capture(w, r)
	d.request(parseRequestBody([]byte(`{"model":"claude-test","stream":true,"system":"s","messages":[{"role":"user","content":"hi"},{"role":"assistant","content":[{"type":"text","text":"x"}]}]}`)), r.Header)
	_, _ = out.Write([]byte("ok"))
	d.finish()
	d.flushLogs()
	var metadata Object
	raw, err := os.ReadFile(filepath.Join(d.directory, "metadata.json"))
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(raw, &metadata))
	require.Equal(t, "claude-test", metadata["model"])
	require.Equal(t, true, metadata["stream"])
	require.Equal(t, true, metadata["has_system"])
	require.Equal(t, float64(2), metadata["message_count"])
	require.Len(t, metadata["messages"], 2)
}

// The event file keeps the request_received line with its own detail, before
// the description's fields land.
func TestRequestReceivedEventIsUnchanged(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	r.Header.Set("X-Request-ID", "rid-event")
	d := newRequestDiagnostic(w, r)
	d.store = store
	_ = d.capture(w, r)
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[]}`)), r.Header)
	d.finish()
	d.flushLogs()
	events, err := os.ReadFile(filepath.Join(d.directory, "events.jsonl"))
	require.NoError(t, err)
	lines := strings.Split(strings.TrimSpace(string(events)), "\n")
	require.Len(t, lines, 2)
	var first Object
	require.NoError(t, json.Unmarshal([]byte(lines[0]), &first))
	require.Equal(t, "request_received", first["event"])
	require.Equal(t, Object{"request_id": "rid-event"}, first["detail"])
}

// An expired log stays untouched when the request asks for a prune: the walk
// of the log directory belongs to the maintenance loop, not the request.
func TestRequestLogPruneRunsOffTheRequestGoroutine(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	expired := time.Now().Add(-8 * 24 * time.Hour)
	old := filepath.Join(store.root, uuid())
	require.NoError(t, os.MkdirAll(store.root, 0700))
	require.NoError(t, os.Mkdir(old, 0700))
	require.NoError(t, os.WriteFile(filepath.Join(old, "metadata.json"), []byte("{}"), 0600))
	require.NoError(t, os.Chtimes(filepath.Join(old, "metadata.json"), expired, expired))
	store.mu.Lock()
	store.pruned = time.Now().Add(-2 * time.Minute)
	store.mu.Unlock()

	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.store = store
	_ = d.capture(w, r)
	d.finish()
	d.flushLogs()
	_, err := os.Stat(old)
	require.NoError(t, err, "the request walked the log directory itself")
	require.Len(t, store.pruneDue, 1)

	store.prune()
	_, err = os.Stat(old)
	require.True(t, os.IsNotExist(err), "the maintenance loop's prune removed nothing")
}

// Two requests due at once ask for one prune, not one each.
func TestRequestLogPruneIsSingleFlight(t *testing.T) {
	store := fullLogStore(t, t.TempDir())
	store.mu.Lock()
	store.pruned = time.Now().Add(-2 * time.Minute)
	store.mu.Unlock()
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/v1/messages", nil)
		d := newRequestDiagnostic(w, r)
		d.store = store
		wg.Add(1)
		go func() {
			defer wg.Done()
			_ = d.capture(w, r)
			d.finish()
			d.flushLogs()
		}()
	}
	wg.Wait()
	require.Len(t, store.pruneDue, 1)
}

// A summary that found nothing to keep costs nothing: a request with no log
// writes no fields and waits for nothing.
func TestNoLogMeansNoBackgroundSummary(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("POST", "/v1/messages", nil)
	d := newRequestDiagnostic(w, r)
	d.request(parseRequestBody([]byte(`{"model":"m","messages":[]}`)), r.Header)
	d.mu.Lock()
	_, summarized := d.fields["message_count"]
	_, digested := d.fields["body_bytes"]
	d.mu.Unlock()
	require.False(t, summarized)
	require.False(t, digested)
	d.finish()
	d.flushLogs()
}
