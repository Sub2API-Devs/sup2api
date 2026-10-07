package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIServerToolCacheBoundaries(t *testing.T) {
	for _, kind := range []string{"web_search_20250305", "web_fetch_20250910", "advisor_20260301"} {
		t.Run(kind, func(t *testing.T) {
			body := webTestBody(kind)
			blocks := webFixture(serverToolName(kind))
			beta := ""
			if kind == "advisor_20260301" {
				body, blocks, beta = advisorTestBody(), advisorFixture("advisor_redacted_result"), "advisor-tool-2026-03-01"
			}
			server := body["tools"].([]any)[0].(map[string]any)
			server["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
			body["tools"] = append(body["tools"].([]any), Object{"name": "client_task", "input_schema": Object{"type": "object", "properties": Object{}}})
			body["system"] = []any{Object{"type": "text", "text": "CACHE_SERVER_SYSTEM", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}
			body["messages"] = []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "CACHE_SERVER_FIRST", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}}}
			var calls atomic.Int32
			handler := http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
				if !strings.HasSuffix(req.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(req.Body)
				wire, _ := decodeObject(raw)
				calls.Add(1)
				tools, _ := historyContent(wire["tools"])
				if len(tools) != 2 || str(tools[0], "type") != kind || str(tools[1], "name") != "mcp__ccgateway__client_task" || digest(tools[0]["cache_control"]) != digest(server["cache_control"]) || tools[1]["cache_control"] != nil {
					t.Error("server/client tool cache order changed", tools)
				}
				systems, _ := historyContent(wire["system"])
				markedSystem := false
				for _, b := range systems {
					if b["cache_control"] != nil {
						if str(b, "text") != "CACHE_SERVER_SYSTEM" || digest(b["cache_control"]) != digest(server["cache_control"]) {
							t.Error("system cache marker moved")
						}
						markedSystem = true
					}
				}
				if !markedSystem {
					t.Error("system cache marker missing")
				}
				continued := false
				foundDocumentMarker := false
				for _, v := range wire["messages"].([]any) {
					m := v.(map[string]any)
					content, _ := historyContent(m["content"])
					for _, b := range content {
						if str(b, "type") == "server_tool_use" {
							continued = true
						}
						if doc := webFetchedDocument(b); doc != nil {
							foundDocumentMarker = digest(doc["cache_control"]) == digest(Object{"type": "ephemeral", "ttl": "5m"})
						}
					}
				}
				if continued && kind == "web_fetch_20250910" && !foundDocumentMarker {
					t.Error("nested fetched document cache marker missing")
				}
				answer := blocks
				if continued {
					answer = []Object{{"type": "text", "text": "CACHE_SERVER_DONE"}}
				}
				writeSurfaceFixture(w, str(wire, "model"), answer)
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			post := func(endpoint string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", beta)
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
				if body["stream"] == true {
					if strings.Count(string(out), "event: message_stop") != 1 {
						t.Fatal("stream did not complete")
					}
					return nil
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			first := post(endpoint)
			if kind == "web_fetch_20250910" {
				content, _ := historyContent(first["content"])
				webFetchedDocument(content[1])["cache_control"] = Object{"type": "ephemeral", "ttl": "5m"}
				first["content"] = content
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "CACHE_SERVER_NEXT"})
			post(endpoint)
			imported, _ := newThinkingOutputFixture(t, handler)
			post(imported)
			body["stream"] = true
			post(endpoint)
			if calls.Load() != 4 {
				t.Fatal("unexpected internal rounds", calls.Load())
			}
		})
	}
}
