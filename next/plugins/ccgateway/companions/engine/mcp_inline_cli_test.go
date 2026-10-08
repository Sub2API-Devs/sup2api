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
)

func TestRealCLIInlineMCPPositionAndHistory(t *testing.T) {
	var calls atomic.Int32
	fixture := mcpInlineFixture()
	addition := fixture["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
	addition["cache_control"] = Object{"type": "ephemeral"}
	handler := func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		n := calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		found := false
		for _, value := range body["messages"].([]any) {
			message, _ := value.(Object)
			if str(message, "role") != "system" {
				continue
			}
			blocks, _ := historyContent(message["content"])
			for _, block := range blocks {
				found = found || digest(block) == digest(addition)
			}
		}
		if !found {
			t.Error("inline MCP position/cache block lost")
		}
		tools, _ := body["tools"].([]any)
		if len(tools) != 1 || str(tools[0].(Object), "mcp_server_name") != "two" {
			t.Error("inline MCP hoisted into prefix")
		}
		servers, _ := body["mcp_servers"].([]any)
		if len(servers) != 2 {
			t.Error("server list changed")
		} else {
			for _, value := range servers {
				s := value.(Object)
				if str(s, "authorization_token") != "fixture-secret-"+str(s, "name") {
					t.Error("credential crossed server")
				}
			}
		}
		if bytes.Contains(mustMCPJSON(body["messages"]), []byte("fixture-secret")) || bytes.Contains(raw, []byte("ccgateway-inline-tools-")) {
			t.Error("private material in prompt")
		}
		id := fmt.Sprintf("mcp_inline_%d", n)
		blocks := []Object{{"type": "mcp_tool_use", "id": id, "server_name": "one", "name": "echo", "input": Object{"n": 1}}, {"type": "mcp_tool_result", "tool_use_id": id, "content": "MCP_INLINE_RESULT"}, {"type": "text", "text": "INLINE_FINISHED"}}
		messages, _ := body["messages"].([]any)
		last := messages[len(messages)-1].(Object)
		if str(last, "role") == "system" && bytes.Contains(mustMCPJSON(last), []byte("tool_removal")) {
			blocks = []Object{{"type": "text", "text": "WITHDRAWN"}}
		}
		writeSurfaceFixture(w, str(body, "model"), blocks)
	}
	endpoint, _ := newThinkingOutputFixture(t, handler)
	post := func(body Object) Object {
		t.Helper()
		raw := mustMCPJSON(body)
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
		req.Header.Set("Anthropic-Beta", mcpListingBeta+",inline-tools-2026-09-15")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		output, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Fatalf("HTTP%d %s", res.StatusCode, output)
		}
		if body["stream"] == true {
			if !bytes.Contains(output, []byte("INLINE_FINISHED")) {
				t.Fatalf("stream lost response %s", output)
			}
			return nil
		}
		answer, err := decodeObject(output)
		if err != nil {
			t.Fatal(err)
		}
		return answer
	}
	first := post(fixture)
	history := append(append([]any{}, fixture["messages"].([]any)...), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "continue"})
	for _, label := range []string{"continue", "cold", "rollback", "stream", "withdraw"} {
		body, _ := jsonCopyObject(fixture)
		body["messages"] = history
		if label == "cold" {
			endpoint, _ = newThinkingOutputFixture(t, handler)
		}
		if label == "rollback" || label == "stream" {
			body["messages"] = fixture["messages"]
		}
		if label == "stream" {
			body["stream"] = true
		}
		if label == "withdraw" {
			body["messages"] = append(append([]any{}, history...), Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "mcp_toolset_reference", "server_name": "one"}}}})
		}
		answer := post(body)
		if label == "withdraw" {
			raw, _ := json.Marshal(answer)
			if !bytes.Contains(raw, []byte("WITHDRAWN")) {
				t.Fatal("withdraw result lost")
			}
		}
	}
	if calls.Load() != 6 {
		t.Fatal("unexpected generation count", calls.Load())
	}
}

func TestRealCLIInlineMCPAbsentTopCatalog(t *testing.T) {
	body := mcpInlineFixture()
	delete(body, "tools")
	body["mcp_servers"] = body["mcp_servers"].([]any)[:1]
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		if _, exists := wire["tools"]; exists {
			t.Error("absent top-level catalog changed")
		}
		writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "INLINE_ONLY"}})
	})
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	req.Header.Set("Anthropic-Beta", mcpListingBeta+",inline-tools-2026-09-15")
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	raw, _ := io.ReadAll(response.Body)
	if response.StatusCode != 200 || !bytes.Contains(raw, []byte("INLINE_ONLY")) {
		t.Fatalf("HTTP%d %s", response.StatusCode, raw)
	}
}
