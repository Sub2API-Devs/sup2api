package engine

import "testing"

// A client-owned native ToolSearch is denied locally by the Mod and executed
// externally. Its history is a client turn, even when internal search is on.
func TestCitationReviewClientOwnedToolSearchIsNotInternal(t *testing.T) {
	doc := citationDocument("A")
	tool := Object{"type": "tool_use", "name": "ToolSearch", "id": "client_search", "input": Object{"query": "A"}}
	result := Object{"type": "tool_result", "tool_use_id": "client_search", "content": "client result"}
	r := &Request{ToolSearch: "true", Native: map[string]bool{"ToolSearch": true}, Tools: []Tool{{Name: "ToolSearch", Schema: Object{"type": "object"}}}, Messages: []Message{
		{Role: "user", Content: []Object{doc}},
		{Role: "assistant", Content: []Object{tool}},
		{Role: "user", Content: []Object{result}},
		{Role: "assistant", Content: []Object{{"type": "text", "text": "answer", "citations": []any{citationFixture(0)}}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "next"}}},
	}}
	wire := Object{"messages": []any{
		Object{"role": "user", "content": []any{doc}}, Object{"role": "assistant", "content": []any{tool}}, Object{"role": "user", "content": []any{result}}, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "answer"}}}, Object{"role": "user", "content": "next"},
	}}
	if err := restoreHistoryCitations(r, wire); err != nil {
		t.Fatal("client-owned tool history rejected:", err)
	}
}
