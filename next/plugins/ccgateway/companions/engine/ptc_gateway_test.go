package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func TestRealCLIPTCGateway(t *testing.T) {
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{"code": "fixture"}}
	caller := Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}
	var calls atomic.Int32
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if bytes.Contains(raw, []byte("PTC_RESULT")) {
			history, _ := body["messages"].([]any)
			seen := false
			for _, m := range history {
				message, _ := m.(Object)
				blocks, _ := historyContent(message["content"])
				for _, block := range blocks {
					if str(block, "id") == "tool_ptc" {
						seen = digest(block["caller"]) == digest(caller)
					}
				}
			}
			if !seen {
				t.Error("programmatic caller lost or changed")
			}
			writeExecutionFixture(w, str(body, "model"), []Object{codeResultFixture("code_execution_tool_result", "code_execution_result"), {"type": "text", "text": "PTC_DONE"}})
			return
		}
		name := ""
		tools, _ := body["tools"].([]any)
		for _, value := range tools {
			tool, _ := value.(Object)
			if str(tool, "type") == "" || str(tool, "type") == "custom" {
				name = str(tool, "name")
			}
		}
		if name == "" {
			t.Error("missing client tool")
		}
		writeExecutionFixture(w, str(body, "model"), []Object{parent, {"type": "tool_use", "id": "tool_ptc", "name": name, "input": Object{"value": "fixture"}, "caller": caller}})
	})
	endpoint, identity := executionGatewayFixture(t, handler)
	initial := []any{Object{"role": "user", "content": "programmatic fixture"}}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "tools": []any{Object{"type": "code_execution_20260120", "name": "code_execution"}, Object{"name": "lookup_fixture", "input_schema": Object{"type": "object"}, "allowed_callers": []any{"code_execution_20260120"}}}, "messages": initial}
	post := func(session string, contextHeader bool, status int, stream bool) Object {
		t.Helper()
		body["stream"] = stream
		raw, _ := json.Marshal(body)
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("X-Api-Key", "worker-fixture")
		req.Header.Set(resources.PrincipalHeader, identity.PrincipalID)
		req.Header.Set(resources.GenerationHeader, identity.Generation)
		req.Header.Set(resources.ResourceOutputsHeader, "1")
		req.Header.Set(resources.ResourceRefsHeader, `[{"kind":"container","id":"container_fixture"},{"kind":"file","id":"file_fixture"}]`)
		if contextHeader {
			req.Header.Set(resources.ResourceContextsHeader, `[{"kind":"ptc","parent_id":"srv_exec","resource_id":"container_fixture"}]`)
		}
		setTestSession(t, req, session)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		out, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != status {
			t.Fatalf("HTTP%d want%d %s", res.StatusCode, status, out)
		}
		if status != 200 {
			return nil
		}
		if stream {
			if !bytes.Contains(out, []byte("event: message_stop")) {
				t.Fatalf("incomplete SSE %s", out)
			}
			return nil
		}
		answer, err := decodeObject(out)
		if err != nil {
			t.Fatal(err)
		}
		return answer
	}
	first := post("ptc-history", false, 200, false)
	blocks := first["content"].([]any)
	if len(blocks) != 2 || digest(blocks[1].(Object)["caller"]) != digest(caller) || str(blocks[1].(Object), "name") != "lookup_fixture" {
		t.Fatal("programmatic handoff changed")
	}
	body["container"] = "container_fixture"
	body["messages"] = append(append([]any{}, initial...), Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "PTC_RESULT"}}})
	post("ptc-history", false, 400, false)
	post("ptc-history", true, 200, false)
	post("ptc-cold", true, 200, false)
	post("ptc-sse", true, 200, true)
	body["messages"] = initial
	delete(body, "container")
	post("ptc-history", false, 200, false)
	if calls.Load() != 5 {
		t.Fatalf("hidden/rejected model calls %d", calls.Load())
	}
}
