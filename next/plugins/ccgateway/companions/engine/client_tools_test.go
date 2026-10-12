package engine

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func parseToolFixture(t *testing.T, tools []any, messages []any, beta string) (*Request, error) {
	t.Helper()
	raw, err := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "tools": tools, "messages": messages})
	require.NoError(t, err)
	h := http.Header{}
	h.Set("anthropic-beta", beta)
	return parsePolicyRequest(raw, h)
}
func fixtureUser() []any { return []any{Object{"role": "user", "content": "fixture"}} }

func TestRemovedTypedDeclarationCannotSilentlyBecomeMCP(t *testing.T) {
	messages := []any{Object{"role": "user", "content": "old"}, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "old", "name": "bash", "input": Object{"command": "fixture"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "old", "content": "done"}}}}
	r, err := parseToolFixture(t, []any{}, messages, "")
	require.NoError(t, err)
	assert.Equal(t, "bash", str(r.wireMessage(r.Messages[1]).Content[0], "name"), "completed history must not be renamed")
	assert.Empty(t, r.Tools, "completed history must not register a tool")
	r, err = parseToolFixture(t, []any{Object{"name": "bash", "input_schema": Object{"type": "object"}}}, messages, "")
	require.NoError(t, err, "explicit ordinary client identity must remain supported")
	assert.Equal(t, "mcp__ccgateway__bash", str(r.wireMessage(r.Messages[1]).Content[0], "name"))
	assert.Equal(t, "bash", r.apiResponseToolName(Object{"name": "mcp__ccgateway__bash"}))
}

func TestNativeRejectsTypedToolsetDeclaration(t *testing.T) {
	r, err := parseToolFixture(t, []any{Object{"type": "browser_toolset_20260801"}}, fixtureUser(), "")
	require.ErrorContains(t, err, `tool type "browser_toolset_20260801" is not supported by this gateway`)
	assert.Nil(t, r)
}

func TestToolsetKnownOmissionDoesNotMaskOtherChanges(t *testing.T) {
	want := Object{"type": "tool_use", "id": "id1", "name": "screenshot", "toolset_name": "browser", "input": Object{"tab_id": "t1"}}
	for _, alter := range []string{"id", "name", "input"} {
		t.Run(alter, func(t *testing.T) {
			actual, err := jsonCopyObject(want)
			require.NoError(t, err)
			delete(actual, "toolset_name")
			if alter == "input" {
				actual[alter] = Object{"tab_id": "different"}
			} else {
				actual[alter] = "different"
			}
			require.Error(t, restoreKnownToolsetField(want, actual), "unknown history mutation must not be restored")
			assert.NotContains(t, actual, "toolset_name", "failure must not mutate history")
		})
	}
	actual, err := jsonCopyObject(want)
	require.NoError(t, err)
	delete(actual, "toolset_name")
	require.NoError(t, restoreKnownToolsetField(want, actual))
	assert.Equal(t, want, actual, "known field must be restored exactly")
}
