package engine

import "testing"

func citationFixture(index int) Object {
	return Object{"type": "char_location", "cited_text": "same", "document_index": index, "document_title": "Fixture", "start_char_index": 0, "end_char_index": 4}
}
func citationDocument(text string) Object {
	return Object{"type": "document", "source": Object{"type": "text", "media_type": "text/plain", "data": text}, "citations": Object{"enabled": true}}
}
func TestRestoreHistoryCitationsTurnAndDocumentIdentity(t *testing.T) {
	docA, docB := citationDocument("document A"), citationDocument("document B")
	r := &Request{ToolSearch: "true", Messages: []Message{{Role: "user", Content: []Object{docA}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{citationFixture(0)}}}}, {Role: "user", Content: []Object{docB}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{citationFixture(1)}}}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
	wire := Object{"messages": []any{Object{"role": "user", "content": []any{docA}}, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "same"}}}, Object{"role": "user", "content": []any{docB}}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_search", "name": "ToolSearch", "input": Object{"query": "fixture"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_search", "content": "fixture"}}}, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "same"}}}, Object{"role": "user", "content": "next"}}}
	if err := restoreHistoryCitations(r, wire); err != nil {
		t.Fatal(err)
	}
	for i, index := range []int{1, 5} {
		actual, _ := citationContent(wire["messages"].([]any)[index].(map[string]any)["content"])
		if digest(actual[0]["citations"]) != digest([]any{citationFixture(i)}) {
			t.Fatal("same-text turn received wrong document citation")
		}
	}
	if len(wire["messages"].([]any)) != 7 {
		t.Fatal("restoration removed internal search turn")
	}
}

func TestRestoreHistoryCitationsRejectAmbiguity(t *testing.T) {
	for _, scenario := range []string{"text", "document-order", "existing-citation", "missing-turn", "block-order"} {
		t.Run(scenario, func(t *testing.T) {
			docA, docB := citationDocument("A"), citationDocument("B")
			r := &Request{Messages: []Message{{Role: "user", Content: []Object{docA, docB}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{citationFixture(0)}}, {"type": "text", "text": "second"}}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
			actual := []any{Object{"type": "text", "text": "same"}, Object{"type": "text", "text": "second"}}
			user := Object{"role": "user", "content": []any{docA, docB}}
			assistant := Object{"role": "assistant", "content": actual}
			wire := Object{"messages": []any{user, assistant, Object{"role": "user", "content": "next"}}}
			switch scenario {
			case "text":
				actual[0].(map[string]any)["text"] = "changed"
			case "document-order":
				user["content"] = []any{docB, docA}
			case "existing-citation":
				actual[0].(map[string]any)["citations"] = []any{citationFixture(1)}
			case "missing-turn":
				wire["messages"] = []any{user}
			case "block-order":
				assistant["content"] = []any{actual[1], actual[0]}
			}
			if err := restoreHistoryCitations(r, wire); err == nil {
				t.Fatal("ambiguous citation history was accepted")
			}
		})
	}
}
