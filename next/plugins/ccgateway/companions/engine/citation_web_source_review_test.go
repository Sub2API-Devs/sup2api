package engine

import (
	"encoding/json"
	"testing"
)

func TestCitationWebSourceCorpusTracksEarlierFetchAndSearch(t *testing.T) {
	for _, kind := range []string{"fetch", "search"} {
		t.Run(kind, func(t *testing.T) {
			fetch := Object{"type": "web_fetch_tool_result", "tool_use_id": "srv_fetch", "content": Object{"type": "web_fetch_result", "url": "https://example.invalid/a", "content": citationDocument("source A")}}
			search := Object{"type": "web_search_tool_result", "tool_use_id": "srv_search", "content": []any{Object{"type": "web_search_result", "url": "https://example.invalid/a", "encrypted_content": "opaque-A"}, Object{"type": "web_search_result", "url": "https://example.invalid/b", "encrypted_content": "opaque-B"}}}
			result := fetch
			if kind == "search" {
				result = search
			}
			r := &Request{Messages: []Message{
				{Role: "user", Content: []Object{{"type": "text", "text": "search"}}},
				{Role: "assistant", Content: []Object{result, {"type": "text", "text": "earlier"}}},
				{Role: "user", Content: []Object{{"type": "text", "text": "cite"}}},
				{Role: "assistant", Content: []Object{{"type": "text", "text": "same", "citations": []any{Object{"type": "web_search_result_location", "encrypted_index": "opaque-A"}}}}},
				{Role: "user", Content: []Object{{"type": "text", "text": "next"}}},
			}}
			raw, _ := json.Marshal(Object{"messages": r.Messages})
			for _, mutation := range []string{"unchanged", "source", "order", "input-only"} {
				wire, _ := decodeObject(raw)
				messages := wire["messages"].([]any)
				cited := messages[3].(Object)["content"].([]any)[0].(Object)
				delete(cited, "citations")
				earlier := messages[1].(Object)["content"].([]any)[0].(Object)
				if kind == "fetch" && mutation == "source" {
					earlier["content"].(Object)["content"].(Object)["source"].(Object)["data"] = "changed"
				}
				if kind == "fetch" && mutation == "order" {
					earlier["content"].(Object)["url"] = "https://example.invalid/other"
				}
				if kind == "search" && mutation == "source" {
					earlier["content"].([]any)[0].(Object)["encrypted_content"] = "changed"
				}
				if kind == "search" && mutation == "order" {
					items := earlier["content"].([]any)
					items[0], items[1] = items[1], items[0]
				}
				if mutation == "input-only" {
					earlier["input"] = Object{"arbitrary": Object{"type": "document", "source": "not a protocol source"}}
				}
				err := restoreHistoryCitations(r, wire)
				if (mutation == "source" || mutation == "order") && err == nil {
					t.Fatal("changed web source accepted", mutation)
				}
				if (mutation == "unchanged" || mutation == "input-only") && err != nil {
					t.Fatal("unchanged source rejected", mutation, err)
				}
			}
		})
	}
}
