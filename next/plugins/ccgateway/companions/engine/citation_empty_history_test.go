package engine

import "testing"

func TestCitationEmptyHistoryRestoration(t *testing.T) {
	for _, existing := range []any{nil, []any{}, []Object{}, []any{citationFixture(1)}, Object{}, ""} {
		doc := citationDocument("same")
		want := []any{citationFixture(0)}
		r := &Request{Messages: []Message{{Role: "user", Content: []Object{doc}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": want}}}}}
		block := Object{"type": "text", "text": "same"}
		block["citations"] = existing // Explicit null; absent is covered by existing restoration tests.
		wire := Object{"messages": []any{Object{"role": "user", "content": []any{doc}}, Object{"role": "assistant", "content": []any{block}}}}
		err := restoreHistoryCitations(r, wire)
		raw := digest(existing)
		empty := existing == nil || raw == digest([]any{})
		if empty && (err != nil || digest(block["citations"]) != digest(want)) {
			t.Fatalf("empty omission not restored: %v", err)
		}
		if !empty && err == nil {
			t.Fatal("nonempty or invalid citation conflict accepted")
		}
	}
}

func TestCitationEmptyArrayDoesNotBypassCorpusIdentity(t *testing.T) {
	for _, mode := range []string{"document", "user", "text", "turn-count"} {
		t.Run(mode, func(t *testing.T) {
			doc := citationDocument("same")
			r := &Request{Messages: []Message{{Role: "user", Content: []Object{doc, {"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{citationFixture(0)}}}}}}
			actualDoc, _ := jsonCopyObject(doc)
			user := Object{"type": "text", "text": "question"}
			block := Object{"type": "text", "text": "same", "citations": []any{}}
			wire := Object{"messages": []any{Object{"role": "user", "content": []any{actualDoc, user}}, Object{"role": "assistant", "content": []any{block}}}}
			switch mode {
			case "document":
				actualDoc["source"] = Object{"type": "text", "media_type": "text/plain", "data": "other"}
			case "user":
				user["text"] = "different question"
			case "text":
				block["text"] = "changed"
			case "turn-count":
				wire["messages"] = append(wire["messages"].([]any), Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "same", "citations": []any{}}}})
			}
			if restoreHistoryCitations(r, wire) == nil {
				t.Fatal("empty array bypassed full identity checks")
			}
		})
	}
}
