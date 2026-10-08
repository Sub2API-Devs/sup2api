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

func TestRealCLIReviewInlineSearchWithoutCache(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			alpha := Object{"name": "alpha", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}}
			beta := Object{"name": "beta", "input_schema": Object{"type": "object"}}
			changes := Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": beta}}, Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}}}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tools": []any{alpha}, "messages": []any{Object{"role": "user", "content": "search and call alpha"}, changes}}
			handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
				if !strings.HasSuffix(h.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				raw, _ := io.ReadAll(h.Body)
				wire, _ := decodeObject(raw)
				if wire["cache_control"] != nil {
					t.Error("unexpected automatic cache")
				}
				tools, _ := historyContent(wire["tools"])
				found := false
				for _, tool := range tools {
					if str(tool, "name") == "mcp__ccgateway__alpha" {
						found = true
						if digest(tool["input_schema"]) != digest(alpha["input_schema"]) {
							t.Error("large-number schema changed")
						}
					}
				}
				if !found {
					t.Error("base tool missing")
				}
				if !inlineSearchContainsExactBlock(wire, Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "mcp__ccgateway__beta"}}) {
					t.Error("withdrawal lost")
				}
				msgs, _ := json.Marshal(wire["messages"])
				if !bytes.Contains(msgs, []byte("review_search")) {
					writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "review_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__alpha"}}})
					return
				}
				if !bytes.Contains(msgs, []byte("tool_reference")) {
					t.Error("discovery missing")
				}
				writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "review_alpha_call", "name": "mcp__ccgateway__alpha", "input": Object{"n": json.Number("9007199254740993")}}})
			})
			for i := 0; i < 2; i++ {
				endpoint, _ := newThinkingOutputFixture(t, handler)
				raw, _ := json.Marshal(body)
				p := defaultRequestPolicy()
				p.ToolSearch = "true"
				headers := policyHeaders(p)
				headers.Set("Anthropic-Beta", "inline-tools-2026-09-15")
				parsed, err := parsePolicyRequest(raw, headers)
				if err != nil {
					t.Fatal(err)
				}
				if parsed.Plan.cache != nil {
					t.Fatal("fixture has cache plan")
				}
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				req.Header = headers
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || !bytes.Contains(out, []byte("review_alpha_call")) || !bytes.Contains(out, []byte("9007199254740993")) || bytes.Contains(out, []byte("review_search")) {
					t.Fatalf("HTTP%d %s", res.StatusCode, out)
				}
			}
			if calls.Load() != 4 {
				t.Fatalf("unexpected calls %d", calls.Load())
			}
		})
	}
}
