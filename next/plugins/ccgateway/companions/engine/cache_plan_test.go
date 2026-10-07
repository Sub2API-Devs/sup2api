package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func cacheRequest(t *testing.T, body Object) *Request {
	t.Helper()
	raw, _ := json.Marshal(body)
	r, err := parsePolicyRequest(raw, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestCachePlanBreakpointLimitsAndTTLOrder(t *testing.T) {
	for _, tc := range []struct {
		name      string
		ttls      []string
		automatic string
		want      bool
	}{
		{"four", []string{"1h", "1h", "5m", "5m"}, "", true},
		{"five", []string{"1h", "1h", "5m", "5m", "5m"}, "", false},
		{"reverse", []string{"5m", "1h"}, "", false},
		{"same-final-auto", []string{"1h", "1h", "5m", "5m"}, "5m", true},
		{"conflicting-final-auto", []string{"5m"}, "1h", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			content := []any{}
			for _, ttl := range tc.ttls {
				content = append(content, Object{"type": "text", "text": "same", "cache_control": Object{"type": "ephemeral", "ttl": ttl}})
			}
			body := Object{"model": "fixture", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": content}}}
			if tc.automatic != "" {
				body["cache_control"] = Object{"type": "ephemeral", "ttl": tc.automatic}
			}
			raw, _ := json.Marshal(body)
			_, err := parsePolicyRequest(raw, http.Header{})
			if (err == nil) != tc.want {
				t.Fatal(tc.name, err)
			}
		})
	}
}

func TestCachePlanExactBlocksAndNoSharedMutation(t *testing.T) {
	body := Object{"model": "fixture", "max_tokens": 32, "system": []any{Object{"type": "text", "text": "A", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"type": "text", "text": "B"}},
		"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "same", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}, Object{"type": "text", "text": "same"}}}}}
	r := cacheRequest(t, body)
	wire := Object{"system": []any{Object{"type": "text", "text": "CC", "cache_control": Object{"type": "ephemeral"}}, Object{"type": "text", "text": "A\n\nB", "cache_control": Object{"type": "ephemeral"}}},
		"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "same"}, Object{"type": "text", "text": "same", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}}}}
	if err := r.applyCachePlan(wire); err != nil {
		t.Fatal(err)
	}
	systems, _ := historyContent(wire["system"])
	if len(systems) != 3 || systems[0]["cache_control"] != nil || systems[2]["cache_control"] != nil || digest(systems[1]["cache_control"]) != digest(Object{"type": "ephemeral", "ttl": "1h"}) {
		t.Fatal("system breakpoint moved")
	}
	messages := wire["messages"].([]any)
	blocks, _ := historyContent(messages[0].(Object)["content"])
	if blocks[0]["cache_control"] == nil || blocks[1]["cache_control"] != nil {
		t.Fatal("same-text breakpoint moved")
	}
	systems[1]["cache_control"].(map[string]any)["ttl"] = "mutated"
	if str(r.Plan.cache.System[0]["cache_control"].(map[string]any), "ttl") != "1h" {
		t.Fatal("plan marker storage leaked")
	}
}

func TestCacheAlignmentRejectsReorderAtomically(t *testing.T) {
	body := Object{"model": "fixture", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "A", "cache_control": Object{"type": "ephemeral"}}, Object{"type": "text", "text": "B"}}}}}
	r := cacheRequest(t, body)
	wire := Object{"messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "B"}, Object{"type": "text", "text": "A"}}}}}
	before := digest(wire)
	if err := r.applyCachePlan(wire); err == nil {
		t.Fatal("accepted reordered blocks")
	}
	if digest(wire) != before {
		t.Fatal("failed alignment mutated outbound body")
	}
}

func TestCacheProtocolTraversalPreservesInputLiterals(t *testing.T) {
	blocks := []Object{{"type": "tool_use", "input": Object{"cache_control": Object{"type": "business", "ttl": "literal"}}, "cache_control": Object{"type": "ephemeral"}}}
	if err := visitProtocolBlocks(blocks, func(b Object) error { delete(b, "cache_control"); return nil }); err != nil {
		t.Fatal(err)
	}
	if blocks[0]["input"].(Object)["cache_control"] == nil {
		t.Fatal("arbitrary client tool input was edited")
	}
}

func TestSystemTurnAlignmentClientOwnedToolSearch(t *testing.T) {
	r := &Request{ToolSearch: "true", Native: map[string]bool{"ToolSearch": true}, Tools: []Tool{{Name: "ToolSearch"}}}
	wire := []any{Object{"role": "user", "content": "first"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "name": "ToolSearch", "id": "client"}}}, Object{"role": "user", "content": "next"}}
	heads, err := wireTurnHeads(wire, r)
	if err != nil || len(heads) != 2 {
		t.Fatal("client tool turn treated as internal", heads, err)
	}
}
