package engine

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeRejectsExecutionDespiteResourceAuthority(t *testing.T) {
	grant := &resourceAdmission{outputs: true, kinds: map[string]map[string]bool{"container": {"container_good": true}}, contexts: map[string]string{"srv_exec": "container_good"}}
	for _, tc := range []struct {
		name  string
		field string
		value any
		want  string
	}{
		{"execution", "tools", []any{Object{"type": "code_execution_20260120", "name": "code_execution"}}, `server tool "code_execution_20260120" is not supported by this gateway`},
		{"owned-container", "container", "container_good", "container is not supported by this gateway"},
		{"null-container", "container", nil, "container is not supported by this gateway"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := basic()
			body[tc.field] = tc.value
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			req, err := parsePolicyRequestWithResources(raw, nil, grant)
			require.ErrorContains(t, err, tc.want)
			assert.Nil(t, req)
		})
	}
}

// These unit tests protect protocol validation, not native execution admission.
func TestPTCContextOnlyForStillPendingExecution(t *testing.T) {
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	base := []Message{{Role: "user", Content: []Object{{"type": "text", "text": "fixture"}}}, {Role: "assistant", Content: []Object{parent, call}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "result"}}}}
	grant := &resourceAdmission{outputs: true, kinds: map[string]map[string]bool{"container": {"container_good": true, "container_other": true}}, contexts: map[string]string{"srv_exec": "container_good"}}
	req := &Request{resources: grant, Plan: &RequestPlan{container: &providerContainerPlan{ID: "container_good"}}, Messages: base}
	require.NoError(t, req.configureProviderExecution())
	req.Plan.container.ID = "container_other"
	require.Error(t, req.configureProviderExecution(), "parent must not move to a different owned container")
	req.Plan.container = nil
	require.Error(t, req.configureProviderExecution(), "pending parent requires a container")
	req.Messages = append(append([]Message{}, base...), Message{Role: "assistant", Content: []Object{codeResultFixture("code_execution_tool_result", "code_execution_result")}}, Message{Role: "user", Content: []Object{{"type": "text", "text": "new work"}}})
	require.NoError(t, req.configureProviderExecution(), "completed history must not remain tied to an old container")
}

func TestPTCParentRestorationRequiresOriginalTurn(t *testing.T) {
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{"code": "original"}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "user original"}}}, {Role: "assistant", Content: []Object{parent, call}}}}
	wireCall := req.wireMessage(req.Messages[1]).Content[1]
	body := Object{"messages": []any{Object{"role": "user", "content": "user original"}, Object{"role": "assistant", "content": []any{wireCall}}}}
	require.NoError(t, restoreProtocolHistory(req, body))
	_, err := alignClientHistory(req, body)
	require.NoError(t, err)
	body["messages"].([]any)[0].(Object)["content"] = "different user"
	require.Error(t, restoreProtocolHistory(req, body), "parent repair must check previous context")
	altered, err := jsonCopyObject(parent)
	require.NoError(t, err)
	altered["input"] = Object{"code": "changed"}
	assert.False(t, req.ptcHistoryParent(altered), "parent contents must remain exact")
}
