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

func TestRealCLIInlineInternalSearch(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, automatic := range []bool{false, true} {
			t.Run(fmt.Sprintf("stream=%t/auto=%t", stream, automatic), func(t *testing.T) {
				var calls atomic.Int32
				schema := func(label string) Object {
					return Object{"type": "object", "properties": Object{label: Object{"type": "string"}}}
				}
				a := Object{"name": "alpha", "defer_loading": true, "input_schema": schema("old")}
				b := Object{"name": "beta", "defer_loading": true, "input_schema": schema("current")}
				a2 := Object{"name": "alpha", "defer_loading": true, "input_schema": schema("new")}
				first := Object{"role": "user", "content": "Search and call beta"}
				changes := Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "alpha"}}, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": b}, "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}}}
				handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
					if !strings.HasSuffix(h.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(h.Body)
					wire, _ := decodeObject(raw)
					tools, _ := historyContent(wire["tools"])
					if len(tools) < 2 || str(tools[0], "name") != "mcp__ccgateway__alpha" || digest(tools[0]["input_schema"]) != digest(a["input_schema"]) {
						t.Error("original base changed")
					}
					if (wire["cache_control"] != nil) != automatic {
						t.Error("automatic cache changed")
					}
					marked := 0
					for _, value := range wire["messages"].([]any) {
						blocks, _ := historyContent(value.(Object)["content"])
						_ = visitProtocolBlocks(blocks, func(block Object) error {
							if block["cache_control"] != nil {
								marked++
							}
							return nil
						})
					}
					if marked != 1 {
						t.Errorf("inline cache markers changed: %d", marked)
					}
					betaWire, _ := jsonCopyObject(b)
					betaWire["name"] = "mcp__ccgateway__beta"
					if !inlineSearchContainsExactBlock(wire, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": betaWire}, "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}) {
						t.Error("original inline definition/position content changed")
					}
					if !inlineSearchContainsExactBlock(wire, Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "mcp__ccgateway__alpha"}}) {
						t.Error("original withdrawal lost")
					}
					messages, _ := json.Marshal(wire["messages"])
					target := "beta"
					if bytes.Contains(messages, []byte(`"new"`)) {
						target = "alpha"
						alphaWire, _ := jsonCopyObject(a2)
						alphaWire["name"] = "mcp__ccgateway__alpha"
						if !inlineSearchContainsExactBlock(wire, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": alphaWire}}) {
							t.Error("readded schema changed")
						}
					}
					if bytes.Contains(messages, []byte("ccgateway-inline-tools-")) {
						t.Error("carrier leaked")
					}
					searchID := "inline_search_" + target
					if !bytes.Contains(messages, []byte(searchID)) {
						writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": searchID, "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__" + target}}})
						return
					}

					if !bytes.Contains(messages, []byte("tool_reference")) {
						t.Error("missing internal discovery result")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "inline_call_" + target, "name": "mcp__ccgateway__" + target, "input": Object{}}})
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tools": []any{a}, "messages": []any{first, changes}}
				if automatic {
					body["cache_control"] = Object{"type": "ephemeral", "ttl": "5m"}
				}
				send := func(url string) {
					t.Helper()
					raw, _ := json.Marshal(body)
					req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
					p := defaultRequestPolicy()
					p.ToolSearch = "true"
					cfg, _ := json.Marshal(p)
					req.Header.Set(policyHeader, string(cfg))
					req.Header.Set("anthropic-beta", "inline-tools-2026-09-15")
					res, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					defer res.Body.Close()
					out, _ := io.ReadAll(res.Body)
					if bytes.Contains(out, []byte("ToolSearch")) || bytes.Contains(out, []byte("inline_search_")) || bytes.Contains(out, []byte("mcp__ccgateway__")) {
						t.Fatal("internal search/transport identity leaked to client")
					}
					if res.StatusCode != 200 || !bytes.Contains(out, []byte("inline_call_")) {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
				}
				send(endpoint)
				history := []any{first, changes, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "inline_call_beta", "name": "beta", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "inline_call_beta", "content": "done"}}}, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}, Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": a2}}}}}
				body["messages"] = history
				send(endpoint)
				cold, _ := newThinkingOutputFixture(t, handler)
				send(cold)
				body["messages"] = []any{first, changes}
				send(endpoint)
				if calls.Load() != 8 {
					t.Fatalf("unexpected rounds %d", calls.Load())
				}
			})
		}
	}
}

func inlineSearchContainsExactBlock(request Object, want Object) bool {
	messages, _ := request["messages"].([]any)
	for _, value := range messages {
		m, _ := value.(map[string]any)
		blocks, _ := historyContent(m["content"])
		for _, b := range blocks {
			if digest(b) == digest(want) {
				return true
			}
		}
	}
	return false
}
