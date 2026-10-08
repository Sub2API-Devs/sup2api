package engine

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLISkillExecutionGateway(t *testing.T) {
	for _, kind := range []string{"custom", "anthropic"} {
		t.Run(kind, func(t *testing.T) {
			skill := Object{"type": kind, "skill_id": "skill_fixture", "version": "version_fixed"}
			if kind == "anthropic" {
				skill["skill_id"] = "pptx"
			}
			container := Object{"id": "container_fixture", "skills": []any{skill}}
			responseContainer := Object{"id": "container_fixture", "expires_at": "2026-10-09T00:00:00Z", "skills": []any{skill}}
			blocks := []Object{{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{"code": "print('fixture')"}}, codeResultFixture("code_execution_tool_result", "code_execution_result"), {"type": "text", "text": "SKILL_DONE"}}
			var calls atomic.Int32
			endpoint, identity := executionGatewayFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(r.Body)
				request, _ := decodeObject(raw)
				if digest(request["container"]) != digest(container) {
					t.Errorf("container.skills changed: %s", raw)
				}
				if r.Header.Get(resources.ResourceSkillVersionsHeader) != "" {
					t.Error("private version grant leaked")
				}
				out := blocks
				messages, _ := request["messages"].([]any)
				if len(messages) > 1 {
					for _, b := range blocks {
						if !messageProbeContainsBlock(request, b) {
							t.Errorf("skill history lost %s", str(b, "type"))
						}
					}
					out = []Object{{"type": "text", "text": "CONTINUED"}}
				}
				recording := httptest.NewRecorder()
				writeExecutionFixture(recording, str(request, "model"), out)
				w.Header().Set("Content-Type", "text/event-stream")
				scanner := bufio.NewScanner(bytes.NewReader(recording.Body.Bytes()))
				for scanner.Scan() {
					line := scanner.Text()
					if strings.HasPrefix(line, "data: ") {
						event, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
						if str(event, "type") == "message_start" {
							event["message"].(Object)["container"] = responseContainer
						}
						encoded, _ := json.Marshal(event)
						line = "data: " + string(encoded)
					}
					fmt.Fprintln(w, line)
				}
			})
			initial := []any{Object{"role": "user", "content": "run fixed skill fixture"}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "container": container, "tools": []any{Object{"type": "code_execution_20260120", "name": "code_execution"}}, "messages": initial}
			post := func(session string, stream bool) Object {
				t.Helper()
				body["stream"] = stream
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-Api-Key", "worker-fixture")
				req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
				req.Header.Set(resources.GenerationHeader, identity.Generation)
				req.Header.Set(resources.ResourceOutputsHeader, "1")
				req.Header.Set("X-CCGateway-Session-ID", session)
				refs := []Object{{"kind": "container", "id": "container_fixture"}, {"kind": "file", "id": "file_fixture"}}
				if kind == "custom" {
					refs = append(refs, Object{"kind": "skill", "id": "skill_fixture"})
					req.Header.Set(resources.ResourceSkillVersionsHeader, `[{"skill_id":"skill_fixture","version":"version_fixed"}]`)
				}
				grant, _ := json.Marshal(refs)
				req.Header.Set(resources.ResourceRefsHeader, string(grant))
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				reply, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, reply)
				}
				if stream {
					if !bytes.Contains(reply, []byte("event: message_stop")) || bytes.Contains(reply, []byte("event: error")) {
						t.Fatalf("bad skill SSE %s", reply)
					}
					found := false
					scan := bufio.NewScanner(bytes.NewReader(reply))
					for scan.Scan() {
						if strings.HasPrefix(scan.Text(), "data: ") {
							event, _ := decodeObject([]byte(strings.TrimPrefix(scan.Text(), "data: ")))
							if str(event, "type") == "message_start" {
								m, _ := event["message"].(Object)
								found = digest(m["container"]) == digest(responseContainer)
							}
						}
					}
					if !found {
						t.Fatalf("SSE skill version lost %s", reply)
					}
					return nil
				}
				answer, err := decodeObject(reply)
				if err != nil {
					t.Fatal(err)
				}
				if digest(answer["container"]) != digest(responseContainer) {
					t.Fatalf("response skill version changed %s", reply)
				}
				return answer
			}
			answer := post("skill-history", false)
			body["messages"] = []any{initial[0], Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "continue"}}
			post("skill-history", false)
			post("skill-cold", false)
			post("skill-sse", true)
			body["messages"] = initial
			post("skill-history", false)
			if calls.Load() != 5 {
				t.Fatalf("unexpected model calls %d", calls.Load())
			}
		})
	}
}
