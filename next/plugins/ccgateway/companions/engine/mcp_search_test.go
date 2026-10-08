package engine

import (
	"strings"
	"testing"
)

func mcpSearchFixture() Object {
	body := mcpInlineFixture()
	body["tools"] = append(body["tools"].([]any), Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}, Object{"name": "lookup", "input_schema": Object{"type": "object"}, "defer_loading": true})
	return body
}
func TestMCPClientSearchRejectsAmbiguousReferences(t *testing.T) {
	body := mcpSearchFixture()
	req, err := parseMCPInline(body)
	if err != nil {
		t.Fatal(err)
	}
	if req.searchReferenceName("mcp__ccgateway__lookup", true) != "lookup" {
		t.Fatal("known client route lost")
	}
	for _, name := range []string{"mcp__one__echo", "echo", "unknown"} {
		if req.searchReferenceName(name, true) != "" {
			t.Fatal("unknown reference treated as MCP", name)
		}
	}
	body = mcpSearchFixture()
	body["tools"].([]any)[0].(Object)["default_config"] = Object{"defer_loading": true}
	if _, err := parseMCPInline(body); err == nil || !strings.Contains(err.Error(), "deferred MCP") {
		t.Fatal("unverified cross-server encoding admitted", err)
	}
	body = mcpSearchFixture()
	body["mcp_servers"].([]any)[1].(Object)["name"] = "ccgateway"
	body["tools"].([]any)[0].(Object)["mcp_server_name"] = "ccgateway"
	if _, err := parseMCPInline(body); err == nil || !strings.Contains(err.Error(), "namespace") {
		t.Fatal("colliding server namespace admitted", err)
	}
}
