package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIMCPSafeguardsPreserveProviderContext(t *testing.T) {
	var calls atomic.Int32
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "MCP classifier fixture"}}
	guard := []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"live_cwd": "D:/external-client", "rules": []any{"deny destructive MCP operations"}, "opaque": Object{"preserve": true}}}}
	body["safeguards"] = guard
	verdict := []any{Object{"tool_use_id": "mcp_safeguard", "decision": "deny", "synthetic_fixture": true}}
	handler := func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		if digest(wire["safeguards"]) != digest(guard) || digest(wire["tools"]) != digest(body["tools"]) || digest(wire["mcp_servers"]) != digest(body["mcp_servers"]) {
			t.Error("MCP classifier/tool/server execution context changed")
		}
		recorder := httptest.NewRecorder()
		writeSurfaceFixture(recorder, str(wire, "model"), []Object{{"type": "text", "text": "SAFEGUARD_CONTEXT_FORWARDED"}})
		w.Header().Set("Content-Type", "text/event-stream")
		for _, line := range strings.Split(recorder.Body.String(), "\n") {
			if strings.HasPrefix(line, "data:") {
				event, _ := decodeObject([]byte(strings.TrimSpace(strings.TrimPrefix(line, "data:"))))
				if str(event, "type") == "message_delta" {
					event["safeguard_results"] = verdict
				}
				data, _ := json.Marshal(event)
				line = "data: " + string(data)
			}
			fmt.Fprintln(w, line)
		}
	}
	endpoint, _ := newThinkingOutputFixture(t, handler)
	for _, stream := range []bool{false, true} {
		body["stream"] = stream
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
		req.Header.Set("Anthropic-Beta", mcpConnectorBeta+",dangerous-tool-use-2026-09-03")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 || !bytes.Contains(raw, []byte("synthetic_fixture")) {
			t.Fatalf("HTTP%d %s", res.StatusCode, raw)
		}
	}
	if calls.Load() != 2 {
		t.Fatal("auxiliary generation changed", calls.Load())
	}
}
func TestMCPSafeguardsKeepIdentityRestrictions(t *testing.T) {
	body := mcpInlineFixture()
	body["safeguards"] = []any{Object{"type": "dangerous_tool_use"}}
	if _, err := parseMCPInline(body); err == nil {
		t.Fatal("inline opaque context accepted")
	}
	body = mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "fixture"}}
	body["safeguards"] = []any{Object{"type": "dangerous_tool_use"}}
	body["tools"] = append(body["tools"].([]any), Object{"name": "renamed", "input_schema": Object{"type": "object"}})
	req, err := parseMCPInline(body)
	if err != nil {
		t.Fatal(err)
	}
	if err := req.validateSafeguardTools(Object{"tools": []any{Object{"name": "mcp__ccgateway__renamed", "input_schema": Object{"type": "object"}}}}); err == nil {
		t.Fatal("opaque context survived renamed tool")
	}
	body["mcp_servers"].([]any)[0].(Object)["name"] = "ccgateway"
	body["tools"].([]any)[0].(Object)["mcp_server_name"] = "ccgateway"
	if _, err := parseMCPInline(body); err == nil {
		t.Fatal("classifier namespace collision admitted")
	}
}
