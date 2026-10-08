package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewCompletedClientHistoryAlongsideProviderTools(t *testing.T) {
	for _, kind := range []string{"web", "mcp"} {
		t.Run(kind, func(t *testing.T) {
			b := completedHistoryBody("retired_fixture")
			h := policyHeaders(defaultRequestPolicy())
			if kind == "web" {
				b["tools"] = []any{Object{"type": "web_search_20250305", "name": "web_search"}}
			} else {
				mcp := pinnedSearchFixture()
				b["mcp_servers"], b["tools"] = mcp["mcp_servers"], mcp["tools"]
				h.Set("anthropic-beta", mcpListingBeta)
			}
			raw, _ := json.Marshal(b)
			r, err := parsePolicyRequest(raw, h)
			if err != nil {
				t.Fatal(err)
			}
			want := r.Messages[1].Content[0]
			if digest(r.wireMessage(r.Messages[1]).Content[0]) != digest(want) {
				t.Fatal("unrelated provider catalog changed completed client identity")
			}
			if r.apiResponseToolName(want) != "" || clientToolName(r, "retired_fixture") != "" {
				t.Fatal("history authorized a new tool invocation")
			}
			if r.searchReferenceName("retired_fixture", false) != "" {
				t.Fatal("completed history became a searchable tool")
			}
		})
	}
}

func TestReviewCompletedClientHistoryCannotDefineSearchReference(t *testing.T) {
	b := completedHistoryBody("retired_fixture")
	b["tools"] = []any{Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}}
	blocks := pinnedSearchBlocks()[:2]
	blocks[1]["content"].(Object)["tool_references"].([]any)[0].(Object)["tool_name"] = "retired_fixture"
	ms := b["messages"].([]any)
	ms[3].(Object)["content"] = blocks
	raw, _ := json.Marshal(b)
	if _, err := parsePolicyRequest(raw, nil); err == nil {
		t.Fatal("completed call incorrectly supplied an undeclared search catalog")
	}
}

func TestReviewCompletedClientHistoryCacheDoesNotRename(t *testing.T) {
	for _, name := range []string{"retired_fixture", "bash"} {
		b := completedHistoryBody(name)
		block := b["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
		block["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
		raw, _ := json.Marshal(b)
		r, err := parsePolicyRequest(raw, nil)
		if err != nil {
			t.Fatal(err)
		}
		wire := r.wireMessage(r.Messages[1]).Content[0]
		if str(wire, "name") != name {
			t.Fatalf("cached completed %s renamed as %s", name, str(wire, "name"))
		}
		if digest(wire["input"]) != digest(block["input"]) {
			t.Fatal("cached history input changed")
		}
		changed, _ := jsonCopyObject(r.Messages[1].Content[0])
		changed["input"].(Object)["cache_control"] = Object{"fixture": true}
		if r.completedClientHistoryBlock(changed) {
			t.Fatal("normalization ignored cache_control inside opaque tool input")
		}
	}
}
