package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestRealCLIInternalCacheRounds(t *testing.T) {
	for _, automatic := range []bool{false, true} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("automatic=%t/stream=%t", automatic, stream), func(t *testing.T) {
				var mu sync.Mutex
				var wires []Object
				handler := func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					wire, _ := decodeObject(raw)
					mu.Lock()
					wires = append(wires, wire)
					mu.Unlock()
					checkInternalCacheWire(t, wire, automatic)
					ms, _ := json.Marshal(wire["messages"])
					id := "toolu_cache_search_1"
					if bytes.Contains(ms, []byte(id)) {
						id = "toolu_cache_search_2"
					}
					if !bytes.Contains(ms, []byte("toolu_cache_search_2")) {
						writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": id, "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
						return
					}
					writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "CACHE_ROUND_DONE"}})
				}
				endpoint, _ := newThinkingOutputFixture(t, handler)
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "system": []any{Object{"type": "text", "text": "CACHE_SYSTEM", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}, "tools": []any{Object{"name": "stable", "defer_loading": false, "input_schema": Object{"type": "object", "properties": Object{}}, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{}}}}, "messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "lookup weather", "cache_control": Object{"type": "ephemeral"}}}}}}
				if automatic {
					body["cache_control"] = Object{"type": "ephemeral"}
				}
				send := func(url string) {
					t.Helper()
					raw, _ := json.Marshal(body)
					res, err := http.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
					if err != nil {
						t.Fatal(err)
					}
					data, _ := io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 || !bytes.Contains(data, []byte("CACHE_ROUND_DONE")) {
						t.Fatalf("HTTP%d %s", res.StatusCode, data)
					}
				}
				send(endpoint)
				first := body["messages"].([]any)[0]
				body["messages"] = []any{first, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "CACHE_ROUND_DONE"}}}, Object{"role": "user", "content": "continue weather"}}
				send(endpoint)
				body["messages"] = []any{first, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "CACHE_ROUND_DONE"}}}, Object{"role": "user", "content": "rollback alternate weather"}}
				send(endpoint)
				cold, _ := newThinkingOutputFixture(t, handler)
				send(cold)
				mu.Lock()
				defer mu.Unlock()
				if len(wires) != 12 {
					t.Fatalf("got %d rounds, want12", len(wires))
				}
			})
		}
	}
}

func checkInternalCacheWire(t *testing.T, wire Object, automatic bool) {
	t.Helper()
	if (wire["cache_control"] != nil) != automatic {
		t.Error("automatic root changed")
	}
	tools, _ := historyContent(wire["tools"])
	marked := 0
	for _, tool := range tools {
		if tool["cache_control"] != nil {
			marked++
			if str(tool, "name") != "mcp__ccgateway__stable" || str(tool["cache_control"].(map[string]any), "ttl") != "1h" {
				t.Error("tool breakpoint moved")
			}
		}
	}
	if marked != 1 {
		t.Errorf("tool breakpoint count %d", marked)
	}
	system, _ := historyContent(wire["system"])
	marked = 0
	for _, b := range system {
		if b["cache_control"] != nil {
			marked++
			if str(b, "text") != "CACHE_SYSTEM" || str(b["cache_control"].(map[string]any), "ttl") != "1h" {
				t.Error("system breakpoint moved")
			}
		}
	}
	if marked != 1 {
		t.Errorf("system breakpoint count %d", marked)
	}
	marked = 0
	for _, v := range wire["messages"].([]any) {
		m := v.(map[string]any)
		blocks, _ := historyContent(m["content"])
		_ = visitProtocolBlocks(blocks, func(b Object) error {
			if b["cache_control"] != nil {
				marked++
				if str(b, "type") != "text" || str(b, "text") != "lookup weather" {
					t.Error("message cache leaked onto internal round")
				}
			}
			return nil
		})
	}
	if marked != 1 {
		t.Errorf("message breakpoint count %d", marked)
	}
}

func writeInternalCacheFixture(w http.ResponseWriter, model string, blocks []Object) {
	rec := httptest.NewRecorder()
	writeSurfaceFixture(rec, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	_, _ = w.Write(bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid())))
}
