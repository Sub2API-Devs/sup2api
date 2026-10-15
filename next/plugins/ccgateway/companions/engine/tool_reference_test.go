package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// toolReferenceBody is Claude desktop's turn after its own ToolSearch loaded
// a deferred tool: the tool_result carries a tool_reference block.
func toolReferenceBody(reference string) Object {
	search := verifiedNativeToolCatalogues["2.1.292"]["ToolSearch"][0]
	deferred := true
	lookup := Tool{Name: "lookup_fixture", Description: "Look up a public fixture.", Schema: Object{"type": "object", "properties": Object{}}, DeferLoading: &deferred}
	return Object{"model": "claude-opus-5-5", "max_tokens": 256, "tools": []any{search, lookup}, "messages": []any{
		Object{"role": "user", "content": "load the lookup tool"},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_search", "name": "ToolSearch", "input": Object{"query": "select:lookup_fixture", "max_results": json.Number("5")}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_search", "content": []any{Object{"type": "tool_reference", "tool_name": reference}}}}},
	}}
}

func TestToolReferenceInToolResult(t *testing.T) {
	raw, err := json.Marshal(toolReferenceBody("lookup_fixture"))
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	matchNativeTools(r, "2.1.292")
	require.True(t, r.Native["ToolSearch"])
	wire := r.wireMessage(r.Messages[2]).Content[0]["content"].([]Object)
	assert.Equal(t, []Object{{"type": "tool_reference", "tool_name": "mcp__ccgateway__lookup_fixture"}}, wire)
	assert.Equal(t, "lookup_fixture", str(r.Messages[2].Content[0]["content"].([]Object)[0], "tool_name"), "client history must not be rewritten")

	for name, body := range map[string]Object{
		"undeclared": toolReferenceBody("missing_fixture"),
		"extra-key":  toolReferenceBody("lookup_fixture"),
	} {
		if name == "extra-key" {
			ref := body["messages"].([]any)[2].(Object)["content"].([]any)[0].(Object)["content"].([]any)[0].(Object)
			ref["extra"] = true
		}
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, nil)
		assert.Error(t, err, name)
	}
}

func TestToolReferenceMixedContentAndNativeNames(t *testing.T) {
	body := toolReferenceBody("lookup_fixture")
	result := body["messages"].([]any)[2].(Object)["content"].([]any)[0].(Object)
	result["content"] = []any{
		Object{"type": "text", "text": "Tools loaded"},
		Object{"type": "tool_reference", "tool_name": "lookup_fixture"},
		Object{"type": "tool_reference", "tool_name": "ToolSearch"},
	}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	r, err := parsePolicyRequest(raw, nil)
	require.NoError(t, err)
	matchNativeTools(r, "2.1.292")
	want := []Object{
		{"type": "text", "text": "Tools loaded"},
		{"type": "tool_reference", "tool_name": "mcp__ccgateway__lookup_fixture"},
		{"type": "tool_reference", "tool_name": "ToolSearch"},
	}
	assert.Equal(t, want, r.wireMessage(r.Messages[2]).Content[0]["content"])
	assert.Equal(t, want, r.wireMessage(r.Messages[2]).Content[0]["content"], "serializing twice must not double-prefix names")
}

func TestToolReferenceRejectsMalformedNamesAndTopLevelBlocks(t *testing.T) {
	for _, name := range []any{nil, "", 42, "invalid tool", strings.Repeat("a", 65)} {
		body := toolReferenceBody("lookup_fixture")
		ref := body["messages"].([]any)[2].(Object)["content"].([]any)[0].(Object)["content"].([]any)[0].(Object)
		ref["tool_name"] = name
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		_, err = parsePolicyRequest(raw, nil)
		require.Error(t, err)
	}
	body := toolReferenceBody("lookup_fixture")
	body["messages"].([]any)[0].(Object)["content"] = []any{Object{"type": "tool_reference", "tool_name": "lookup_fixture"}}
	raw, err := json.Marshal(body)
	require.NoError(t, err)
	_, err = parsePolicyRequest(raw, nil)
	require.ErrorContains(t, err, `unsupported content block "tool_reference"`)
}

// The real CLI replays the client's search result and loads the referenced
// tool for the next model request.
func TestRealCLIToolReferenceHistory(t *testing.T) {
	var answered atomic.Int32
	handler := func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			io.WriteString(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		if !bytes.Contains(raw, []byte(`"tool_reference"`)) {
			t.Errorf("no tool_reference reached the model request")
		}
		if !bytes.Contains(raw, []byte(`"tool_name":"mcp__ccgateway__lookup_fixture"`)) {
			t.Errorf("tool_reference not mapped to the CLI tool name: %s", raw)
		}
		answered.Add(1)
		rec := httptest.NewRecorder()
		wire, _ := decodeObject(raw)
		writeSurfaceFixture(rec, str(wire, "model"), []Object{{"type": "text", "text": "REF_DONE"}})
		w.Header().Set("Content-Type", "text/event-stream")
		w.Write(bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid())))
	}
	endpoint, _ := newThinkingOutputFixture(t, handler)
	raw, _ := json.Marshal(toolReferenceBody("lookup_fixture"))
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	out, _ := io.ReadAll(res.Body)
	res.Body.Close()
	require.Equal(t, 200, res.StatusCode, string(out))
	require.Contains(t, string(out), "REF_DONE")
	require.Equal(t, int32(1), answered.Load())
}
