package engine

import "testing"

func timelineChange(kind string, tool Object) Object {
	return Object{"type": kind, "tool": tool}
}

func TestInlineTimelineServerAndCompaction(t *testing.T) {
	web := Object{"type": "web_search_20250305", "name": "web_search"}
	remove := timelineChange("tool_removal", Object{"type": "tool_reference", "name": "web_search"})
	add := timelineChange("tool_addition", Object{"type": "tool_definition", "definition": web})
	call := Object{"type": "server_tool_use", "id": "srv_a", "name": "web_search", "input": Object{"query": "test"}}
	result := Object{"type": "web_search_tool_result", "tool_use_id": "srv_a", "content": []any{}}
	for _, compact := range []bool{false, true} {
		r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "start"}}}, {Role: "system", Content: []Object{add}}, {Role: "assistant", Content: []Object{call, result}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}, {Role: "system", Content: []Object{remove}}}}
		if compact {
			r.Messages = []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "signature": "opaque", "tool_changes": []any{add}}}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}, {Role: "assistant", Content: []Object{call, result}}, {Role: "user", Content: []Object{{"type": "text", "text": "withdraw"}}}, {Role: "system", Content: []Object{remove}}}
		}
		before := digest(r.Messages)
		plan, carriers, err := r.compileToolTimeline(nil)
		if err != nil || plan.Active["web_search"] || len(plan.Versions["web_search"]) != 1 || len(carriers) == 0 {
			t.Fatalf("compact=%v plan=%+v carriers=%v err=%v", compact, plan, carriers, err)
		}
		if digest(r.Messages) != before {
			t.Fatal("timeline compilation changed original history or signature")
		}
	}
}

func TestInlineTimelineRejectsInactiveAndPendingChanges(t *testing.T) {
	web := Object{"type": "web_search_20250305", "name": "web_search"}
	remove := timelineChange("tool_removal", Object{"type": "tool_reference", "name": "web_search"})
	call := Object{"type": "server_tool_use", "id": "srv_a", "name": "web_search", "input": Object{"query": "test"}}
	for _, messages := range [][]Message{
		{{Role: "user"}, {Role: "system", Content: []Object{remove}}, {Role: "assistant", Content: []Object{call}}},
		{{Role: "assistant", Content: []Object{call}}, {Role: "user"}, {Role: "system", Content: []Object{remove}}},
		{{Role: "assistant"}, {Role: "system", Content: []Object{remove}}},
	} {
		r := &Request{Messages: messages}
		if _, _, err := r.compileToolTimeline([]Object{web}); err == nil {
			t.Fatal("invalid timeline accepted")
		}
	}
}

func TestInlineTimelineFailedCompactionIsNoop(t *testing.T) {
	web := Object{"type": "web_search_20250305", "name": "web_search"}
	remove := timelineChange("tool_removal", Object{"type": "tool_reference", "name": "web_search"})
	r := &Request{Messages: []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": nil, "tool_changes": []any{remove}}}}}}
	plan, _, err := r.compileToolTimeline([]Object{web})
	if err != nil || !plan.Active["web_search"] {
		t.Fatalf("failed compaction applied changes: %+v %v", plan, err)
	}
}

func TestInlineTimelineCompactionRebasesOnOriginalTools(t *testing.T) {
	web := Object{"type": "web_search_20250305", "name": "web_search"}
	add := timelineChange("tool_addition", Object{"type": "tool_definition", "definition": web})
	remove := timelineChange("tool_removal", Object{"type": "tool_reference", "name": "web_search"})
	r := &Request{Messages: []Message{{Role: "user"}, {Role: "system", Content: []Object{add}}, {Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "tool_changes": []any{remove}}}}}}
	// Old threshold compaction retains previous messages and may reference a
	// definition actually declared there. A cold signed import cannot guess it.
	if _, _, err := r.compileToolTimeline(nil); err != nil {
		t.Fatal(err)
	}
	cold := &Request{Messages: []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "signature": "opaque", "tool_changes": []any{remove}}}}}}
	if _, _, err := cold.compileToolTimeline(nil); err == nil {
		t.Fatal("cold summary guessed an absent definition")
	}
	r.Messages[2].Content[0]["tool_changes"] = []any{add, remove}
	plan, _, err := r.compileToolTimeline(nil)
	if err != nil || plan.Active["web_search"] {
		t.Fatalf("net changes not replayed in order: %+v %v", plan, err)
	}
}

func TestInlineSearchDiscoveryIsResponseLocal(t *testing.T) {
	r := &Request{Tools: []Tool{{Name: "lookup"}}, InlineTools: &inlineToolTimeline{Active: map[string]bool{"lookup": false}}}
	a := &Accumulator{}
	a.rememberInlineSearch(Object{"content": Object{"tool_references": []any{Object{"type": "tool_reference", "tool_name": "lookup"}}}})
	call := Object{"type": "tool_use", "name": "mcp__ccgateway__lookup"}
	if name := a.inlineResponseView(r).apiResponseToolName(call); name != "lookup" {
		t.Fatal("verified search did not expose tool", name)
	}
	if r.InlineTools.Active["lookup"] || (&Accumulator{}).inlineResponseView(r).apiResponseToolName(call) != "" {
		t.Fatal("response discovery leaked into request or another response")
	}
}

func TestInlineRemovedServerKeepsIdentityButCannotRun(t *testing.T) {
	r := &Request{ServerTools: []Object{{"type": "web_search_20250305", "name": "web_search"}}, InlineTools: &inlineToolTimeline{Active: map[string]bool{"web_search": false}}}
	if r.wireName("web_search") != "web_search" || r.searchReferenceName("web_search", false) != "web_search" {
		t.Fatal("historical server identity changed after withdrawal")
	}
	if r.hasServerSearch("web_search") {
		t.Fatal("withdrawn tool remained executable")
	}
	a := &Accumulator{}
	if err := a.push(Object{"type": "message_start", "message": Object{"id": "msg", "type": "message", "role": "assistant", "model": "fixture", "content": []any{}, "usage": Object{}}}, r); err != nil {
		t.Fatal(err)
	}
	if err := a.push(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "server_tool_use", "id": "srv", "name": "web_search", "input": Object{}}}, r); err == nil {
		t.Fatal("withdrawn server response accepted")
	}
}

func TestCompactionMappedToolIdentityRejectedWithoutMutation(t *testing.T) {
	definition := Object{"name": "custom_lookup", "input_schema": Object{"type": "object"}}
	change := timelineChange("tool_addition", Object{"type": "tool_definition", "definition": definition})
	r := &Request{Messages: []Message{{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "signature": "opaque", "tool_changes": []any{change}}}}}}
	if err := r.compileInlineTools(nil); err != nil {
		t.Fatal(err)
	}
	before := digest(r.Messages)
	if err := r.validateInlineNativeMapping("2.1.292"); err == nil {
		t.Fatal("signed tool identity rewritten")
	}
	if digest(r.Messages) != before {
		t.Fatal("rejected signature mutated")
	}
}
