package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync"
	"testing"
)

func TestRealCLIInlineToolTimeline(t *testing.T) {
	for _, byValue := range []bool{false, true} {
		t.Run(map[bool]string{false: "reference", true: "definition"}[byValue], func(t *testing.T) {
			var mu sync.Mutex
			var captures []Object
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				captures = append(captures, body)
				mu.Unlock()
				ttlCounts := map[string]int{}
				walk := func(block Object) error {
					if cache, ok := block["cache_control"].(map[string]any); ok {
						ttlCounts[str(cache, "ttl")]++
					}
					return nil
				}
				for _, value := range body["tools"].([]any) {
					_ = walk(value.(map[string]any))
				}
				for _, value := range body["messages"].([]any) {
					blocks, _ := historyContent(value.(map[string]any)["content"])
					if err := visitProtocolBlocks(blocks, walk); err != nil {
						t.Error(err)
					}
				}
				if ttlCounts["1h"] != 1 || ttlCounts["5m"] != 1 {
					t.Errorf("cache markers moved or lost: %v", ttlCounts)
				}
				if bytes.Contains(raw, []byte("ccgateway-inline-tools-")) {
					t.Error("carrier leaked")
				}
				if bytes.Contains(raw, []byte(`"type":"tool_removal"`)) {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "REMOVED"}})
					return
				}
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "tool_inline", "name": "mcp__ccgateway__lookup", "input": Object{"q": "fixture"}}})
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			definition := Object{"cache_control": Object{"type": "ephemeral", "ttl": "1h"}, "name": "lookup", "input_schema": Object{"type": "object", "properties": Object{"q": Object{"type": "string"}}}}
			target := Object{"type": "tool_reference", "name": "lookup"}
			base := []any{definition}
			if byValue {
				target = Object{"type": "tool_definition", "definition": definition}
				base = []any{}
			}
			initial := []any{Object{"role": "user", "content": "use lookup"}, Object{"role": "system", "content": []any{Object{"type": "text", "text": "TOOLS_BEFORE"}, Object{"type": "tool_addition", "tool": target, "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "tools": base, "messages": initial}
			post := func(endpoint string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("anthropic-beta", "inline-tools-2026-09-15")
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
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			first := post(endpoint)
			content := first["content"].([]any)
			if str(content[0].(map[string]any), "name") != "lookup" {
				t.Fatal("tool alias not restored")
			}
			mu.Lock()
			firstWire := captures[0]
			mu.Unlock()
			tools, _ := firstWire["tools"].([]any)
			if len(tools) != len(base) {
				t.Fatal("future definition was hoisted into base tools")
			}
			firstHistory, _ := json.Marshal(firstWire["messages"])
			if !bytes.Contains(firstHistory, []byte("TOOLS_BEFORE")) || !bytes.Contains(firstHistory, []byte("tool_addition")) {
				t.Fatalf("inline content lost: %s", firstHistory)
			}
			body["messages"] = append(append([]any(nil), initial...), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_inline", "content": "CLIENT_RESULT"}}}, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "lookup"}}}})
			post(endpoint)
			imported, _ := newThinkingOutputFixture(t, handler)
			post(imported)
			body["stream"] = true
			post(endpoint)
			body["stream"] = false
			body["messages"] = initial
			post(endpoint)
			mu.Lock()
			count := len(captures)
			mu.Unlock()
			if count != 5 {
				t.Fatalf("implicit request count=%d", count)
			}
			t.Log("new/add, tool_result/remove, new-cache import, SSE and rollback preserve timeline; five upstream requests")
		})
	}
}
