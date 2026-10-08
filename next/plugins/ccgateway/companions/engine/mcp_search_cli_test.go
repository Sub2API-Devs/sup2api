package engine

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func TestRealCLIMCPClientSearchAndInline(t *testing.T) {
	var calls atomic.Int32
	body := mcpSearchFixture()
	handler := func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		n := calls.Add(1)
		raw, _ := io.ReadAll(r.Body)
		wire, _ := decodeObject(raw)
		if bytes.Contains(raw, []byte("ccgateway-inline-tools-")) {
			t.Error("inline carrier leaked")
		}
		tools, _ := wire["tools"].([]any)
		if len(tools) != 3 {
			t.Error("combined top catalog changed")
		}
		messages, _ := wire["messages"].([]any)
		if len(messages) > 2 {
			clientRef := Object{"type": "tool_search_tool_result", "tool_use_id": "search_1", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__lookup"}}}}
			if !messageProbeContainsBlock(wire, clientRef) {
				t.Error("historical client reference moved or changed")
			}
			writeSurfaceFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "SEARCH_CONTINUED"}})
			return
		}
		sid := fmt.Sprintf("search_%d", n)
		mid := fmt.Sprintf("mcp_%d", n)
		writeSurfaceFixture(w, str(wire, "model"), []Object{
			{"type": "server_tool_use", "id": sid, "name": "tool_search_tool_regex", "input": Object{"pattern": "lookup"}},
			{"type": "tool_search_tool_result", "tool_use_id": sid, "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__lookup"}}}},
			{"type": "mcp_tool_use", "id": mid, "server_name": "one", "name": "echo", "input": Object{}},
			{"type": "mcp_tool_result", "tool_use_id": mid, "content": "MCP_SEARCH_RESULT"},
			{"type": "text", "text": "SEARCH_FINISHED"},
		})
	}
	endpoint, _ := newThinkingOutputFixture(t, handler)
	post := func() Object {
		t.Helper()
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
		req.Header.Set("Anthropic-Beta", mcpListingBeta+",inline-tools-2026-09-15")
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			t.Fatalf("HTTP%d %s", res.StatusCode, raw)
		}
		if body["stream"] == true {
			if !bytes.Contains(raw, []byte("SEARCH_FINISHED")) {
				t.Fatalf("lost stream %s", raw)
			}
			return nil
		}
		answer, err := decodeObject(raw)
		if err != nil {
			t.Fatal(err)
		}
		return answer
	}
	first := post()
	if bytes.Contains(mustMCPJSON(first), []byte("mcp__ccgateway__lookup")) {
		t.Fatal("client reference not unmapped")
	}
	original := body["messages"]
	body["messages"] = append(append([]any{}, original.([]any)...), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "next"})
	post()
	endpoint, _ = newThinkingOutputFixture(t, handler)
	post()
	body["messages"] = original
	post()
	body["stream"] = true
	post()
	if calls.Load() != 5 {
		t.Fatal("unexpected calls", calls.Load())
	}
}
