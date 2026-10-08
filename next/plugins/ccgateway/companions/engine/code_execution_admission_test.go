package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestExecutionResourceAdmission(t *testing.T) {
	base := Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "fixture"}}, "tools": []any{Object{"type": "code_execution_20260120", "name": "code_execution"}}}
	raw, _ := json.Marshal(base)
	if _, err := parsePolicyRequestWithResources(raw, http.Header{}, nil); err == nil || !strings.Contains(err.Error(), "output registration") {
		t.Fatalf("no output authority: %v", err)
	}
	grant := &resourceAdmission{outputs: true, kinds: map[string]map[string]bool{"container": {"container_good": true}, "skill": {"skill_good": true}}, contexts: map[string]string{"srv_exec": "container_good"}}
	if _, err := parsePolicyRequestWithResources(raw, http.Header{}, grant); err != nil {
		t.Fatal(err)
	}
	for _, container := range []any{"container_other", Object{"id": "container_good", "skills": []any{Object{"type": "custom", "skill_id": "skill_other"}}}} {
		base["container"] = container
		raw, _ = json.Marshal(base)
		if _, err := parsePolicyRequestWithResources(raw, http.Header{}, grant); err == nil {
			t.Fatal("unowned container/skill accepted")
		}
	}
	grant.skillVersions = map[resources.AdmissionSkillVersion]bool{{SkillID: "skill_good", Version: "version_registered"}: true}
	for _, version := range []string{"", "latest", "version_other"} {
		base["container"] = Object{"id": "container_good", "skills": []any{Object{"type": "custom", "skill_id": "skill_good", "version": version}}}
		raw, _ = json.Marshal(base)
		if _, err := parsePolicyRequestWithResources(raw, http.Header{}, grant); err == nil {
			t.Fatalf("unregistered skill version %q accepted", version)
		}
	}
	base["container"] = Object{"id": "container_good", "skills": []any{Object{"type": "custom", "skill_id": "skill_good", "version": "version_registered"}}}
	raw, _ = json.Marshal(base)
	req, err := parsePolicyRequestWithResources(raw, http.Header{}, grant)
	if err != nil {
		t.Fatal(err)
	}
	if digest(req.Plan.MainRequestFields()["container"]) != digest(base["container"]) {
		t.Fatal("container/skill plan changed")
	}
}

func TestNullContainerDoesNotRequireResourceAuthority(t *testing.T) {
	raw := []byte(`{"model":"claude-opus-5-5","max_tokens":64,"container":null,"messages":[{"role":"user","content":"reset"}]}`)
	req, err := parsePolicyRequestWithResources(raw, http.Header{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if value, exists := req.Plan.MainRequestFields()["container"]; !exists || value != nil {
		t.Fatal("explicit container reset was lost")
	}
}

func TestPTCContextOnlyForStillPendingExecution(t *testing.T) {
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	base := []Message{{Role: "user", Content: []Object{{"type": "text", "text": "fixture"}}}, {Role: "assistant", Content: []Object{parent, call}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "result"}}}}
	grant := &resourceAdmission{outputs: true, kinds: map[string]map[string]bool{"container": {"container_good": true, "container_other": true}}, contexts: map[string]string{"srv_exec": "container_good"}}
	req := &Request{resources: grant, Plan: &RequestPlan{container: &providerContainerPlan{ID: "container_good"}}, Messages: base}
	if err := req.configureProviderExecution(); err != nil {
		t.Fatal(err)
	}
	req.Plan.container.ID = "container_other"
	if err := req.configureProviderExecution(); err == nil {
		t.Fatal("parent moved to a different owned container")
	}
	req.Plan.container = nil
	if err := req.configureProviderExecution(); err == nil {
		t.Fatal("pending parent lost container")
	}
	req.Messages = append(append([]Message{}, base...), Message{Role: "assistant", Content: []Object{codeResultFixture("code_execution_tool_result", "code_execution_result")}}, Message{Role: "user", Content: []Object{{"type": "text", "text": "new work"}}})
	if err := req.configureProviderExecution(); err != nil {
		t.Fatalf("completed history unnecessarily tied to old container: %v", err)
	}
}

func TestPTCParentRestorationRequiresOriginalTurn(t *testing.T) {
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{"code": "original"}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "user original"}}}, {Role: "assistant", Content: []Object{parent, call}}}}
	wireCall := req.wireMessage(req.Messages[1]).Content[1]
	body := Object{"messages": []any{Object{"role": "user", "content": "user original"}, Object{"role": "assistant", "content": []any{wireCall}}}}
	if err := restoreProtocolHistory(req, body); err != nil {
		t.Fatal(err)
	}
	if _, err := alignClientHistory(req, body); err != nil {
		t.Fatal(err)
	}
	body["messages"].([]any)[0].(Object)["content"] = "different user"
	if err := restoreProtocolHistory(req, body); err == nil {
		t.Fatal("parent repair ignored previous context")
	}
	altered, _ := jsonCopyObject(parent)
	altered["input"] = Object{"code": "changed"}
	if req.ptcHistoryParent(altered) {
		t.Fatal("parent contents ignored")
	}
}

func TestExecutionInlineAliasesAndWithdrawal(t *testing.T) {
	definition := Object{"type": "code_execution_20260120", "name": "code_execution"}
	messages := []any{
		Object{"role": "user", "content": "start"},
		Object{"role": "system", "content": []any{timelineChange("tool_addition", Object{"type": "tool_definition", "definition": definition})}},
		Object{"role": "assistant", "content": []any{Object{"type": "server_tool_use", "id": "srv_exec", "name": "bash_code_execution", "input": Object{}}, codeResultFixture("bash_code_execution_tool_result", "bash_code_execution_result")}},
		Object{"role": "user", "content": "remove execution"},
		Object{"role": "system", "content": []any{timelineChange("tool_removal", Object{"type": "tool_reference", "name": "code_execution"})}},
	}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "tools": []any{}, "messages": messages}
	raw, _ := json.Marshal(body)
	h := http.Header{"Anthropic-Beta": []string{"inline-tools-2026-09-15"}}
	req, err := parsePolicyRequestWithResources(raw, h, &resourceAdmission{outputs: true, ids: map[string]bool{"file_fixture": true}})
	if err != nil {
		t.Fatal(err)
	}
	if req.hasServerSearch("bash_code_execution") || req.hasServerSearch("code_execution") {
		t.Fatal("removed parent still authorized a subtool")
	}
	if !req.declaresServerTool("bash_code_execution") {
		t.Fatal("withdrawal lost historical transport identity")
	}
}
