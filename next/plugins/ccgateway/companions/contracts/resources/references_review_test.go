package resources

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestReviewContainerAndSkillReferencePaths(t *testing.T) {
	for _, tc := range []struct {
		body string
		want []Reference
	}{
		{`{"container":"container_public"}`, []Reference{{"container", "container_public", KindContainer}}},
		{`{"container":{"id":"container_public","skills":[{"type":"custom","skill_id":"skill_public","version":"version_opaque"},{"type":"anthropic","skill_id":"builtin"}]}}`, []Reference{{"container.id", "container_public", KindContainer}, {"container.skills.0.skill_id", "skill_public", KindSkill}}},
		{`{"container":null,"tools":[{"input_schema":{"container":"ignored"}}],"messages":[{"content":[{"type":"tool_use","input":{"container":"ignored","source":{"type":"file","file_id":"ignored"}}},{"type":"text","text":"{\"file_id\":\"ignored\"}"}]}]}`, nil},
	} {
		got, e := ScanReferences([]byte(tc.body))
		if e != nil || !reflect.DeepEqual(got, tc.want) {
			t.Fatalf("got=%+v want=%+v err=%v", got, tc.want, e)
		}
	}
}

func TestReviewExecutionArtifactsIgnoreOpaquePayloads(t *testing.T) {
	for _, tc := range []struct{ block, result, output string }{
		{"code_execution_tool_result", "code_execution_result", "code_execution_output"},
		{"code_execution_tool_result", "encrypted_code_execution_result", "code_execution_output"},
		{"bash_code_execution_tool_result", "bash_code_execution_result", "bash_code_execution_output"},
	} {
		payload := map[string]any{"type": "message", "content": []any{map[string]any{"type": tc.block, "content": map[string]any{"type": tc.result, "return_code": json.Number("9007199254740993"), "encrypted_stdout": `{"file_id":"secret_opaque"}`, "stdout": `{"container":"ignored"}`, "content": []any{map[string]any{"type": tc.output, "file_id": "file_generated"}}}}}}
		raw, _ := json.Marshal(payload)
		before := string(raw)
		got, e := ScanResponseReferences(raw)
		want := []Reference{{"content.0.content.content.0.file_id", "file_generated", KindFile}}
		if e != nil || !reflect.DeepEqual(got, want) || string(raw) != before {
			t.Fatal(got, e)
		}
		obj, e := referenceObject(raw)
		if e != nil {
			t.Fatal(e)
		}
		result := obj["content"].([]any)[0].(map[string]any)["content"].(map[string]any)
		if result["return_code"] != json.Number("9007199254740993") {
			t.Fatal("parser lost integer precision")
		}
		payload["messages"] = []any{map[string]any{"role": "assistant", "content": payload["content"]}}
		delete(payload, "content")
		raw, _ = json.Marshal(payload)
		got, e = ScanReferences(raw)
		if e != nil || len(got) != 1 || got[0].Path != "messages.0.content.0.content.content.0.file_id" {
			t.Fatal("history location", got, e)
		}
	}
}

func TestReviewResponseContainerEventLocations(t *testing.T) {
	for _, tc := range []struct{ body, path string }{
		{`{"type":"message","container":{"id":"c"}}`, "container.id"},
		{`{"type":"message_start","message":{"container":{"id":"c"}}}`, "message.container.id"},
		{`{"type":"message_delta","delta":{"container":{"id":"c"}}}`, "delta.container.id"},
		{`{"type":"message_delta","container":{"id":"c"}}`, "container.id"},
		{`{"type":"message_stop","container":{"id":"c"}}`, "container.id"},
	} {
		got, e := ScanResponseReferences([]byte(tc.body))
		if e != nil || len(got) != 1 || got[0].Path != tc.path {
			t.Fatalf("%s: %v %v", tc.path, got, e)
		}
	}
	for _, body := range []string{`{"type":"message_delta","delta":{"text":"container c"},"metadata":{"container":{"id":"ignored"}}}`, `{"type":"content_block_delta","delta":{"partial_json":"{\"file_id\":\"ignored\"}"}}`} {
		if got, e := ScanResponseReferences([]byte(body)); e != nil || len(got) != 0 {
			t.Fatal("unregistered event location scanned", got, e)
		}
	}
	if _, e := ScanResponseReferences([]byte(`{"type":"message","container":"a","\u0063ontainer":"b"}`)); e == nil {
		t.Fatal("escaped duplicate member accepted")
	}
}

func TestReviewExecutionResultIdentityMismatchRejected(t *testing.T) {
	for _, body := range []string{
		`{"type":"message","content":[{"type":"bash_code_execution_tool_result","content":{"type":"code_execution_result","content":[{"type":"code_execution_output","file_id":"f"}]}}]}`,
		`{"type":"message","content":[{"type":"code_execution_tool_result","content":{"type":"code_execution_result","content":[{"type":"bash_code_execution_output","file_id":"f"}]}}]}`,
	} {
		_, e := ScanResponseReferences([]byte(body))
		if e == nil {
			t.Fatal("invalid registered identity accepted", body)
		}
	}
	if _, e := ScanReferences([]byte(`{"container":{"skills":[{"type":"custom"}]}}`)); e == nil {
		t.Fatal("custom skill without identity accepted")
	}
}
