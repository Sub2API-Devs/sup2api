package engine

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestRealCLIResourceUploadExtendsOnlyBodyDeadline(t *testing.T) {
	wire := make(chan string, 1)
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		wire <- string(body)
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"id":"file_fixture"}`)
	})
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	logs := t.TempDir()
	g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 1), RequestLogs: &requestLogStore{root: filepath.Join(logs, "requests"), enabled: true, active: map[*requestDiagnostic]bool{}}}
	b, err := newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer b.lease.Close()
	id, err := b.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewUnstartedServer(b)
	server.Config.ReadTimeout = 50 * time.Millisecond
	server.Start()
	defer server.Close()
	reader, writer := io.Pipe()
	go func() {
		defer writer.Close()
		io.WriteString(writer, "--fixture\r\nContent-Disposition: form-data; name=\"file\"; filename=\"folder/fixture.txt\"\r\nContent-Type: text/plain\r\n\r\n")
		time.Sleep(150 * time.Millisecond)
		io.WriteString(writer, "payload\r\n--fixture--\r\n")
	}()
	r, err := http.NewRequest("POST", server.URL+resourcePrefix+"/v1/files", reader)
	if err != nil {
		t.Fatal(err)
	}
	r.Header.Set("X-Api-Key", "worker-fixture")
	r.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
	r.Header.Set(resources.GenerationHeader, id.Generation)
	resp, err := (&http.Client{Timeout: 10 * time.Second}).Do(r)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		t.Fatal(resp.StatusCode, string(body))
	}
	if got := <-wire; !strings.Contains(got, "payload") {
		t.Fatal("slow bounded upload truncated")
	}
	if server.Config.ReadTimeout != 50*time.Millisecond {
		t.Fatal("global read timeout mutated")
	}
	entries, err := os.ReadDir(g.RequestLogs.root)
	if err != nil || len(entries) != 1 {
		t.Fatal("resource record missing", err, len(entries))
	}
	dir := filepath.Join(g.RequestLogs.root, entries[0].Name())
	facts, err := os.ReadFile(filepath.Join(dir, "resource-request-facts.json"))
	if err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"folder/fixture.txt", "normalized_file_name", "text/plain", "sha256", "body_omitted_reason"} {
		if !strings.Contains(string(facts), field) {
			t.Fatal("resource upload facts missing", field)
		}
	}
	decodedFacts, err := decodeObject(facts)
	if err != nil || decodedFacts["body_retained"] != false {
		t.Fatal("binary body retention incorrectly claimed", err)
	}
	events, err := os.ReadFile(filepath.Join(dir, "events.jsonl"))
	if err != nil {
		t.Fatal(err)
	}
	for _, event := range []string{"resource_identity_verified", "resource_dispatch", "resource_response_completed"} {
		if !strings.Contains(string(events), event) {
			t.Fatal("missing resource processing event", event)
		}
	}
	_ = filepath.WalkDir(dir, func(path string, entry os.DirEntry, err error) error {
		if err == nil && !entry.IsDir() {
			raw, _ := os.ReadFile(path)
			if strings.Contains(string(raw), "dummy-resource-fixture") || strings.Contains(string(raw), "worker-fixture") {
				t.Error("credential found in resource log")
			}
		}
		return err
	})
	off := httptest.NewRecorder()
	g.RequestLogs.serve(off, httptest.NewRequest("PUT", "/admin/request-logs", strings.NewReader(`{"enabled":false}`)))
	if off.Code != 200 {
		t.Fatal(off.Code)
	}
	if _, err := os.Stat(g.RequestLogs.root); !os.IsNotExist(err) {
		t.Fatal("disable did not delete resource logs")
	}
}
