package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func fileReferenceFixture(t *testing.T, expectedBeta ...string) (string, resources.Identity, <-chan Object) {
	t.Helper()
	calls := make(chan Object, 20)
	runner := resourceTestRunner(t, func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/v1/messages", r.URL.Path, "no count_tokens or management request is expected")
		if len(expectedBeta) > 0 && expectedBeta[0] != "" {
			assert.Contains(t, r.Header.Get("Anthropic-Beta"), expectedBeta[0])
		}
		for _, name := range []string{resources.PrincipalHeader, resources.GenerationHeader, resources.ResourceIDsHeader, resources.ResourceRefsHeader, resources.ResourceOutputsHeader, resources.ResourceContextsHeader} {
			assert.Empty(t, r.Header.Values(name), "private resource capability reached provider: %s", name)
		}
		raw, err := io.ReadAll(r.Body)
		assert.NoError(t, err)
		body, err := decodeObject(raw)
		assert.NoError(t, err)
		calls <- body
		generationFixtureEvents(w, str(body, "model"), "end_turn", "file fixture answer", false)
	})
	// Native model traffic uses the shared loopback fixture. Auth status has an
	// isolated HOME/config and any unrelated external traffic is blocked locally.
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "file-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1", "HTTPS_PROXY": "http://127.0.0.1:1", "HTTP_PROXY": "http://127.0.0.1:1", "NO_PROXY": "127.0.0.1,localhost"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
	require.NoError(t, err)
	g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2), Timeout: 20 * time.Second}
	b, err := newResourceBroker(g, &authManager{}, t.TempDir())
	require.NoError(t, err)
	g.resources = b
	t.Cleanup(func() { require.NoError(t, b.lease.Close()) })
	ctx, cancel := context.WithTimeout(t.Context(), 20*time.Second)
	defer cancel()
	id, err := b.identity(withResourceAuthorization(ctx))
	require.NoError(t, err)
	require.Equal(t, "api_key", id.AuthType)
	require.NotEmpty(t, id.PrincipalID)
	require.NotEmpty(t, id.Generation)
	require.Empty(t, calls, "identity verification must not execute a model")
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
				// This selects native prompt-cache TTL, not a relay-restored wire
				// breakpoint. The file reference must survive the native request.
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
					body["max_tokens"], body["stream"] = 128, stream
				}
				raw, err := json.Marshal(body)
				require.NoError(t, err)
				r, err := http.NewRequestWithContext(t.Context(), "POST", url+path, bytes.NewReader(raw))
				require.NoError(t, err)
				r.Header.Set("Content-Type", "application/json")
				if beta != "" {
					r.Header.Set("Anthropic-Beta", beta)
				}
				r.Header.Set("X-Api-Key", "worker-fixture")
				r.Header.Set(resources.PrincipalHeader, id.PrincipalID)
				r.Header.Set(resources.GenerationHeader, id.Generation)
				r.Header.Set(resources.ResourceIDsHeader, `["file_fixture"]`)
				if !count {
					setTestSession(t, r, session)
				}
				res, err := (&http.Client{Timeout: 25 * time.Second}).Do(r)
				require.NoError(t, err)
				out, err := io.ReadAll(res.Body)
				require.NoError(t, err)
				require.NoError(t, res.Body.Close())
				assert.Equal(t, id.PrincipalID, res.Header.Get(resources.PrincipalHeader))
				assert.Equal(t, id.Generation, res.Header.Get(resources.GenerationHeader))
				if count || kind == "container_upload" {
					require.Equal(t, 400, res.StatusCode, string(out))
					failure, err := decodeObject(out)
					require.NoError(t, err)
					detail, ok := failure["error"].(Object)
					require.True(t, ok)
					assert.Equal(t, "invalid_request_error", detail["type"])
					if count {
						assert.Contains(t, detail["message"], "count_tokens is not supported")
					} else {
						assert.Contains(t, detail["message"], `history block "container_upload" is not supported`)
					}
					assert.Empty(t, calls, "rejected request executed a model")
					return nil
				}
				require.Equal(t, 200, res.StatusCode, string(out))
				var wire Object
				select {
				case wire = <-calls:
				default:
					t.Fatal("successful response without native model request")
				}
				wireRaw, err := json.Marshal(wire)
				require.NoError(t, err)
				refs, err := resources.ScanReferences(wireRaw)
				require.NoError(t, err)
				require.Len(t, refs, 1)
				assert.Equal(t, resources.KindFile, refs[0].Kind)
				assert.Equal(t, "file_fixture", refs[0].ID)
				wireMessages, ok := wire["messages"].([]any)
				require.True(t, ok)
				found := false
				for _, value := range wireMessages {
					message, ok := value.(Object)
					require.True(t, ok)
					content, err := historyContent(message["content"])
					require.NoError(t, err)
					for _, item := range content {
						if str(item, "type") == str(block, "type") {
							assert.Equal(t, block["source"], item["source"], "native file source shape changed")
							found = true
						}
					}
				}
				assert.True(t, found, "native image/document block was lost")
				assert.Empty(t, calls, "unexpected additional native model request")
				if stream {
					assert.Contains(t, res.Header.Get("Content-Type"), "text/event-stream")
					assert.Contains(t, string(out), "file fixture answer")
					assert.Contains(t, string(out), "event: message_stop")
					assert.NotContains(t, string(out), "event: error")
					return nil
				}
				answer, err := decodeObject(out)
				require.NoError(t, err)
				assert.Equal(t, "end_turn", answer["stop_reason"])
				assert.Contains(t, string(out), "file fixture answer")
				return answer
			}
			answer := call(messages, "file-history", false, false)
			if kind == "container_upload" {
				call(messages, "rejected-stream", false, true)
				return
			}
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
			r, err := http.NewRequestWithContext(t.Context(), "POST", url+"/v1/messages", bytes.NewReader(raw))
			require.NoError(t, err)
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
			res, err := (&http.Client{Timeout: 25 * time.Second}).Do(r)
			require.NoError(t, err)
			out, err := io.ReadAll(res.Body)
			require.NoError(t, err)
			require.NoError(t, res.Body.Close())
			assert.Equal(t, 400, res.StatusCode, string(out))
			assert.Contains(t, string(out), "invalid_request_error")
			assert.Empty(t, res.Header.Get(resources.PrincipalHeader))
			assert.Empty(t, res.Header.Get(resources.GenerationHeader))
			assert.Empty(t, calls, "unauthorized inference dispatched")
		})
	}
}
