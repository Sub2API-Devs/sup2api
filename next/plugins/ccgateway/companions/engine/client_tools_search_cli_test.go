package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync/atomic"
	"testing"
)

func TestRealCLITypedToolSearchRoundtrip(t *testing.T) {
	for _, family := range []string{"bash", "browser"} {
		t.Run(family, func(t *testing.T) {
			tool := Object{"type": "bash_20250124", "name": "bash", "defer_loading": true}
			call := Object{"type": "tool_use", "id": "tool_typed_search", "name": "bash", "input": Object{"command": "fixture"}}
			if family == "browser" {
				configs := Object{}
				for _, member := range apiToolsetMembers["browser_toolset_20260801"] {
					configs[member] = Object{"defer_loading": true}
				}
				tool = Object{"type": "browser_toolset_20260801", "configs": configs}
				call = Object{"type": "tool_use", "id": "tool_typed_search", "name": "screenshot", "toolset_name": "browser", "input": Object{}}
			}
			search := Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}
			searchCall := Object{"type": "server_tool_use", "id": "srv_typed_search", "name": "tool_search_tool_regex", "input": Object{"pattern": family}}
			searchResult := Object{"type": "tool_search_tool_result", "tool_use_id": "srv_typed_search", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": family}}}}
			var calls atomic.Int32
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls.Add(1)
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if digest(body["tools"]) != digest([]any{search, tool}) {
					t.Error("catalog identity changed")
				}
				hist, _ := json.Marshal(body["messages"])
				if bytes.Contains(hist, []byte("CLIENT_RESULT")) {
					if !bytes.Contains(hist, []byte(`"tool_name":"`+family+`"`)) {
						t.Error("search reference identity changed")
					}
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "DONE"}})
					return
				}
				writeSurfaceFixture(w, str(body, "model"), []Object{searchCall, searchResult, call})
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			initial := []any{Object{"role": "user", "content": "search then call"}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "tools": []any{search, tool}, "messages": initial}
			post := func(endpoint string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				data, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, data)
				}
				if body["stream"] == true {
					if !bytes.Contains(data, []byte("event: message_stop")) {
						t.Fatal("incomplete SSE")
					}
					return nil
				}
				answer, err := decodeObject(data)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			answer := post(endpoint)
			content := answer["content"].([]any)
			if digest(content) != digest([]any{searchCall, searchResult, call}) {
				t.Fatal("response search/call identity changed")
			}
			result := Object{"type": "tool_result", "tool_use_id": "tool_typed_search", "content": "CLIENT_RESULT"}
			if family == "browser" {
				result["toolset_name"] = "browser"
			}
			body["messages"] = append(initial, Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{result}})
			post(endpoint)
			imported, _ := newThinkingOutputFixture(t, handler)
			post(imported)
			body["stream"] = true
			post(endpoint)
			if calls.Load() != 4 {
				t.Fatalf("unexpected implicit calls %d", calls.Load())
			}
		})
	}
}
