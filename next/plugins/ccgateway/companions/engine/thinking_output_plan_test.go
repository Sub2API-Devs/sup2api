package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
)

func TestThinkingOutputPlanAdmissionAndDefaults(t *testing.T) {
	body := basic()
	body["max_tokens"] = 2048
	body["thinking"] = Object{"type": "enabled", "budget_tokens": 4096}
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("manual thinking exceeded per-response limit without interleaved beta")
	}
	h := http.Header{}
	h.Set("anthropic-beta", "interleaved-thinking-2025-05-14")
	if _, err := parsePolicyRequest(raw, h); err != nil {
		t.Fatal("interleaved manual turn budget was incorrectly bounded by max_tokens", err)
	}
	for _, extra := range []Object{
		{"thinking": Object{"type": "adaptive", "display": "updates"}},
		{"thinking": Object{"type": "adaptive", "block_binding": Object{"prefix_mismatch_behavior": "error"}}},
		{"thinking": Object{"type": "between_tools", "display": "omitted"}},
		{"thinking": Object{"type": "between_tools"}, "output_config": Object{"effort": "max"}},
		{"thinking": Object{"type": "disabled", "display": "summarized"}},
		{"thinking": Object{"type": "adaptive", "block_binding": Object{"prefix_mismatch_behavior": "ignore"}}},
		{"output_format": Object{"type": "json_schema", "schema": Object{"type": "object"}}},
	} {
		body := basic()
		for k, v := range extra {
			body[k] = v
		}
		raw, _ := json.Marshal(body)
		if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
			t.Errorf("invalid generation request accepted: %v", extra)
		}
	}
	req := plannedRequest(t, nil)
	wire := Object{"thinking": Object{"type": "adaptive", "display": "updates"}, "output_config": Object{"effort": "medium"}, "metadata": Object{"session_id": "fixture"}}
	if err := req.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if wire["thinking"] != nil || wire["output_config"] != nil || wire["metadata"] == nil {
		t.Fatal("API defaults not isolated from CLI defaults", wire)
	}
	req = plannedRequest(t, Object{"thinking": Object{"type": "disabled"}, "output_config": Object{"effort": "high"}})
	if err := req.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if str(wire["thinking"].(Object), "type") != "disabled" || str(wire["output_config"].(Object), "effort") != "high" {
		t.Fatal("explicit generation settings lost")
	}
}

func TestAPITerminalObserverBlocksRetryBeforeDeliveringStop(t *testing.T) {
	for _, kind := range []string{"end_turn", "max_tokens", "refusal", "pause_turn", "client_tool", "client_search", "internal_search"} {
		relay := &outboundRelay{}
		req := &Request{ToolSearch: "true", APIOutputFormat: true}
		if kind == "client_search" {
			req.Tools = []Tool{{Name: "ToolSearch"}}
			req.Native = map[string]bool{"ToolSearch": true}
		}
		observer := &apiTerminalObserver{relay: relay, req: req}
		send := func(event Object) {
			raw, _ := json.Marshal(event)
			observer.observe([]byte(fmt.Sprintf("data: %s\n\n", raw)))
		}
		reason := kind
		if kind == "client_tool" || kind == "client_search" || kind == "internal_search" {
			reason = "tool_use"
			name := "Read"
			if kind == "internal_search" || kind == "client_search" {
				name = "ToolSearch"
			}
			send(Object{"type": "content_block_start", "content_block": Object{"type": "tool_use", "name": name}})
		}
		send(Object{"type": "message_delta", "delta": Object{"stop_reason": reason}})
		if relay.isStopped() {
			t.Fatal("stopped before complete response")
		}
		send(Object{"type": "message_stop"})
		if relay.isStopped() != (kind != "internal_search") {
			t.Fatalf("wrong termination for %s", kind)
		}
	}
}

func TestResponseOnlyCheckpointSurvivesRestartWithoutNativeResume(t *testing.T) {
	cache, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	req := responseHistoryRequest(t)
	p, err := prepareHistory(req, cache, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	answer := responseHistoryAnswer("msg_partial", "{\"ok\":")
	answer["stop_reason"] = "max_tokens"
	if err := p.commitResponseOnly(req, answer, cache, "scope", time.Now()); err != nil {
		t.Fatal(err)
	}
	cache, err = newCache(cache.dir, cache.limit)
	if err != nil || len(cache.entries) != 1 {
		t.Fatal("response-only persistence failed", err)
	}
	req.Messages = append(req.Messages, Message{Role: "assistant", Content: answer["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "continue"}}})
	next, err := prepareHistory(req, cache, testBranch("scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	count := 0
	for _, raw := range next.Rows {
		row, _ := decodeObject(raw)
		message, _ := row["message"].(Object)
		if str(row, "type") != "assistant" {
			continue
		}
		blocks, _ := message["content"].([]any)
		for _, value := range blocks {
			block, _ := value.(Object)
			if str(block, "text") == str(answer["content"].([]Object)[0], "text") {
				count++
			}
		}
	}
	if next.Mode != "rebuild" || count != 1 {
		t.Fatal("response-only record reused as native checkpoint or replayed twice", next.Mode)
	}
}
