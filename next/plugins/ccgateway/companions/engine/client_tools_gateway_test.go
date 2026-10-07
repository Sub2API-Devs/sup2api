package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
)

func TestRealCLIAPIClientToolGateway(t *testing.T) {
	for _, tc := range []struct {
		name       string
		tool, call Object
	}{
		{"bash-20241022", Object{"type": "bash_20241022", "name": "bash"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "bash", "input": Object{"command": "echo fixture"}}},
		{"editor-20241022", Object{"type": "text_editor_20241022", "name": "str_replace_editor"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "str_replace_editor", "input": Object{"command": "view", "path": "/fixture"}}},
		{"editor-20250124", Object{"type": "text_editor_20250124", "name": "str_replace_editor"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "str_replace_editor", "input": Object{"command": "view", "path": "/fixture"}}},
		{"editor-20250429", Object{"type": "text_editor_20250429", "name": "str_replace_based_edit_tool"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "str_replace_based_edit_tool", "input": Object{"command": "view", "path": "/fixture"}}},
		{"computer-20241022", Object{"type": "computer_20241022", "name": "computer", "display_width_px": 1024, "display_height_px": 768}, Object{"type": "tool_use", "id": "tool_fixture", "name": "computer", "input": Object{"action": "screenshot"}}},
		{"computer-20250124", Object{"type": "computer_20250124", "name": "computer", "display_width_px": 1024, "display_height_px": 768}, Object{"type": "tool_use", "id": "tool_fixture", "name": "computer", "input": Object{"action": "screenshot"}}},
		{"computer-20251124", Object{"type": "computer_20251124", "name": "computer", "display_width_px": 1024, "display_height_px": 768, "enable_zoom": true}, Object{"type": "tool_use", "id": "tool_fixture", "name": "computer", "input": Object{"action": "screenshot"}}},
		{"memory", Object{"type": "memory_20250818", "name": "memory"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "memory", "input": Object{"command": "view", "path": "/memories"}}},
		{"bash", Object{"type": "bash_20250124", "name": "bash"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "bash", "input": Object{"command": "echo fixture"}}},
		{"editor", Object{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "str_replace_based_edit_tool", "input": Object{"command": "view", "path": "/fixture"}}},
		{"computer", Object{"type": "computer_toolset_20260801"}, Object{"type": "tool_use", "id": "tool_fixture", "toolset_name": "computer", "name": "screenshot", "input": Object{}}},
		{"browser", Object{"type": "browser_toolset_20260801"}, Object{"type": "tool_use", "id": "tool_fixture", "toolset_name": "browser", "name": "screenshot", "input": Object{}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			var mu sync.Mutex
			var captures []Object
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				captures = append(captures, body)
				mu.Unlock()
				if digest(body["tools"]) != digest([]any{tc.tool}) {
					t.Error("typed tool definition changed")
				}
				history, _ := json.Marshal(body["messages"])
				if bytes.Contains(history, []byte("CLIENT_RESULT")) {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "TOOL_COMPLETED"}})
					return
				}
				writeSurfaceFixture(w, str(body, "model"), []Object{tc.call})
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "tools": []any{tc.tool}, "messages": []any{Object{"role": "user", "content": "tool fixture"}}}
			post := func(endpoint string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("Content-Type", "application/json")
				kind := str(tc.tool, "type")
				if strings.HasPrefix(kind, "computer_") && toolsetFamily(kind) == "" {
					v := strings.TrimPrefix(kind, "computer_")
					req.Header.Set("anthropic-beta", "computer-use-"+v[:4]+"-"+v[4:6]+"-"+v[6:])
				}
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				out, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
				if body["stream"] == true {
					if !bytes.Contains(out, []byte("event: message_stop")) {
						t.Fatal("SSE incomplete")
					}
					return nil
				}
				t.Logf("history mode: %s", res.Header.Get("X-CCGateway-History"))
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			first := post(endpoint)
			content := first["content"].([]any)
			if digest(content[0]) != digest(tc.call) {
				t.Fatal("tool call identity changed")
			}
			result := Object{"type": "tool_result", "tool_use_id": "tool_fixture", "content": "CLIENT_RESULT"}
			if set := str(tc.call, "toolset_name"); set != "" {
				result["toolset_name"] = set
				if set == "browser" {
					result["content"] = []any{Object{"type": "text", "text": "CLIENT_RESULT"}, Object{"type": "browser_state", "tabs": []any{Object{"tab_id": "tab1", "title": "Fixture", "url": "https://example.invalid", "active": true}}, "state_changes": []any{Object{"type": "tab_opened", "tab_id": "tab1"}}}}
				}
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{result}})
			post(endpoint)
			mu.Lock()
			last := captures[len(captures)-1]
			mu.Unlock()
			wire, _ := json.Marshal(last["messages"])
			for _, field := range []string{str(tc.call, "name"), "CLIENT_RESULT"} {
				if !strings.Contains(string(wire), field) {
					t.Fatalf("history lost %s", field)
				}
			}
			if set := str(tc.call, "toolset_name"); set != "" && !bytes.Contains(wire, []byte(`"toolset_name":"`+set+`"`)) {
				t.Fatal("history toolset identity lost")
			}
			imported, _ := newThinkingOutputFixture(t, handler)
			post(imported)
			body["stream"] = true
			post(endpoint)
			body["stream"] = false
			fullHistory := body["messages"]
			body["messages"] = []any{Object{"role": "user", "content": "tool fixture"}}
			post(endpoint)
			body["messages"] = fullHistory
			post(endpoint)
			mu.Lock()
			count := len(captures)
			mu.Unlock()
			if count != 6 {
				t.Fatalf("unexpected implicit retry count %d", count)
			}
			t.Logf("typed definition/call/result/new-import/SSE exact; calls=%d", count)
		})
	}
}
