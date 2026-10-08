package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIForcedAPIFormatClientTools(t *testing.T) {
	for _, choiceType := range []string{"any", "tool"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/%t", choiceType, stream), func(t *testing.T) {
				var calls atomic.Int32
				format := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}
				wantChoice := Object{"type": choiceType, "disable_parallel_tool_use": true}
				if choiceType == "tool" {
					wantChoice["name"] = "chosen"
				}
				schema := Object{"type": "object", "properties": Object{"n": Object{"type": "integer"}}}
				handler := http.HandlerFunc(func(w http.ResponseWriter, h *http.Request) {
					if !strings.HasSuffix(h.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					n := calls.Add(1)
					raw, _ := io.ReadAll(h.Body)
					wire, _ := decodeObject(raw)
					choice, _ := wire["tool_choice"].(Object)
					if str(choice, "type") != choiceType || choice["disable_parallel_tool_use"] != true || (choiceType == "tool" && choice["name"] != "mcp__ccgateway__chosen") || (choiceType == "any" && choice["name"] != nil) {
						t.Error("forced choice changed")
					}
					output, _ := wire["output_config"].(Object)
					if digest(output["format"]) != digest(format) {
						t.Error("API format altered")
					}
					tools, _ := historyContent(wire["tools"])
					found := map[string]bool{}
					for _, tool := range tools {
						if str(tool, "name") == "mcp__ccgateway__chosen" || str(tool, "name") == "mcp__ccgateway__other" {
							if digest(tool["input_schema"]) != digest(schema) || tool["defer_loading"] != false {
								t.Error("client tool schema/deferral changed")
							}
							if str(tool, "name") == "mcp__ccgateway__chosen" {
								if str(tool, "description") != "chosen fixture" || digest(tool["cache_control"]) != digest(Object{"type": "ephemeral", "ttl": "1h"}) {
									t.Error("chosen description/cache changed")
								}
							}
							found[str(tool, "name")] = true
						}
					}
					if len(found) != 2 || len(tools) != 2 {
						t.Error("client tool directory truncated")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": fmt.Sprintf("call_chosen_%d", n), "name": "mcp__ccgateway__chosen", "input": Object{"n": json.Number("9007199254740993")}}})
				})
				endpoint, _ := newThinkingOutputFixture(t, handler)
				first := Object{"role": "user", "content": "Call chosen."}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tool_choice": wantChoice, "output_config": Object{"format": format}, "tools": []any{Object{"name": "chosen", "description": "chosen fixture", "defer_loading": false, "input_schema": schema, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"name": "other", "defer_loading": false, "input_schema": schema}}, "messages": []any{first}}
				send := func(url string) {
					t.Helper()
					raw, _ := json.Marshal(body)
					req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
					policy := defaultRequestPolicy()
					policy.ToolSearch = "true"
					p, _ := json.Marshal(policy)
					req.Header.Set(policyHeader, string(p))
					res, err := http.DefaultClient.Do(req)
					if err != nil {
						t.Fatal(err)
					}
					defer res.Body.Close()
					out, _ := io.ReadAll(res.Body)
					if res.StatusCode != 200 || !bytes.Contains(out, []byte("call_chosen")) || !bytes.Contains(out, []byte("9007199254740993")) {
						t.Fatalf("HTTP%d %s", res.StatusCode, out)
					}
					if bytes.Contains(out, []byte("ToolSearch")) {
						t.Fatal("helper leaked")
					}
				}
				send(endpoint)
				assistant := Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "call_chosen_1", "name": "chosen", "input": Object{"n": json.Number("9007199254740993")}}}}
				body["messages"] = []any{first, assistant, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "call_chosen_1", "content": "original result"}}}}
				send(endpoint)
				body["messages"] = []any{first, assistant, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "call_chosen_1", "content": "branch result"}}}}
				send(endpoint)
				cold, _ := newThinkingOutputFixture(t, handler)
				send(cold)
				if calls.Load() != 4 {
					t.Fatalf("hidden model rounds: %d", calls.Load())
				}
			})
		}
	}

}

func TestRealCLIForcedAPIFormatTerminals(t *testing.T) {
	for _, stream := range []bool{false, true} {
		for _, reason := range []string{"end_turn", "refusal", "max_tokens", "helper", "provider400"} {
			t.Run(fmt.Sprintf("%t/%s", stream, reason), func(t *testing.T) {
				var calls atomic.Int32
				endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, h *http.Request) {
					if !strings.HasSuffix(h.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					calls.Add(1)
					raw, _ := io.ReadAll(h.Body)
					wire, _ := decodeObject(raw)
					if reason == "provider400" {
						w.Header().Set("Content-Type", "application/json")
						w.WriteHeader(400)
						fmt.Fprint(w, `{"type":"error","error":{"type":"invalid_request_error","message":"fixture forced combination rejected"}}`)
						return
					}
					blocks := []Object{{"type": "text", "text": `{"ok":true}`}}
					if reason == "helper" {
						blocks = []Object{{"type": "tool_use", "id": "forbidden_helper", "name": "ToolSearch", "input": Object{"query": "fixture"}}}
					}
					rec := httptest.NewRecorder()
					writeSurfaceFixture(rec, str(wire, "model"), blocks)
					w.Header().Set("Content-Type", "text/event-stream")
					for _, line := range strings.Split(rec.Body.String(), "\n") {
						if !strings.HasPrefix(line, "data:") {
							continue
						}
						event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
						if str(event, "type") == "message_delta" && reason != "helper" {
							event["delta"].(Object)["stop_reason"] = reason
						}
						data, _ := json.Marshal(event)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), data)
					}
				})
				body := basic()
				body["stream"] = stream
				body["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
				body["tool_choice"] = Object{"type": "any"}
				body["output_config"] = Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "additionalProperties": false}}}
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				p := defaultRequestPolicy()
				p.ToolSearch = "true"
				p.PassUpstreamErrors = true
				cfg, _ := json.Marshal(p)
				req.Header.Set(policyHeader, string(cfg))
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				out, _ := io.ReadAll(res.Body)
				want := 200
				if reason == "helper" {
					want = 502
				}
				if reason == "provider400" {
					want = 400
				}
				if res.StatusCode != want || calls.Load() != 1 {
					t.Fatalf("status%d calls%d body%s", res.StatusCode, calls.Load(), out)
				}
				if reason == "provider400" && !bytes.Contains(out, []byte("fixture forced combination rejected")) {
					t.Fatal("original error lost")
				}
				if want == 200 && !bytes.Contains(out, []byte(reason)) {
					t.Fatalf("terminal changed: %s", out)
				}
			})
		}
	}
}
