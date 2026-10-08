package engine

import "testing"

func TestReviewToolSearchCannotReactivateWithdrawnTool(t *testing.T) {
	lookup := Object{"name": "lookup", "input_schema": Object{"type": "object"}, "defer_loading": true}
	search := Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}
	r := &Request{Messages: []Message{
		{Role: "user", Content: []Object{{"type": "text", "text": "withdraw"}}},
		{Role: "system", Content: []Object{timelineChange("tool_removal", Object{"type": "tool_reference", "name": "lookup"})}},
		{Role: "assistant", Content: []Object{
			{"type": "server_tool_use", "id": "search1", "name": "tool_search_tool_regex", "input": Object{}},
			{"type": "tool_search_tool_result", "tool_use_id": "search1", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "lookup"}}}},
			{"type": "tool_use", "id": "call1", "name": "lookup", "input": Object{}},
		}},
	}}
	if _, _, err := r.compileToolTimeline([]Object{lookup, search}); err == nil {
		t.Fatal("tool search resurrected a withdrawn definition")
	}
}

func TestReviewResponseDiscoveryCannotOverrideWithdrawal(t *testing.T) {
	r := &Request{Tools: []Tool{{Name: "lookup"}}, InlineTools: &inlineToolTimeline{Active: map[string]bool{"lookup": false}, Withdrawn: map[string]bool{"lookup": true}}}
	block := Object{"content": Object{"tool_references": []any{Object{"type": "tool_reference", "tool_name": "lookup"}}}}
	if err := r.validateInlineSearchDiscovery(block); err == nil {
		t.Fatal("withdrawn response discovery accepted")
	}
	a := &Accumulator{}
	a.rememberInlineSearch(block)
	if a.inlineResponseView(r).InlineTools.Active["lookup"] {
		t.Fatal("local discovery bypassed withdrawal")
	}
	delete(r.InlineTools.Withdrawn, "lookup")
	if err := r.validateInlineSearchDiscovery(block); err != nil {
		t.Fatal("deferred discovery blocked", err)
	}
}

func TestReviewEmptyCompactionChangesRebaseOriginalTools(t *testing.T) {
	web := Object{"type": "web_search_20250305", "name": "web_search"}
	r := &Request{Messages: []Message{
		{Role: "user", Content: []Object{{"type": "text", "text": "add"}}},
		{Role: "system", Content: []Object{timelineChange("tool_addition", Object{"type": "tool_definition", "definition": web})}},
		{Role: "assistant", Content: []Object{{"type": "compaction", "content": "summary", "signature": "opaque", "tool_changes": []any{}}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "continue"}}},
		{Role: "assistant", Content: []Object{{"type": "server_tool_use", "id": "srv1", "name": "web_search", "input": Object{}}}},
	}}
	if _, _, err := r.compileToolTimeline(nil); err == nil {
		t.Fatal("empty net changes kept pre-compaction inline tool active")
	}
}
