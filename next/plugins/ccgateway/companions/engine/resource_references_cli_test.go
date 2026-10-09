package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func fileReferenceFixture(t *testing.T, expectedBeta ...string) (string, resources.Identity, <-chan Object) {
	t.Helper()
	calls := make(chan Object, 20)
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		if len(expectedBeta) > 0 && expectedBeta[0] != "" && !strings.Contains(r.Header.Get("Anthropic-Beta"), expectedBeta[0]) {
			t.Error("resource reference beta not forwarded")
		}
		raw, _ := io.ReadAll(r.Body)
		body, err := decodeObject(raw)
		if err != nil {
			t.Error(err)
		}
		calls <- body
		if r.URL.Path == "/v1/messages/count_tokens" {
			w.Header().Set("Content-Type", "application/json")
			io.WriteString(w, `{"input_tokens":15}`)
			return
		}
		if r.URL.Path != "/v1/messages" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		generationFixtureEvents(w, str(body, "model"), "end_turn", "file fixture answer", false)
	})
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "file-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2), Timeout: 20 * time.Second}
	b, err := newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	g.resources = b
	t.Cleanup(func() { b.lease.Close() })
	id, err := b.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(g)
	t.Cleanup(server.Close)
	return server.URL, id, calls
}

func TestRealCLIAdmittedFilesHistoryAndCount(t *testing.T) {
	for _, kind := range []string{"image", "document", "container_upload", "nested_document"} {
		t.Run(kind, func(t *testing.T) {
			beta := ""
			if kind == "document" {
				beta = "files-api-2025-04-14"
			}
			url, id, calls := fileReferenceFixture(t, beta)
			block := Object{"type": kind, "source": Object{"type": "file", "file_id": "file_fixture"}}
			if kind == "document" {
				block["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
			}
			if kind == "container_upload" {
				block = Object{"type": kind, "file_id": "file_fixture"}
			}
			if kind == "nested_document" {
				block = Object{"type": "document", "source": Object{"type": "content", "content": []any{Object{"type": "image", "source": Object{"type": "file", "file_id": "file_fixture"}}}}}
			}
			messages := []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "inspect fixture"}, block}}}
			call := func(ms []any, session string, count, stream bool) Object {
				body := Object{"model": "claude-opus-5-5", "messages": ms}
				path := "/v1/messages"
				if count {
					path += "/count_tokens"
				} else {
					body["max_tokens"] = 128
					body["stream"] = stream
				}
				raw, _ := json.Marshal(body)
				r, _ := http.NewRequest("POST", url+path, bytes.NewReader(raw))
				r.Header.Set("Content-Type", "application/json")
				if beta != "" {
					r.Header.Set("Anthropic-Beta", beta)
				}
				r.Header.Set("X-Api-Key", "worker-fixture")
				r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
				r.Header.Set(resources.GenerationHeader, id.Generation)
				r.Header.Set(resources.ResourceIDsHeader, `["file_fixture"]`)
				if !count {
					setTestSession(t, r, session) // count_tokens takes no metadata
				}
				res, err := (&http.Client{Timeout: 25 * time.Second}).Do(r)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("status=%d %s", res.StatusCode, out)
				}
				wire := <-calls
				wireRaw, _ := json.Marshal(wire)
				refs, err := resources.ScanReferences(wireRaw)
				if err != nil || len(refs) != 1 || refs[0].ID != "file_fixture" {
					t.Fatalf("file reference changed or lost: refs=%v err=%v", refs, err)
				}
				if kind == "document" {
					messages, _ := wire["messages"].([]any)
					found := false
					for _, value := range messages {
						message, _ := value.(Object)
						content, _ := historyContent(message["content"])
						for _, item := range content {
							if str(item, "type") == "document" {
								cache, _ := item["cache_control"].(Object)
								found = cache["type"] == "ephemeral" && cache["ttl"] == "1h"
							}
						}
					}
					if !found {
						t.Fatal("file document explicit cache boundary lost")
					}
				}
				if count || stream {
					return nil
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			answer := call(messages, "file-history", false, false)
			continued := append(append([]any{}, messages...), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "continue"})
			call(continued, "file-history", false, false)
			call(messages, "file-history", false, false)
			call(continued, "cold-import", false, false)
			call(continued, "stream-import", false, true)
			call(continued, "count-import", true, false)
		})
	}
}

func TestRealCLIFileOwnershipDeniedBeforeInference(t *testing.T) {
	url, id, calls := fileReferenceFixture(t)
	for _, bad := range []string{"missing-ids", "wrong-id", "wrong-principal", "wrong-generation"} {
		t.Run(bad, func(t *testing.T) {
			raw := []byte(`{"model":"claude-opus-5-5","max_tokens":128,"messages":[{"role":"user","content":[{"type":"document","source":{"type":"file","file_id":"file_fixture"}}]}]}`)
			r, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
			r.Header.Set("X-Api-Key", "worker-fixture")
			r.Header.Set("Content-Type", "application/json")
			r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
			r.Header.Set(resources.GenerationHeader, id.Generation)
			r.Header.Set(resources.ResourceIDsHeader, `["file_fixture"]`)
			switch bad {
			case "missing-ids":
				r.Header.Del(resources.ResourceIDsHeader)
			case "wrong-id":
				r.Header.Set(resources.ResourceIDsHeader, `["file_other"]`)
			case "wrong-principal":
				r.Header.Set(resources.PrincipalHeader, "other")
			case "wrong-generation":
				r.Header.Set(resources.GenerationHeader, "old")
			}
			res, err := http.DefaultClient.Do(r)
			if err != nil {
				t.Fatal(err)
			}
			io.Copy(io.Discard, res.Body)
			res.Body.Close()
			if res.StatusCode != 400 {
				t.Fatal(fmt.Sprint(res.StatusCode))
			}
			if len(calls) != 0 {
				t.Fatal("unauthorized inference dispatched")
			}
		})
	}
}
