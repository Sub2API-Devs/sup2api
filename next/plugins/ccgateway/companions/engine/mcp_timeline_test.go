package engine

import (
	"net/http"
	"strings"
	"testing"
)

func mcpInlineFixture() Object {
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	top := body["tools"].([]any)
	body["tools"] = top[1:]
	body["messages"] = []any{Object{"role": "user", "content": "begin"}, Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": top[0]}}}}}
	return body
}
func parseMCPInline(body Object) (*Request, error) {
	return parsePolicyRequest(mustMCPJSON(body), http.Header{"Anthropic-Beta": {mcpListingBeta + ",inline-tools-2026-09-15"}})
}
func TestMCPInlineAvailabilityIsServerScoped(t *testing.T) {
	body := mcpInlineFixture()
	req, err := parseMCPInline(body)
	if err != nil {
		t.Fatal(err)
	}
	if !req.MCP.permitsCall("one", "echo") || !req.MCP.permitsCall("two", "echo") || req.MCP.permitsCall("two", "dynamic_tool") {
		t.Fatal("config scope changed")
	}
	messages := body["messages"].([]any)
	remove := Object{"type": "tool_removal", "tool": Object{"type": "mcp_tool_reference", "server_name": "one", "name": "echo"}}
	messages = append(messages, Object{"role": "assistant", "content": "ready"}, Object{"role": "user", "content": "withdraw"}, Object{"role": "system", "content": []any{remove}})
	body["messages"] = messages
	req, err = parseMCPInline(body)
	if err != nil {
		t.Fatal(err)
	}
	if req.MCP.permitsCall("one", "echo") || !req.MCP.permitsCall("two", "echo") || !req.MCP.permitsCall("one", "other") {
		t.Fatal("withdrawal crossed tool/server scope")
	}
	call := Object{"type": "mcp_tool_use", "id": "mcp_one", "server_name": "one", "name": "echo", "input": Object{}}
	if newServerToolLedger().accept(call, req) == nil {
		t.Fatal("withdrawn response call admitted")
	}
	body["messages"] = append(messages, Object{"role": "assistant", "content": []any{call, Object{"type": "mcp_tool_result", "tool_use_id": "mcp_one", "content": "done"}}}, Object{"role": "user", "content": "next"})
	if _, err = parseMCPInline(body); err == nil {
		t.Fatal("withdrawn historical call admitted")
	}
	body["messages"] = messages
	add, _ := jsonCopyObject(remove)
	add["type"] = "tool_addition"
	messages[len(messages)-1].(Object)["content"] = []any{remove, add}
	req, err = parseMCPInline(body)
	if err != nil || !req.MCP.permitsCall("one", "echo") {
		t.Fatal("explicit reoffer rejected", err)
	}
	if strings.Contains(string(req.Plan.RawRequest()), "fixture-secret") {
		t.Fatal("inline credential leaked into plan")
	}
}
func TestMCPInlineBeforeDeclarationAndPendingDenied(t *testing.T) {
	for _, pending := range []bool{false, true} {
		body := mcpInlineFixture()
		messages := body["messages"].([]any)
		call := Object{"type": "mcp_tool_use", "id": "mcp_one", "server_name": "one", "name": "echo", "input": Object{}}
		assistant := Object{"role": "assistant", "content": []any{call}}
		if !pending {
			assistant["content"] = append(assistant["content"].([]any), Object{"type": "mcp_tool_result", "tool_use_id": "mcp_one", "content": "done"})
			body["messages"] = []any{messages[0], assistant, Object{"role": "user", "content": "add now"}, messages[1]}
		} else {
			body["messages"] = append(messages, assistant, Object{"role": "user", "content": "withdraw"}, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "mcp_toolset_reference", "server_name": "one"}}}})
		}
		if _, err := parseMCPInline(body); err == nil {
			t.Fatal("invalid timeline admitted", pending)
		}
	}
}
