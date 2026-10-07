package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func parseToolFixture(t *testing.T, tools []any, messages []any, beta string) (*Request, error) {
	t.Helper()
	raw, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "tools": tools, "messages": messages})
	h := http.Header{}
	h.Set("anthropic-beta", beta)
	return parsePolicyRequest(raw, h)
}
func fixtureUser() []any { return []any{Object{"role": "user", "content": "fixture"}} }

func TestRemovedTypedDeclarationCannotSilentlyBecomeMCP(t *testing.T) {
	messages := []any{Object{"role": "user", "content": "old"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "old", "name": "bash", "input": Object{"command": "fixture"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "old", "content": "done"}}}}
	if _, err := parseToolFixture(t, []any{}, messages, ""); err == nil {
		t.Fatal("ambiguous old typed identity was silently accepted")
	}
	if _, err := parseToolFixture(t, []any{Object{"name": "bash", "input_schema": Object{"type": "object"}}}, messages, ""); err != nil {
		t.Fatal("explicit ordinary client identity rejected", err)
	}
}

func TestAPIClientToolIdentityAndConfig(t *testing.T) {
	r, err := parseToolFixture(t, []any{Object{"type": "computer_toolset_20260801"}, Object{"type": "browser_toolset_20260801"}, Object{"name": "screenshot", "input_schema": Object{"type": "object"}}}, fixtureUser(), "")
	if err != nil {
		t.Fatal(err)
	}
	for _, set := range []string{"computer", "browser"} {
		block := Object{"name": "screenshot", "toolset_name": set}
		if r.apiResponseToolName(block) != "screenshot" {
			t.Fatal("toolset collision")
		}
	}
	if r.apiResponseToolName(Object{"name": "mcp__ccgateway__screenshot"}) != "screenshot" {
		t.Fatal("custom tool collided with toolset member")
	}
	if r.apiResponseToolName(Object{"name": "screenshot"}) != "" {
		t.Fatal("unqualified member incorrectly routed")
	}
	configs := Object{}
	for _, name := range apiToolsetMembers["browser_toolset_20260801"] {
		if toolsetMemberEnabled("browser_toolset_20260801", name, nil) {
			configs[name] = Object{"defer_loading": true}
		}
	}
	_, err = parseToolFixture(t, []any{Object{"type": "browser_toolset_20260801", "configs": configs}, Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}}, fixtureUser(), "")
	if err != nil {
		t.Fatalf("27 enabled browser members deferred with server search: %v", err)
	}
	for _, tools := range [][]any{
		{Object{"type": "bash_20250124", "name": "Bash"}},
		{Object{"type": "browser_toolset_20260801", "name": "browser"}},
		{Object{"type": "browser_toolset_20260801", "configs": Object{"javascript_exec": Object{"enabled": true, "defer_loading": true}}}},
		{Object{"type": "browser_toolset_20260801"}, Object{"name": "browser", "input_schema": Object{"type": "object"}}},
		{Object{"type": "browser_toolset_20260801", "allowed_callers": []any{"code_execution_20260120"}}},
	} {
		if _, err := parseToolFixture(t, tools, fixtureUser(), ""); err == nil {
			t.Fatalf("invalid typed tool accepted: %v", tools)
		}
	}
	msgs := []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "id1", "name": "screenshot", "toolset_name": "browser", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "id1", "toolset_name": "computer", "content": "wrong result"}}}}
	if _, err := parseToolFixture(t, []any{Object{"type": "browser_toolset_20260801"}}, msgs, ""); err == nil {
		t.Fatal("cross-toolset result accepted")
	}
}

func TestInlineToolTimelineBoundaries(t *testing.T) {
	base := Object{"name": "lookup", "input_schema": Object{"type": "object"}}
	change := func(kind, name string) Object {
		return Object{"role": "system", "content": []any{Object{"type": kind, "tool": Object{"type": "tool_reference", "name": name}}}}
	}
	for _, messages := range [][]any{
		{Object{"role": "user", "content": "x"}, change("tool_addition", "missing")},
		{Object{"role": "user", "content": "x"}, change("tool_removal", "lookup"), Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "id1", "name": "lookup", "input": Object{}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "id1", "content": "x"}}}},
	} {
		if _, err := parseToolFixture(t, []any{base}, messages, "inline-tools-2026-09-15"); err == nil {
			t.Fatal("invalid historical tool visibility accepted")
		}
	}
	definition := Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": base}}}}
	if _, err := parseToolFixture(t, []any{}, []any{Object{"role": "user", "content": "x"}, definition}, "mid-conversation-tool-changes-2026-07-01"); err == nil {
		t.Fatal("old beta accepted by-value definition")
	}
	if _, err := parseToolFixture(t, []any{base}, []any{Object{"role": "user", "content": "x"}, change("tool_addition", "lookup")}, ""); err == nil {
		t.Fatal("inline change accepted without beta")
	}
}

func TestToolsetKnownOmissionDoesNotMaskOtherChanges(t *testing.T) {
	want := Object{"type": "tool_use", "id": "id1", "name": "screenshot", "toolset_name": "browser", "input": Object{"tab_id": "t1"}}
	for _, alter := range []string{"id", "name", "input"} {
		actual, _ := jsonCopyObject(want)
		delete(actual, "toolset_name")
		if alter == "input" {
			actual[alter] = Object{"tab_id": "different"}
		} else {
			actual[alter] = "different"
		}
		if restoreKnownToolsetField(want, actual) == nil {
			t.Fatal("unknown history mutation restored", alter)
		}
		if _, exists := actual["toolset_name"]; exists {
			t.Fatal("failure mutated history")
		}
	}
	actual, _ := jsonCopyObject(want)
	delete(actual, "toolset_name")
	if err := restoreKnownToolsetField(want, actual); err != nil || digest(want) != digest(actual) {
		t.Fatal("known field not restored")
	}
}
