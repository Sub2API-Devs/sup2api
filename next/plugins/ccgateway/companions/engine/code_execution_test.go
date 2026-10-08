package engine

import (
	"encoding/json"
	"testing"
)

func codeResultFixture(outer, kind string) Object {
	content := Object{"type": kind}
	switch kind {
	case "code_execution_result", "bash_code_execution_result", "encrypted_code_execution_result":
		content["return_code"] = json.Number("-1")
		content["stderr"] = "fixture stderr"
		content["content"] = []any{}
		if kind == "encrypted_code_execution_result" {
			content["encrypted_stdout"] = "opaque_stdout"
		} else {
			content["stdout"] = "fixture stdout"
		}
	case "text_editor_code_execution_view_result":
		content["content"] = "fixture text"
		content["file_type"] = "text"
		content["num_lines"] = nil
	case "text_editor_code_execution_create_result":
		content["is_file_update"] = false
	case "text_editor_code_execution_str_replace_result":
		content["lines"] = []any{"new line"}
		content["new_start"] = json.Number("1")
		content["old_start"] = nil
	default:
		content["error_code"] = "unavailable"
	}
	return Object{"type": outer, "tool_use_id": "srv_exec", "content": content}
}

func TestCodeExecutionTypedUnions(t *testing.T) {
	for _, variant := range [][2]string{
		{"code_execution_tool_result", "code_execution_result"}, {"code_execution_tool_result", "encrypted_code_execution_result"}, {"code_execution_tool_result", "code_execution_tool_result_error"},
		{"bash_code_execution_tool_result", "bash_code_execution_result"}, {"bash_code_execution_tool_result", "bash_code_execution_tool_result_error"},
		{"text_editor_code_execution_tool_result", "text_editor_code_execution_view_result"}, {"text_editor_code_execution_tool_result", "text_editor_code_execution_create_result"}, {"text_editor_code_execution_tool_result", "text_editor_code_execution_str_replace_result"}, {"text_editor_code_execution_tool_result", "text_editor_code_execution_tool_result_error"},
	} {
		t.Run(variant[1], func(t *testing.T) {
			block := codeResultFixture(variant[0], variant[1])
			before := digest(block)
			if err := checkCodeExecutionResult(block); err != nil {
				t.Fatal(err)
			}
			if digest(block) != before {
				t.Fatal("opaque provider result mutated")
			}
			block["unexpected"] = true
			if err := checkCodeExecutionResult(block); err == nil {
				t.Fatal("unknown protocol field silently ignored")
			}
		})
	}
	block := codeResultFixture("code_execution_tool_result", "code_execution_result")
	block["content"].(Object)["content"] = []any{Object{"type": "code_execution_output", "file_id": "file_fixture"}}
	if err := checkCodeExecutionResult(block); err != nil {
		t.Fatal(err)
	}
	block["content"].(Object)["return_code"] = 0.25
	if err := checkCodeExecutionResult(block); err == nil {
		t.Fatal("fractional exit code accepted")
	}
}

func TestCodeExecutionVersionAndCallerShapes(t *testing.T) {
	for _, version := range []string{"20250522", "20250825", "20260120", "20260521"} {
		if err := checkCodeExecutionTool(Object{"type": "code_execution_" + version, "name": "code_execution"}); err != nil {
			t.Fatal(err)
		}
	}
	for _, value := range []any{Object{"type": "direct"}, Object{"type": "code_execution_20250825", "tool_id": "srv_parent"}, Object{"type": "code_execution_20260120", "tool_id": "srv_parent"}} {
		if err := checkProviderCaller(value); err != nil {
			t.Fatal(err)
		}
	}
	for _, value := range []any{nil, "direct", Object{"type": "direct", "tool_id": "srv_parent"}, Object{"type": "code_execution_20260120"}, Object{"type": "code_execution_20260521", "tool_id": "srv_parent"}} {
		if err := checkProviderCaller(value); err == nil {
			t.Fatal("invalid caller accepted", value)
		}
	}
}

func TestImplicitWebExecutionIsNotLocalToolPermission(t *testing.T) {
	tools := []Object{{"type": "web_search_20260318", "name": "web_search"}}
	if !providerExecutionCallDeclared(tools, "code_execution") || providerExecutionCallDeclared(tools, "bash_code_execution") || providerExecutionCallDeclared(tools, "Bash") {
		t.Fatal("implicit execution scope incorrect")
	}
	tools[0]["allowed_callers"] = []any{"direct"}
	if providerExecutionCallDeclared(tools, "code_execution") {
		t.Fatal("direct-only web unexpectedly enabled execution")
	}
	tools = []Object{{"type": "code_execution_20250522", "name": "code_execution"}}
	if providerExecutionCallDeclared(tools, "bash_code_execution") {
		t.Fatal("legacy Python upgraded to shell execution")
	}
	tools[0]["type"] = "code_execution_20260521"
	if !providerExecutionCallDeclared(tools, "bash_code_execution") {
		t.Fatal("explicit modern execution missing shell capability")
	}
}

func TestProviderContainerShapePreservesNullAndSkills(t *testing.T) {
	for _, value := range []any{nil, "container_fixture", Object{}, Object{"id": nil, "skills": nil}, Object{"id": "container_fixture", "skills": []any{Object{"type": "anthropic", "skill_id": "pptx"}, Object{"type": "custom", "skill_id": "skill_fixture", "version": "latest"}}}} {
		before := digest(value)
		if _, err := parseProviderContainer(value); err != nil {
			t.Fatal(err)
		}
		if digest(value) != before {
			t.Fatal("container input normalized or mutated")
		}
	}
	for _, value := range []any{true, []any{}, Object{"id": false}, Object{"skills": Object{}}, Object{"skills": []any{Object{"type": "local", "skill_id": "pptx"}}}, Object{"skills": []any{Object{"type": "custom", "skill_id": "s", "version": nil}}}, Object{"cwd": "/tmp"}} {
		if _, err := parseProviderContainer(value); err == nil {
			t.Fatal("invalid container accepted", value)
		}
	}
}

func TestPTCParentChildAndResultBatch(t *testing.T) {
	parent := Object{"type": "server_tool_use", "name": "code_execution", "id": "srv_exec", "input": Object{"code": "opaque program"}}
	child := func(id string) Object {
		return Object{"type": "tool_use", "name": "lookup", "id": id, "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	}
	ledger := newPTCLedger()
	if err := ledger.assistant(child("orphan")); err == nil {
		t.Fatal("orphan programmatic call accepted")
	}
	if err := ledger.assistant(parent); err != nil {
		t.Fatal(err)
	}
	if err := ledger.assistant(child("tool_a")); err != nil {
		t.Fatal(err)
	}
	if err := ledger.assistant(child("tool_b")); err != nil {
		t.Fatal(err)
	}
	result := func(id string) Object {
		return Object{"type": "tool_result", "tool_use_id": id, "content": "client result"}
	}
	if err := ledger.user([]Object{result("tool_a")}); err == nil {
		t.Fatal("partial programmatic result batch accepted")
	}
	if err := ledger.assistant(codeResultFixture("code_execution_tool_result", "code_execution_result")); err == nil {
		t.Fatal("execution completed before client results")
	}
	if err := ledger.user([]Object{result("tool_a"), result("tool_b")}); err != nil {
		t.Fatal(err)
	}
	if err := ledger.assistant(codeResultFixture("code_execution_tool_result", "code_execution_result")); err != nil {
		t.Fatal(err)
	}
	if err := ledger.assistant(child("late")); err == nil {
		t.Fatal("completed parent reused")
	}
}

func TestPTCCallerHistoryRestoreIsNarrow(t *testing.T) {
	child := Object{"type": "tool_use", "id": "tool_child", "name": "lookup", "input": Object{"n": json.Number("9007199254740993")}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_parent"}}
	r := &Request{Tools: []Tool{{Name: "lookup"}}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "before"}}}, {Role: "assistant", Content: []Object{child}}}}
	for _, mutation := range []string{"none", "input", "name", "caller", "position"} {
		t.Run(mutation, func(t *testing.T) {
			actual, _ := jsonCopyObject(r.wireMessage(r.Messages[1]).Content[0])
			delete(actual, "caller")
			user := Object{"role": "user", "content": []any{Object{"type": "text", "text": "before"}}}
			body := Object{"messages": []any{user, Object{"role": "assistant", "content": []any{actual}}}}
			switch mutation {
			case "input":
				actual["input"] = Object{"n": json.Number("9007199254740992")}
			case "name":
				actual["name"] = "other"
			case "caller":
				actual["caller"] = Object{"type": "code_execution_20260120", "tool_id": "wrong"}
			case "position":
				user["content"] = []any{Object{"type": "text", "text": "changed user context"}}
			}
			changed, err := r.restorePTCCallers(body)
			if mutation == "none" {
				if err != nil || !changed || digest(actual["caller"]) != digest(child["caller"]) {
					t.Fatal(changed, err)
				}
				if _, err := alignClientHistory(r, body); err != nil {
					t.Fatal(err)
				}
			} else if mutation == "position" {
				if err != nil {
					t.Fatal(err)
				}
				if _, err := alignClientHistory(r, body); err == nil {
					t.Fatal("caller repair authorized changed context")
				}
			} else if err == nil {
				t.Fatal("caller repair swallowed unrelated changes")
			}
		})
	}
}
