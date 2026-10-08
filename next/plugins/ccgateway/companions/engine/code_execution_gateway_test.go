package engine

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func executionGatewayFixture(t *testing.T, handler http.HandlerFunc) (string, resources.Identity) {
	t.Helper()
	runner := resourceTestRunner(t, handler)
	runner.Env = envWith(runner.Env, map[string]string{"CCG_RESOURCE_ISSUER_ID": "execution-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "1"})
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Key: "worker-fixture", Slots: make(chan struct{}, 2), Timeout: 25 * time.Second}
	broker, err := newResourceBroker(g, &authManager{}, t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	g.resources = broker
	t.Cleanup(func() { broker.lease.Close() })
	identity, err := broker.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(g)
	t.Cleanup(server.Close)
	return server.URL, identity
}

// Worker HTTP to real CLI to isolated fake provider. This does not test core's
// public resource registration or imply provider execution/account eligibility.
func TestRealCLICodeExecutionGateway(t *testing.T) {
	for _, tc := range [][3]string{{"code_execution", "code_execution_tool_result", "code_execution_result"}, {"code_execution", "code_execution_tool_result", "encrypted_code_execution_result"}, {"bash_code_execution", "bash_code_execution_tool_result", "bash_code_execution_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_view_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_create_result"}, {"text_editor_code_execution", "text_editor_code_execution_tool_result", "text_editor_code_execution_str_replace_result"}} {
		t.Run(tc[2], func(t *testing.T) {
			blocks := []Object{{"type": "server_tool_use", "id": "srv_exec", "name": tc[0], "input": Object{}}, codeResultFixture(tc[1], tc[2]), {"type": "text", "text": "EXECUTION_DONE"}}
			var calls atomic.Int32
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
				}
				tools, _ := body["tools"].([]any)
				found := false
				for _, value := range tools {
					tool, _ := value.(Object)
					if str(tool, "type") == "code_execution_20260120" {
						found = true
					}
				}
				if !found {
					t.Error("provider execution definition lost")
				}
				if body["container"] != "container_fixture" {
					t.Error("container changed")
				}
				messages, _ := body["messages"].([]any)
				if len(messages) > 1 && (!messageProbeContainsBlock(body, blocks[0]) || !messageProbeContainsBlock(body, blocks[1])) {
					t.Error("execution history changed")
				}
				if len(messages) > 1 {
					writeExecutionFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CONTINUED"}})
				} else {
					writeExecutionFixture(w, str(body, "model"), blocks)
				}
			})
			endpoint, identity := executionGatewayFixture(t, handler)
			initial := []any{Object{"role": "user", "content": "execute fixture"}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "container": "container_fixture", "tools": []any{Object{"type": "code_execution_20260120", "name": "code_execution", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}, "messages": initial}
			post := func(session string, stream bool) Object {
				t.Helper()
				body["stream"] = stream
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-Api-Key", "worker-fixture")
				req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
				req.Header.Set(resources.GenerationHeader, identity.Generation)
				req.Header.Set(resources.ResourceOutputsHeader, "1")
				req.Header.Set(resources.ResourceRefsHeader, `[{"kind":"container","id":"container_fixture"},{"kind":"file","id":"file_fixture"}]`)
				req.Header.Set("X-CCGateway-Session-ID", session)
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
				if stream {
					if !bytes.Contains(out, []byte("event: message_stop")) {
						t.Fatalf("incomplete SSE %s", out)
					}
					return nil
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				if digest(answer["container"]) != digest(Object{"id": "container_fixture", "expires_at": "2026-10-09T00:00:00Z"}) {
					t.Fatal("container response facts lost")
				}
				usage, _ := answer["usage"].(Object)
				if digest(usage["server_tool_use"]) != digest(Object{"code_execution_requests": 1}) {
					t.Fatal("execution usage facts lost")
				}
				expected := blocks
				if len(body["messages"].([]any)) > 1 {
					expected = []Object{{"type": "text", "text": "CONTINUED"}}
				}
				if digest(answer["content"]) != digest(expected) {
					t.Fatalf("provider blocks changed %s", out)
				}
				return answer
			}
			answer := post("exec-history", false)
			body["messages"] = append(append([]any{}, initial...), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "continue fixture"})
			post("exec-history", false)
			post("exec-cold", false)
			post("exec-sse", true)
			body["messages"] = initial
			post("exec-history", false)
			if calls.Load() != 5 {
				t.Fatalf("unexpected model calls %d", calls.Load())
			}
		})
	}
}

func writeExecutionFixture(w http.ResponseWriter, model string, blocks []Object) {
	recorder := httptest.NewRecorder()
	writeSurfaceFixture(recorder, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	scan := bufio.NewScanner(bytes.NewReader(recorder.Body.Bytes()))
	for scan.Scan() {
		line := scan.Text()
		if strings.HasPrefix(line, "data: ") {
			event, err := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
			if err != nil {
				panic(err)
			}
			if str(event, "type") == "message_start" {
				message := event["message"].(Object)
				message["container"] = Object{"id": "container_fixture", "expires_at": "2026-10-09T00:00:00Z"}
			}
			if str(event, "type") == "message_delta" {
				event["usage"].(Object)["server_tool_use"] = Object{"code_execution_requests": 1}
			}
			raw, _ := json.Marshal(event)
			line = "data: " + string(raw)
		}
		fmt.Fprintln(w, line)
	}
}
