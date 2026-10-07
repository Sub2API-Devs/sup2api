package engine

import (
	"bytes"
	"encoding/json"
	"testing"
)

func pushResponseFixture(t *testing.T, a *Accumulator, r *Request, event Object) {
	t.Helper()
	if err := a.push(event, r); err != nil {
		t.Fatal(err)
	}
}

func startResponseFixture(t *testing.T, a *Accumulator, r *Request) {
	t.Helper()
	pushResponseFixture(t, a, r, Object{"type": "message_start", "message": Object{"id": "msg_extensions", "type": "message", "role": "assistant", "model": "fixture", "content": []any{}, "stop_reason": nil, "usage": Object{"input_tokens": 1, "output_tokens": 0}}})
}

func TestResponseEnvelopeExtensionsPreserveJSONAndSSE(t *testing.T) {
	r := parsed(t, basic())
	a := &Accumulator{}
	startResponseFixture(t, a, r)
	pushResponseFixture(t, a, r, Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
	pushResponseFixture(t, a, r, Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "refusal is a normal response"}})
	pushResponseFixture(t, a, r, Object{"type": "content_block_stop", "index": 0})
	transform := []any{Object{"type": "thinking_dropped", "path": []any{"messages", 0}, "reason": "prefix_mismatch", "future": json.Number("9007199254740993")}}
	event := Object{"type": "message_delta", "delta": Object{"stop_reason": "refusal", "stop_sequence": nil, "stop_details": Object{"reason": "fixture"}}, "input_transformations": transform, "context_management": Object{"applied_edits": []any{}}, "container": Object{"id": "container_fixture"}, "usage": Object{"output_tokens": 7, "server_tool_use": Object{"web_search_requests": 1}}}
	before, _ := json.Marshal(event)
	pushResponseFixture(t, a, r, event)
	after, _ := json.Marshal(event)
	if !bytes.Equal(before, after) {
		t.Fatal("forwarded SSE event mutated")
	}
	// A final verdict may arrive after stop_reason but before message_stop.
	late := Object{"type": "message_delta", "delta": Object{"stop_reason": nil}, "safeguard_results": []any{Object{"tool_use_id": "toolu_exact", "decision": "deny", "unknown_detail": Object{"keep": true}}}}
	pushResponseFixture(t, a, r, late)
	pushResponseFixture(t, a, r, Object{"type": "message_stop", "diagnostics": Object{"request_id": "req_fixture"}})
	if !a.Done || str(a.Message, "stop_reason") != "refusal" {
		t.Fatal("normal refusal was rewritten")
	}
	transform[0].(map[string]any)["reason"] = "mutated"
	raw, _ := json.Marshal(a.Message)
	for _, token := range []string{`"safeguard_results"`, `"tool_use_id":"toolu_exact"`, `"decision":"deny"`, `"input_transformations"`, `9007199254740993`, `"prefix_mismatch"`, `"context_management"`, `"container"`, `"diagnostics"`, `"stop_details"`, `"web_search_requests":1`} {
		if !bytes.Contains(raw, []byte(token)) {
			t.Fatalf("response lost %s", token)
		}
	}
}

func TestResponseExtensionsReplaceRatherThanInventPatchSemantics(t *testing.T) {
	a := &Accumulator{}
	r := parsed(t, basic())
	startResponseFixture(t, a, r)
	pushResponseFixture(t, a, r, Object{"type": "message_delta", "delta": Object{}, "input_transformations": []any{Object{"type": "old"}}, "usage": Object{"output_tokens": 1}})
	if a.Stopped {
		t.Fatal("metadata update finished message")
	}
	pushResponseFixture(t, a, r, Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "input_transformations": nil}, "usage": Object{"output_tokens": 2}})
	pushResponseFixture(t, a, r, Object{"type": "message_stop"})
	raw, _ := json.Marshal(a.Message["input_transformations"])
	if string(raw) != "null" {
		t.Fatal("explicit null did not replace earlier metadata", string(raw))
	}
	if a.Message["usage"].(map[string]any)["output_tokens"] != 2 {
		t.Fatal("cumulative usage was added twice")
	}
}

func TestResponseExtensionsDoNotAuthorizeNewBlocksOrEarlyStop(t *testing.T) {
	r := parsed(t, basic())
	for _, blockType := range []string{"server_tool_use", "web_search_tool_result", "tool_search_tool_result"} {
		a := &Accumulator{}
		startResponseFixture(t, a, r)
		if err := a.push(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": blockType, "id": "srv_fixture", "name": "web_search"}}, r); err == nil {
			t.Fatal("unregistered execution block accepted", blockType)
		}
	}
	a := &Accumulator{}
	startResponseFixture(t, a, r)
	pushResponseFixture(t, a, r, Object{"type": "message_delta", "delta": Object{}, "safeguard_results": []any{}})
	if err := a.push(Object{"type": "message_stop"}, r); err == nil {
		t.Fatal("extension alone allowed incomplete message")
	}
}

func TestResponseSafeguardsPreserveToolUseID(t *testing.T) {
	v := basic()
	v["tools"] = []any{Object{"name": "weather", "input_schema": Object{"type": "object"}}}
	r := parsed(t, v)
	a := &Accumulator{}
	startResponseFixture(t, a, r)
	pushResponseFixture(t, a, r, Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "toolu_original_exact", "name": "mcp__ccgateway__weather", "input": Object{}}})
	pushResponseFixture(t, a, r, Object{"type": "content_block_stop", "index": 0})
	pushResponseFixture(t, a, r, Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use", "safeguard_results": []any{Object{"tool_use_id": "toolu_original_exact", "decision": "deny"}}}})
	pushResponseFixture(t, a, r, Object{"type": "message_stop"})
	if str(a.Blocks[0], "name") != "weather" || str(a.Blocks[0], "id") != "toolu_original_exact" {
		t.Fatal("tool identity changed")
	}
	raw, _ := json.Marshal(a.Message)
	if bytes.Count(raw, []byte("toolu_original_exact")) != 2 {
		t.Fatal("verdict no longer references same tool")
	}
}
