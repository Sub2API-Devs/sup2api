package engine

import (
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRealCLIResourceUploadExtendsOnlyBodyDeadline(t *testing.T) {
	if !resourceManagedTestProcess(t) {
		return
	}
	payload := []byte("payload\x00\xff\r\n")
	prefix := "--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"folder/fixture.txt\"\r\nContent-Type: text/plain\r\n\r\n"
	suffix := "\r\n--fixture--\r\n"
	wire := make(chan []byte, 1)
	var mu sync.Mutex
	var uploaded []byte
	runner := resourceManagedTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "dummy-resource-fixture", r.Header.Get("X-Api-Key"))
		assert.Empty(t, r.Header.Get("Authorization"))
		mu.Lock()
		defer mu.Unlock()
		switch r.Method + " " + r.URL.Path {
		case "POST /v1/files":
			assert.Equal(t, "multipart/form-data; boundary=fixture", r.Header.Get("Content-Type"))
			body, err := io.ReadAll(r.Body)
			assert.NoError(t, err)
			wire <- body
			part, err := multipart.NewReader(bytes.NewReader(body), "fixture").NextPart()
			if !assert.NoError(t, err) {
				w.WriteHeader(400)
				return
			}
			uploaded, err = io.ReadAll(part)
			assert.NoError(t, err)
			w.Header().Set("Content-Type", "application/json")
			_, _ = io.WriteString(w, `{"id":"file_fixture"}`)
		case "GET /v1/files/file_fixture/content":
			assert.NotEmpty(t, uploaded)
			w.Header().Set("Content-Type", "application/octet-stream")
			_, _ = w.Write(uploaded)
		default:
			t.Errorf("unexpected resource request: %s %s", r.Method, r.URL.Path)
			w.WriteHeader(400)
		}
	})
	b := resourceManagedTestBroker(t, runner)
	g := b.g
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
	require.NoError(t, err)
	g.Cache = cache
	g.RequestLogs = &requestLogStore{root: filepath.Join(t.TempDir(), "requests"), enabled: true, active: map[*requestDiagnostic]bool{}}
	ctx, cancel := context.WithTimeout(t.Context(), time.Minute)
	defer cancel()
	id, err := b.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	server := httptest.NewUnstartedServer(b)
	server.Config.ReadTimeout = 50 * time.Millisecond
	server.Start()
	defer server.Close()
	reader, writer := io.Pipe()
	defer reader.Close()
	go func() {
		defer writer.Close()
		_, _ = io.WriteString(writer, prefix)
		// Deliberately exceed the server's ordinary body deadline: resource
		// uploads must extend only this request, not the global server timeout.
		time.Sleep(150 * time.Millisecond)
		_, _ = writer.Write(payload)
		_, _ = io.WriteString(writer, suffix)
	}()
	r, err := http.NewRequestWithContext(ctx, "POST", server.URL+resourcePrefix+"/v1/files", reader)
	require.NoError(t, err)
	r.Header.Set("X-Api-Key", "worker-fixture")
	r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
	r.Header.Set(resources.GenerationHeader, id.Generation)
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(r)
	require.NoError(t, err)
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.NoError(t, resp.Body.Close())
	require.Equal(t, 200, resp.StatusCode, string(body))
	assert.JSONEq(t, `{"id":"file_fixture"}`, string(body))
	assert.Equal(t, id.PrincipalID, resp.Header.Get(resources.PrincipalHeader))
	assert.Equal(t, id.Generation, resp.Header.Get(resources.GenerationHeader))
	select {
	case got := <-wire:
		assert.Equal(t, append(append([]byte(prefix), payload...), suffix...), got, "slow upload bytes changed")
	default:
		t.Fatal("upload did not reach resource provider")
	}
	assert.Equal(t, 50*time.Millisecond, server.Config.ReadTimeout)
	entries, err := os.ReadDir(g.RequestLogs.root)
	require.NoError(t, err)
	require.Len(t, entries, 1)
	dir := filepath.Join(g.RequestLogs.root, entries[0].Name())
	facts, err := os.ReadFile(filepath.Join(dir, "resource-request-facts.json"))
	require.NoError(t, err)
	for _, field := range []string{"folder/fixture.txt", "normalized_file_name", "text/plain", "sha256", "body_omitted_reason"} {
		assert.Contains(t, string(facts), field)
	}
	decodedFacts, err := decodeObject(facts)
	require.NoError(t, err)
	assert.Equal(t, false, decodedFacts["body_retained"])
	events, err := os.ReadFile(filepath.Join(dir, "events.jsonl"))
	require.NoError(t, err)
	for _, event := range []string{"resource_identity_verified", "resource_dispatch", "resource_response_completed"} {
		assert.Contains(t, string(events), event)
	}
	require.NoError(t, filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() {
			raw, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			assert.NotContains(t, string(raw), "dummy-resource-fixture")
			assert.NotContains(t, string(raw), "worker-fixture")
			assert.NotContains(t, string(raw), string(payload))
		}
		return nil
	}))

	get, err := http.NewRequestWithContext(ctx, "GET", server.URL+resourcePrefix+"/v1/files/file_fixture/content", nil)
	require.NoError(t, err)
	get.Header = r.Header.Clone()
	get.Header.Del("Content-Type")
	retrieved, err := (&http.Client{Timeout: 10 * time.Second}).Do(get)
	require.NoError(t, err)
	download, err := io.ReadAll(retrieved.Body)
	require.NoError(t, err)
	require.NoError(t, retrieved.Body.Close())
	require.Equal(t, 200, retrieved.StatusCode, string(download))
	assert.Equal(t, payload, download, "uploaded bytes did not survive retrieval")
	assert.Equal(t, id.PrincipalID, retrieved.Header.Get(resources.PrincipalHeader))
	assert.Equal(t, id.Generation, retrieved.Header.Get(resources.GenerationHeader))
	assert.Empty(t, cache.entries, "resource HTTP created a conversation")
	assert.Empty(t, g.Slots)
	assertResourceSpoolReleased(t, b.dir, b.budget)

	off := httptest.NewRecorder()
	g.RequestLogs.serve(off, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(`{"enabled":false}`)))
	require.Equal(t, 200, off.Code)
	_, err = os.Stat(g.RequestLogs.root)
	assert.True(t, os.IsNotExist(err), "disable did not delete resource logs")
}
