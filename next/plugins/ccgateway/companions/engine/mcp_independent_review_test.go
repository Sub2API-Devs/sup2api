package engine

import "testing"

func TestReviewMCPWholeSetRemovalReofferAndRollback(t *testing.T) {
	body := mcpInlineFixture()
	base := body["messages"].([]any)
	change := func(kind, server, name string) Object {
		target := Object{"type": "mcp_toolset_reference", "server_name": server}
		if name != "" {
			target["type"], target["name"] = "mcp_tool_reference", name
		}
		return Object{"type": kind, "tool": target}
	}
	removed := append(append([]any{}, base...), Object{"role": "assistant", "content": "ready"}, Object{"role": "user", "content": "withdraw"}, Object{"role": "system", "content": []any{change("tool_removal", "one", ""), change("tool_addition", "one", "echo")}})
	body["messages"] = removed
	r, err := parseMCPInline(body)
	if err != nil {
		t.Fatal(err)
	}
	if !r.MCP.permitsCall("one", "echo") || r.MCP.permitsCall("one", "other") || !r.MCP.permitsCall("two", "other") {
		t.Fatal("individual reoffer changed whole-set or other-server availability")
	}
	// Parsing the same complete history into a fresh request is the cold-import
	// case; rolling back must rebuild state from the shorter timeline.
	cold, err := parseMCPInline(body)
	if err != nil || cold.MCP.permitsCall("one", "other") {
		t.Fatal("cold import resurrected withdrawn tool", err)
	}
	body["messages"] = base
	rollback, err := parseMCPInline(body)
	if err != nil || !rollback.MCP.permitsCall("one", "other") {
		t.Fatal("rollback retained future withdrawal", err)
	}
	if r.MCP.permitsCall("one", "other") {
		t.Fatal("rollback mutated another request's timeline")
	}
	// Reoffering a whole set must never override an explicit disabled config.
	body["messages"] = append(append([]any{}, base...), Object{"role": "assistant", "content": "ready"}, Object{"role": "user", "content": "offer"}, Object{"role": "system", "content": []any{change("tool_addition", "two", "")}})
	r, err = parseMCPInline(body)
	if err != nil || r.MCP.permitsCall("two", "dynamic_tool") {
		t.Fatal("whole-set reoffer enabled a disabled tool", err)
	}
}

func TestReviewMCPInlineCredentialDestinationRemainsExact(t *testing.T) {
	r, err := parseMCPInline(mcpInlineFixture())
	if err != nil {
		t.Fatal(err)
	}
	wire, err := r.MCP.wireServers()
	if err != nil {
		t.Fatal(err)
	}
	for _, value := range wire {
		s := value.(Object)
		if str(s, "authorization_token") != "fixture-secret-"+str(s, "name") {
			t.Fatal("credential crossed server identity")
		}
	}
	// The outbound copy is not an alias of the credential-free plan.
	wire[0].(Object)["url"] = "https://other.example.test/mcp"
	if _, err := r.MCP.wireServers(); err != nil {
		t.Fatal("outbound copy mutated plan", err)
	}
	r.MCP.servers[0]["url"] = "https://other.example.test/mcp"
	if _, err := r.MCP.wireServers(); err == nil {
		t.Fatal("changed destination received the original credential")
	}
}
