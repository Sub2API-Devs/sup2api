package engine

import "testing"

func TestMCPHistoryOmissionRequiresFullSurroundingIdentity(t *testing.T) {
	call := Object{"type": "mcp_tool_use", "id": "mcptoolu_fixture", "name": "echo", "server_name": "one", "input": Object{"text": "expected"}}
	r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{call, {"type": "text", "text": "anchor"}}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
	base := Object{"messages": []any{Object{"role": "user", "content": "question"}, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "anchor"}}}, Object{"role": "user", "content": "next"}}}
	good, _ := jsonCopyObject(base)
	if err := restoreAdvisorHistory(r, good); err != nil {
		t.Fatal(err)
	}
	good, _ = jsonCopyObject(good)
	if !messageProbeContainsBlock(good, call) {
		t.Fatal("registered MCP omission was not restored")
	}
	for _, alter := range []func(Object){
		func(b Object) { b["messages"].([]any)[0].(map[string]any)["content"] = "different question" },
		func(b Object) {
			b["messages"].([]any)[1].(map[string]any)["content"] = []any{Object{"type": "text", "text": "different anchor"}}
		},
		func(b Object) {
			bad, _ := jsonCopyObject(call)
			bad["input"] = Object{"text": "modified"}
			b["messages"].([]any)[1].(map[string]any)["content"] = []any{bad, Object{"type": "text", "text": "anchor"}}
		},
		func(b Object) {
			b["messages"] = append(b["messages"].([]any), Object{"role": "user", "content": "extra"})
		},
	} {
		bad, _ := jsonCopyObject(base)
		alter(bad)
		if restoreAdvisorHistory(r, bad) == nil {
			t.Fatal("changed surrounding history was repaired permissively")
		}
	}
}
