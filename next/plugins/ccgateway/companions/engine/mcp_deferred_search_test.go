package engine

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

func pinnedSearchFixture() Object {
	b := mcpPlanFixture()
	b["model"] = "claude-opus-5-5"
	b["max_tokens"] = 128
	for _, value := range b["tools"].([]any) {
		def := value.(Object)
		def["tools"] = []any{Object{"name": "echo", "input_schema": Object{"type": "object"}}}
		def["default_config"] = Object{"defer_loading": true}
	}
	b["tools"] = append(b["tools"].([]any), Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"})
	b["messages"] = []any{Object{"role": "user", "content": "public fixture"}}
	return b
}
func pinnedSearchBlocks() []Object {
	return []Object{
		{"type": "server_tool_use", "id": "search_pinned", "name": "tool_search_tool_regex", "input": Object{"pattern": "echo"}},
		{"type": "tool_search_tool_result", "tool_use_id": "search_pinned", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "one_echo"}}}},
		{"type": "mcp_tool_use", "id": "mcp_pinned", "server_name": "one", "name": "echo", "input": Object{}},
		{"type": "mcp_tool_result", "tool_use_id": "mcp_pinned", "is_error": false, "content": "PUBLIC_RESULT"},
	}
}
func TestPinnedMCPSearchIdentityAndTimeline(t *testing.T) {
	b := pinnedSearchFixture()
	req, err := parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	if req.MCP.permitsCall("one", "echo") {
		t.Fatal("deferred tool active before search")
	}
	if req.searchReferenceName("one_echo", true) != "one_echo" || req.wireSearchReferenceName("one_echo") != "one_echo" {
		t.Fatal("reference renamed")
	}
	ledger := newServerToolLedger()
	for _, block := range pinnedSearchBlocks() {
		if err := ledger.accept(block, req); err != nil {
			t.Fatal(err)
		}
	}
	if req.MCP.permitsCall("one", "echo") {
		t.Fatal("response mutated request")
	}
	blocks := pinnedSearchBlocks()
	b["messages"] = append(b["messages"].([]any), Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "next"})
	req, err = parseMCPInline(b)
	if err != nil {
		t.Fatal(err)
	}
	if !req.MCP.permitsCall("one", "echo") || req.MCP.permitsCall("two", "echo") {
		t.Fatal("cross-server discovery")
	}
	removal := Object{"type": "tool_removal", "tool": Object{"type": "mcp_tool_reference", "server_name": "one", "name": "echo"}}
	b["messages"] = append(b["messages"].([]any), Object{"role": "system", "content": []any{removal}}, Object{"role": "assistant", "content": pinnedSearchBlocks()})
	if _, err = parseMCPInline(b); err == nil {
		t.Fatal("search revived withdrawn tool")
	}
}
func TestPinnedMCPSearchRejectsAmbiguityAndUnavailable(t *testing.T) {
	for _, variant := range []string{"client_collision", "pair_collision", "incomplete_catalog", "disabled", "unknown", "before_search"} {
		t.Run(variant, func(t *testing.T) {
			b := pinnedSearchFixture()
			switch variant {
			case "incomplete_catalog":
				delete(b["tools"].([]any)[1].(Object), "tools")
				b["tools"].([]any)[1].(Object)["default_config"] = Object{"defer_loading": false}
			case "client_collision":
				b["tools"] = append(b["tools"].([]any), Object{"name": "one_echo", "input_schema": Object{"type": "object"}})
			case "pair_collision":
				b["mcp_servers"].([]any)[0].(Object)["name"] = "a_b"
				b["mcp_servers"].([]any)[1].(Object)["name"] = "a"
				b["tools"].([]any)[0].(Object)["mcp_server_name"] = "a_b"
				b["tools"].([]any)[1].(Object)["mcp_server_name"] = "a"
				b["tools"].([]any)[0].(Object)["tools"].([]any)[0].(Object)["name"] = "c"
				b["tools"].([]any)[1].(Object)["tools"].([]any)[0].(Object)["name"] = "b_c"
			case "disabled":
				b["tools"].([]any)[0].(Object)["configs"] = Object{"echo": Object{"enabled": false}}
			}
			req, err := parseMCPInline(b)
			if variant == "client_collision" || variant == "pair_collision" || variant == "incomplete_catalog" {
				if err == nil {
					t.Fatal("collision admitted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			ledger := newServerToolLedger()
			blocks := pinnedSearchBlocks()
			if variant == "unknown" {
				blocks[1]["content"].(Object)["tool_references"].([]any)[0].(Object)["tool_name"] = "mcp__one__echo"
				if req.searchReferenceName("mcp__one__echo", true) != "" {
					t.Fatal("prefix guessed")
				}
				return
			}
			if variant == "before_search" {
				blocks = blocks[2:]
			}
			rejected := false
			for _, block := range blocks {
				if ledger.accept(block, req) != nil {
					rejected = true
					break
				}
			}
			if !rejected {
				t.Fatal("unavailable tool admitted")
			}
		})
	}
}
func TestRealCLIPinnedMCPDeferredSearch(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			calls := 0
			handler := func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls++
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				if !bytes.Equal(mustMCPJSON(wire["tools"]), mustMCPJSON(pinnedSearchFixture()["tools"])) {
					t.Error("pinned tool catalog changed")
				}
				servers := wire["mcp_servers"].([]any)
				for i, name := range []string{"one", "two"} {
					if str(servers[i].(Object), "authorization_token") != "fixture-secret-"+name {
						t.Error("credential binding changed")
					}
				}
				if bytes.Contains(mustMCPJSON(wire["messages"]), []byte("mcp_pinned")) {
					if !messageProbeContainsBlock(wire, pinnedSearchBlocks()[1]) {
						t.Error("search reference history changed")
					}
					writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "CONTINUED"}})
					return
				}
				writeSurfaceFixture(w, str(wire, "model"), append(pinnedSearchBlocks(), Object{"type": "text", "text": "DONE"}))
			}
			endpoint, _ := newThinkingOutputFixture(t, handler)
			b := pinnedSearchFixture()
			b["stream"] = stream
			post := func() {
				t.Helper()
				request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(b)))
				request.Header.Set("Anthropic-Beta", mcpListingBeta)
				res, err := http.DefaultClient.Do(request)
				if err != nil {
					t.Fatal(err)
				}
				defer res.Body.Close()
				raw, _ := io.ReadAll(res.Body)
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, raw)
				}
				if !bytes.Contains(mustMCPJSON(b["messages"]), []byte("mcp_pinned")) && !bytes.Contains(raw, []byte("one_echo")) {
					t.Fatal("response lost native reference")
				}
				if bytes.Contains(raw, []byte("fixture-secret")) {
					t.Fatal("credential leaked")
				}
			}
			post()
			original := b["messages"]
			b["messages"] = append(append([]any{}, original.([]any)...), Object{"role": "assistant", "content": append(pinnedSearchBlocks(), Object{"type": "text", "text": "DONE"})}, Object{"role": "user", "content": "next"})
			post()
			endpoint, _ = newThinkingOutputFixture(t, handler)
			post()
			b["messages"] = original
			post()
			if calls != 4 {
				t.Fatal("unexpected retries", calls)
			}
		})
	}
}
