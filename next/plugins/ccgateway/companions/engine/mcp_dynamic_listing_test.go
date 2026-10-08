package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func dynamicMCPFixture() Object {
	b := pinnedSearchFixture()
	b["mcp_servers"] = b["mcp_servers"].([]any)[:1]
	tools := b["tools"].([]any)
	delete(tools[0].(Object), "tools")
	b["tools"] = []any{tools[0], tools[len(tools)-1]}
	return b
}

func TestDynamicMCPListingRejectsUnprovedOrderAndScope(t *testing.T) {
	for _, variant := range []string{"search-before-listing", "call-before-search", "missing-listing", "unknown-reference", "changed-listing", "disabled", "two-servers", "inline", "fallback", "compaction", "old-beta", "no-search"} {
		t.Run(variant, func(t *testing.T) {
			b := dynamicMCPFixture()
			blocks := dynamicMCPBlocks()
			header := mcpListingBeta
			switch variant {
			case "search-before-listing":
				blocks = []Object{blocks[1], blocks[2], blocks[0], blocks[3], blocks[4]}
			case "call-before-search":
				blocks = []Object{blocks[0], blocks[3], blocks[4], blocks[1], blocks[2]}
			case "missing-listing":
				blocks = blocks[1:]
			case "unknown-reference":
				blocks[2]["content"].(Object)["tool_references"] = []any{Object{"type": "tool_reference", "tool_name": "one_missing"}}
			case "changed-listing":
				changed := dynamicMCPListing()
				changed["tools"].([]any)[0].(Object)["input_schema"] = Object{"type": "string"}
				blocks = append(blocks, changed)
			case "disabled":
				b["tools"].([]any)[0].(Object)["configs"] = Object{"echo": Object{"enabled": false}}
			case "two-servers":
				b = pinnedSearchFixture()
				delete(b["tools"].([]any)[0].(Object), "tools")
			case "inline":
				b["messages"] = append(b["messages"].([]any), Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "mcp_toolset_reference", "server_name": "one"}}}})
			case "fallback":
				b["fallbacks"] = []any{Object{"model": "other"}}
			case "compaction":
				b["context_management"] = Object{"edits": []any{Object{"type": "compact_20260112"}}}
			case "old-beta":
				header = mcpConnectorBeta
			case "no-search":
				b["tools"] = b["tools"].([]any)[:1]
			}
			b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "next"})
			if _, err := parsePolicyRequest(mustMCPJSON(b), http.Header{"Anthropic-Beta": {header}}); err == nil {
				t.Fatal("unproved dynamic MCP admitted")
			}
		})
	}
}

func TestDynamicMCPListingAtomicResponseAndIdentity(t *testing.T) {
	b := dynamicMCPFixture()
	b["tools"] = append(b["tools"].([]any), Object{"name": "client", "input_schema": Object{"type": "object"}})
	r, err := parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	l := newServerToolLedger()
	listing := dynamicMCPListing()
	listing["tools"].([]any)[0].(Object)["input_schema"] = Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}
	before := digest(listing)
	if err = l.accept(listing, r); err != nil {
		t.Fatal(err)
	}
	if err = l.accept(listing, r); err != nil {
		t.Fatal("identical listing not idempotent", err)
	}
	if digest(listing) != before {
		t.Fatal("listing mutated")
	}
	blocks := pinnedSearchBlocks()
	if err = l.accept(blocks[0], r); err != nil {
		t.Fatal(err)
	}
	blocks[1]["content"].(Object)["tool_references"] = []any{Object{"type": "tool_reference", "tool_name": "one_echo"}, Object{"type": "tool_reference", "tool_name": "one_unknown"}}
	if err = l.accept(blocks[1], r); err == nil {
		t.Fatal("unknown reference accepted")
	}
	if err = l.accept(blocks[2], r); err == nil {
		t.Fatal("failed batch partially granted tool")
	}
	if r.MCP.timeline.current["one"].listing != nil {
		t.Fatal("response listing mutated request snapshot")
	}
	collision := dynamicMCPListing()
	collision["tools"].([]any)[0].(Object)["name"] = "echo"
	b["tools"] = append(b["tools"].([]any), Object{"name": "one_echo", "input_schema": Object{"type": "object"}})
	r, err = parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	l = newServerToolLedger()
	if err = l.accept(collision, r); err == nil {
		t.Fatal("client and composed MCP identity collided")
	}
	if l.mcpSearchTimeline(r).current["one"].listing != nil {
		t.Fatal("rejected listing partially committed")
	}
}

func TestDynamicMCPResponseUsesObservedResolver(t *testing.T) {
	r, err := parseMCPInline(dynamicMCPFixture())
	if err != nil {
		t.Fatal(err)
	}
	a := &Accumulator{}
	if err = a.push(Object{"type": "message_start", "message": Object{"id": "dynamic", "role": "assistant", "type": "message", "content": []any{}}}, r); err != nil {
		t.Fatal(err)
	}
	for i, block := range dynamicMCPBlocks() {
		if err = a.push(Object{"type": "content_block_start", "index": i, "content_block": block}, r); err != nil {
			t.Fatal(err)
		}
		if err = a.push(Object{"type": "content_block_stop", "index": i}, r); err != nil {
			t.Fatal(err)
		}
	}
	if err = a.push(Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn"}, "usage": Object{"output_tokens": 3}}, r); err != nil {
		t.Fatal(err)
	}
	if err = a.push(Object{"type": "message_stop"}, r); err != nil {
		t.Fatal(err)
	}
	if !a.Done || digest(a.Blocks[2]) != digest(pinnedSearchBlocks()[1]) {
		t.Fatal("public search references changed")
	}
}
func dynamicMCPListing() Object {
	return Object{"type": "mcp_tool_listing", "mcp_server_name": "one", "tools": []any{Object{"name": "echo", "description": nil, "input_schema": Object{"type": "object"}}}}
}
func dynamicMCPBlocks() []Object {
	return append([]Object{dynamicMCPListing()}, pinnedSearchBlocks()...)
}

func TestDynamicMCPListingCurrentAndHistoricalDiscovery(t *testing.T) {
	b := dynamicMCPFixture()
	r, err := parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	l := newServerToolLedger()
	for _, block := range dynamicMCPBlocks() {
		if err = l.accept(block, r); err != nil {
			t.Fatal(err)
		}
	}
	if r.MCP.permitsCall("one", "echo") {
		t.Fatal("response discovery mutated request")
	}
	b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": dynamicMCPBlocks()}, Object{"role": "user", "content": "continue"})
	r, err = parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	if !r.MCP.permitsCall("one", "echo") || r.wireSearchReferenceName("one_echo") != "one_echo" {
		t.Fatal("historical listing/discovery not recovered")
	}
	rolled, err := parseMCPInline(dynamicMCPFixture())
	if err != nil {
		t.Fatal(err)
	}
	if rolled.MCP.permitsCall("one", "echo") {
		t.Fatal("rollback retained discovery")
	}
}
