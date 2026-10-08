package engine

import (
	"encoding/json"
	"testing"
)

func completedHistoryBody(name string) Object {
	b := basic()
	b["messages"] = []any{Object{"role": "user", "content": "fixture"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "old", "name": name, "input": Object{"n": json.Number("9007199254740993")}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "old", "content": "done"}}}, Object{"role": "assistant", "content": "completed"}, Object{"role": "user", "content": "next"}}
	return b
}
func TestCompletedClientHistoryDoesNotAuthorizeExecution(t *testing.T) {
	for _, name := range []string{"bash", "retired_fixture", "ToolSearch"} {
		t.Run(name, func(t *testing.T) {
			body := completedHistoryBody(name)
			raw, _ := json.Marshal(body)
			r, err := parsePolicyRequest(raw, nil)
			if err != nil {
				t.Fatal(err)
			}
			old := r.Messages[1].Content[0]
			wire := r.wireMessage(r.Messages[1]).Content[0]
			if digest(old) != digest(wire) {
				t.Fatal("history rewritten")
			}
			if len(r.Tools) != 0 || len(r.enabledTools()) != 0 || clientToolName(r, name) != "" || r.apiResponseToolName(old) != "" {
				t.Fatal("history granted execution")
			}
			r.ToolSearch = "true"
			if internalHistoryAssistant(r, Object{"content": []Object{wire}}) {
				t.Fatal("history consumed as helper")
			}
			changed, _ := jsonCopyObject(old)
			changed["input"] = Object{}
			if r.completedClientHistoryBlock(changed) {
				t.Fatal("identity accepted changed input")
			}
		})
	}
}
func TestCompletedClientHistoryPendingAndCurrentCatalog(t *testing.T) {
	body := completedHistoryBody("bash")
	body["messages"] = body["messages"].([]any)[:2]
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, nil); err == nil {
		t.Fatal("pending history admitted")
	}
	body = completedHistoryBody("fixture")
	body["tools"] = []any{Object{"name": "fixture", "input_schema": Object{"type": "object"}}}
	raw, _ = json.Marshal(body)
	r, err := parsePolicyRequest(raw, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.completedClientHistory) != 0 || str(r.wireMessage(r.Messages[1]).Content[0], "name") != "mcp__ccgateway__fixture" {
		t.Fatal("current catalog bypassed")
	}
}

func TestCompletedClientHistoryPairingAndSnapshotScope(t *testing.T) {
	for _, mode := range []string{"duplicate", "wrong-result", "reordered"} {
		b := completedHistoryBody("bash")
		ms := b["messages"].([]any)
		switch mode {
		case "duplicate":
			ms[1].(Object)["content"] = append(ms[1].(Object)["content"].([]any), ms[1].(Object)["content"].([]any)[0])
		case "wrong-result":
			ms[2].(Object)["content"].([]any)[0].(Object)["tool_use_id"] = "other"
		case "reordered":
			ms[1], ms[2] = ms[2], ms[1]
		}
		raw, _ := json.Marshal(b)
		if _, err := parsePolicyRequest(raw, nil); err == nil {
			t.Fatalf("%s accepted", mode)
		}
	}
	raw, _ := json.Marshal(completedHistoryBody("bash"))
	r, err := parsePolicyRequest(raw, nil)
	if err != nil {
		t.Fatal(err)
	}
	original := r.configKey()
	r.completedClientHistory["another"] = "fingerprint"
	if original != r.configKey() {
		t.Fatal("growing history invalidated configuration key")
	}
	r.completedClientHistory = nil
	if original == r.configKey() {
		t.Fatal("legacy renamed snapshot not isolated")
	}
	r, err = parsePolicyRequest(raw, nil)
	if err != nil {
		t.Fatal(err)
	}
	r.CustomToolPrefix = "different"
	r.NoTools = true
	if str(r.wireMessage(r.Messages[1]).Content[0], "name") != "bash" || len(r.enabledTools()) != 0 {
		t.Fatal("configuration changed history identity or execution authority")
	}
}

func TestCompletedClientHistoryExplicitDirectAndToolset(t *testing.T) {
	for _, toolset := range []string{"", "computer"} {
		b := completedHistoryBody("screenshot")
		ms := b["messages"].([]any)
		call := ms[1].(Object)["content"].([]any)[0].(Object)
		result := ms[2].(Object)["content"].([]any)[0].(Object)
		call["caller"] = Object{"type": "direct"}
		if toolset != "" {
			call["toolset_name"] = toolset
			result["toolset_name"] = toolset
		}
		raw, _ := json.Marshal(b)
		r, err := parsePolicyRequest(raw, nil)
		if err != nil {
			t.Fatal(err)
		}
		if digest(r.wireMessage(r.Messages[1]).Content[0]) != digest(call) {
			t.Fatal("explicit direct/toolset fields changed")
		}
		call["caller"].(Object)["tool_id"] = "server_parent"
		raw, _ = json.Marshal(b)
		if _, err := parsePolicyRequest(raw, nil); err == nil {
			t.Fatal("direct caller smuggled server parent")
		}
	}
}
