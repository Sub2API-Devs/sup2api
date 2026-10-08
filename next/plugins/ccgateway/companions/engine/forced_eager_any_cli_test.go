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

func TestRealCLIForcedEagerAnyClientTools(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
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
				if str(choice, "type") != "any" || choice["name"] != nil || choice["disable_parallel_tool_use"] != true {
					t.Error("forced choice changed")
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
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "tool_choice": Object{"type": "any", "disable_parallel_tool_use": true}, "tools": []any{Object{"name": "chosen", "description": "chosen fixture", "defer_loading": false, "input_schema": schema, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"name": "other", "defer_loading": false, "input_schema": schema}}, "messages": []any{first}}
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

func TestRealCLIForcedEagerAnyRejectsHelperResponse(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "unwanted_helper", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__chosen"}}})
	})
	body := basic()
	body["tools"] = []any{Object{"name": "chosen", "defer_loading": false, "input_schema": Object{"type": "object"}}}
	body["tool_choice"] = Object{"type": "any"}
	raw, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	encoded, _ := json.Marshal(p)
	req.Header.Set(policyHeader, string(encoded))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)
	if resp.StatusCode != 502 || calls.Load() != 1 {
		t.Fatalf("helper executed or hidden retry: status%d calls%d", resp.StatusCode, calls.Load())
	}
}

func TestRealCLIForcedEagerAnyPreservesProviderRejection(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		choice, _ := body["tool_choice"].(Object)
		if str(choice, "type") != "any" {
			t.Error("forced choice silently relaxed")
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(400)
		fmt.Fprint(w, `{"type":"error","error":{"type":"invalid_request_error","message":"fixture model does not support forced tool choice"}}`)
	})
	body := basic()
	body["model"] = "claude-opus-5-5"
	body["tools"] = []any{Object{"name": "fixture", "defer_loading": false, "input_schema": Object{"type": "object"}}}
	body["tool_choice"] = Object{"type": "any"}
	raw, _ := json.Marshal(body)
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
	p := defaultRequestPolicy()
	p.ToolSearch = "true"
	p.PassUpstreamErrors = true
	encoded, _ := json.Marshal(p)
	req.Header.Set(policyHeader, string(encoded))
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	out, _ := io.ReadAll(res.Body)
	if res.StatusCode != 400 || !bytes.Contains(out, []byte("fixture model does not support forced tool choice")) || calls.Load() != 1 {
		t.Fatalf("upstream rejection changed: status%d calls%d", res.StatusCode, calls.Load())
	}
}
