package engine

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

func TestRealCLIDynamicMCPListingHistory(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			fixture := dynamicMCPFixture()
			handler := func(w http.ResponseWriter, q *http.Request) {
				if !strings.HasSuffix(q.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(q.Body)
				wire, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					http.Error(w, "invalid", 400)
					return
				}
				if digest(wire["tools"]) != digest(fixture["tools"]) {
					t.Error("dynamic declaration was pinned, expanded or otherwise changed")
				}
				servers, _ := wire["mcp_servers"].([]any)
				if len(servers) != 1 || str(servers[0].(Object), "authorization_token") != "fixture-secret-one" {
					t.Error("server credential binding changed")
				}
				if bytes.Contains(mustMCPJSON(wire["messages"]), []byte("mcp_pinned")) {
					for _, block := range dynamicMCPBlocks() {
						if !messageProbeContainsBlock(wire, block) {
							t.Error("dynamic listing/search/call/result history changed")
						}
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "mcp_tool_use", "id": "mcp_reuse", "server_name": "one", "name": "echo", "input": Object{}}, {"type": "mcp_tool_result", "tool_use_id": "mcp_reuse", "is_error": false, "content": "REUSED"}, {"type": "text", "text": "CONTINUED"}})
					return
				}
				writeSurfaceFixture(w, str(wire, "model"), append(dynamicMCPBlocks(), Object{"type": "text", "text": "DONE"}))
			}
			endpoint, _ := newThinkingOutputFixture(t, handler)
			body := dynamicMCPFixture()
			body["stream"] = stream
			post := func() []any {
				t.Helper()
				q, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
				q.Header.Set("Anthropic-Beta", mcpListingBeta)
				response, err := http.DefaultClient.Do(q)
				if err != nil {
					t.Fatal(err)
				}
				defer response.Body.Close()
				raw, _ := io.ReadAll(response.Body)
				if response.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", response.StatusCode, raw)
				}
				if bytes.Contains(raw, []byte("fixture-secret")) {
					t.Fatal("credential leaked")
				}
				if stream {
					var frames [][]byte
					for _, frame := range bytes.Split(raw, []byte("\n\n")) {
						if bytes.Contains(frame, []byte("data:")) {
							frames = append(frames, frame)
						}
					}
					raw, err = credits.MessageFromEvents(frames)
					if err != nil {
						t.Fatal(err)
					}
				}
				result, err := decodeObject(raw)
				if err != nil {
					t.Fatal(err)
				}
				if str(result, "stop_reason") != "end_turn" {
					t.Fatal("terminal reason changed")
				}
				return result["content"].([]any)
			}
			first := post()
			expected := append(dynamicMCPBlocks(), Object{"type": "text", "text": "DONE"})
			if digest(first) != digest(expected) {
				t.Fatal("first public dynamic MCP response changed")
			}
			original := body["messages"]
			body["messages"] = append(append([]any{}, original.([]any)...), Object{"role": "assistant", "content": first}, Object{"role": "user", "content": "next"})
			if !bytes.Contains(mustMCPJSON(post()), []byte("REUSED")) {
				t.Fatal("historical discovery unavailable on continuation")
			}
			endpoint, _ = newThinkingOutputFixture(t, handler)
			if !bytes.Contains(mustMCPJSON(post()), []byte("REUSED")) {
				t.Fatal("historical discovery unavailable on cold import")
			}
			body["messages"] = original
			if digest(post()) != digest(expected) {
				t.Fatal("rollback did not rediscover from its own listing")
			}
			if calls.Load() != 4 {
				t.Fatalf("unexpected generation attempts: %d", calls.Load())
			}
		})
	}
}
