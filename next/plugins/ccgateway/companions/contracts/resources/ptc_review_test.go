package resources

import (
	"encoding/json"
	"slices"
	"testing"
)

func TestReviewResourceCapabilityPositions(t *testing.T) {
	for _, test := range []struct {
		name, body string
		outputs    bool
	}{
		{"null reset", `{"container":null,"messages":[]}`, false},
		{"new container", `{"container":{},"messages":[]}`, true},
		{"inline execution", `{"messages":[{"role":"system","content":[{"type":"tool_addition","tool":{"type":"tool_definition","definition":{"type":"code_execution_20260120","name":"code_execution"}}}]}]}`, true},
		{"compacted execution", `{"messages":[{"role":"assistant","content":[{"type":"compaction","content":"summary","tool_changes":[{"type":"tool_addition","tool":{"type":"tool_definition","definition":{"type":"code_execution_20260120","name":"code_execution"}}}]}]}]}`, true},
		{"opaque tool input", `{"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"x","name":"client","input":{"container":{},"caller":{"type":"code_execution_20260120","tool_id":"unknown"},"tools":[{"type":"code_execution_20260120"}]}}]}]}`, false},
		{"opaque text", `{"messages":[{"role":"user","content":"container code_execution_20260120 tool_addition"}]}`, false},
	} {
		t.Run(test.name, func(t *testing.T) {
			info, e := InspectRequest([]byte(test.body))
			if e != nil || info.Outputs != test.outputs {
				t.Fatalf("outputs=%v error=%v", info.Outputs, e)
			}
		})
	}
}

func TestReviewProgrammaticHistoryParentLifetime(t *testing.T) {
	parent := map[string]any{"type": "server_tool_use", "id": "p", "name": "code_execution", "input": map[string]any{}}
	child := map[string]any{"type": "tool_use", "id": "child", "name": "lookup", "input": map[string]any{}, "caller": map[string]any{"type": "code_execution_20260120", "tool_id": "p"}}
	finish := map[string]any{"type": "code_execution_tool_result", "tool_use_id": "p", "content": map[string]any{"type": "code_execution_result", "content": []any{}}}
	for _, test := range []struct {
		name    string
		blocks  []any
		pending []string
		fail    bool
	}{
		{"pending", []any{parent, child}, []string{"p"}, false},
		{"finished", []any{parent, child, finish}, nil, false},
		{"unknown", []any{child}, nil, true},
		{"closed parent", []any{parent, finish, child}, nil, true},
		{"duplicate active parent", []any{parent, child, parent}, nil, true},
	} {
		t.Run(test.name, func(t *testing.T) {
			raw, _ := json.Marshal(map[string]any{"messages": []any{map[string]any{"role": "assistant", "content": test.blocks}}})
			info, e := InspectRequest(raw)
			if (e != nil) != test.fail || e == nil && !slices.Equal(info.PendingPTCParents, test.pending) {
				t.Fatalf("pending=%v error=%v", info.PendingPTCParents, e)
			}
		})
	}
}

func TestReviewSkillSelectorPositionsAndExactPaths(t *testing.T) {
	raw := []byte(`{"container":{"skills":[{"type":"custom","skill_id":"owned"},{"type":"anthropic","skill_id":"pptx","version":"latest"}]},"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"x","name":"client","input":{"container":{"skills":[{"type":"custom","skill_id":"opaque"}]}}}]}]}`)
	info, e := InspectRequest(raw)
	want := []SkillReference{{Path: "container.skills.0.version", ParentID: "owned", Selector: "latest"}}
	if e != nil || !slices.Equal(info.SkillVersions, want) || len(info.References) != 1 {
		t.Fatal(info, e)
	}
}

func TestReviewNestedServerCallerRemainsBoundAndOpaqueInputsDoNotBind(t *testing.T) {
	raw := []byte(`{"messages":[{"role":"assistant","content":[{"type":"server_tool_use","id":"outer","name":"code_execution","input":{}},{"type":"server_tool_use","id":"inner","name":"code_execution","input":{},"caller":{"type":"code_execution_20260120","tool_id":"outer"}},{"type":"tool_use","id":"leaf","name":"lookup","input":{"caller":{"type":"code_execution_20260120","tool_id":"opaque"}},"caller":{"type":"code_execution_20260120","tool_id":"inner"}}]}]}`)
	info, e := InspectRequest(raw)
	if e != nil || !slices.Equal(info.PendingPTCParents, []string{"inner", "outer"}) {
		t.Fatal(info, e)
	}
	response := []byte(`{"type":"message","content":[{"type":"server_tool_use","id":"inner","name":"code_execution","input":{"caller":{"type":"code_execution_20260120","tool_id":"opaque"}},"caller":{"type":"code_execution_20260120","tool_id":"outer"}}]}`)
	ids, e := ResponsePTCParents(response)
	if e != nil || !slices.Equal(ids, []string{"outer"}) {
		t.Fatal(ids, e)
	}
}
