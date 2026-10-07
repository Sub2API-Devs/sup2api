package engine

import (
	"net/http"
	"strings"
	"testing"
)

func TestReviewTypedAPIToolSearchReferences(t *testing.T) {
	body := serverSearchTestBody()
	body["tools"].([]any)[1] = Object{"type": "bash_20250124", "name": "bash", "defer_loading": true}
	r, err := parsePolicyRequest(mustServerJSON(body), http.Header{})
	if err != nil {
		t.Fatal("typed search initial admission", err)
	}
	call := Object{"type": "server_tool_use", "id": "srv_review", "name": "tool_search_tool_regex", "input": Object{"pattern": "bash"}}
	result := Object{"type": "tool_search_tool_result", "tool_use_id": "srv_review", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "bash"}}}}
	t.Run("response", func(t *testing.T) {
		a := &Accumulator{}
		for _, event := range []Object{
			{"type": "message_start", "message": Object{"id": "msg_review", "type": "message", "role": "assistant", "model": r.Model, "content": []any{}, "usage": Object{"input_tokens": 1, "output_tokens": 0}}},
			{"type": "content_block_start", "index": 0, "content_block": call},
			{"type": "content_block_stop", "index": 0},
			{"type": "content_block_start", "index": 1, "content_block": result},
		} {
			if err := a.push(event, r); err != nil {
				t.Fatal("legal typed search response rejected", err)
			}
		}
	})
	t.Run("history", func(t *testing.T) {
		body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": []any{call, result}}, Object{"role": "user", "content": "continue"})
		if _, err := parsePolicyRequest(mustServerJSON(body), http.Header{}); err != nil {
			t.Fatal("legal typed search history rejected", err)
		}
	})
}

func TestReviewRemovedToolsetHistoryKeepsIdentity(t *testing.T) {
	call := Object{"type": "tool_use", "id": "old-browser-call", "name": "screenshot", "toolset_name": "browser", "input": Object{"tab_id": "tab1"}}
	result := Object{"type": "tool_result", "tool_use_id": "old-browser-call", "toolset_name": "browser", "content": "done"}
	messages := []any{Object{"role": "user", "content": "old"}, Object{"role": "assistant", "content": []any{call}}, Object{"role": "user", "content": []any{result}}}
	r, err := parseToolFixture(t, []any{}, messages, "")
	if err != nil {
		t.Fatal(err)
	}
	wire, _ := jsonCopyObject(Object{"messages": messages})
	actual := wire["messages"].([]any)[1].(Object)["content"].([]any)[0].(Object)
	delete(actual, "toolset_name") // observed CLI omission, independent of current catalog
	if err := r.verifyAPIClientHistory(wire); err != nil {
		t.Fatal(err)
	}
	if str(actual, "toolset_name") != "browser" {
		t.Fatal("completed history toolset identity lost after its definition was removed")
	}
}

func TestReviewInlineAdvisorAndCompactionCannotBypassModelAuthorization(t *testing.T) {
	definition := Object{"type": "advisor_20260301", "name": "advisor", "model": "unauthorized-review-model"}
	change := Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": definition}}
	for _, message := range []Object{
		{"role": "system", "content": []any{change}},
		{"role": "assistant", "content": []any{Object{"type": "compaction", "content": "summary", "signature": "opaque", "encrypted_content": "opaque", "tool_changes": []any{change}}}},
	} {
		messages := []any{Object{"role": "user", "content": "q"}, message}
		if message["role"] == "assistant" {
			messages = []any{message, Object{"role": "user", "content": "q"}}
		}
		if _, err := parseToolFixture(t, []any{}, messages, "inline-tools-2026-09-15,advisor-tool-2026-03-01,compaction-2026-01-12"); err == nil || !strings.Contains(err.Error(), "per-turn server ledger") && !strings.Contains(err.Error(), "replaying compaction tool_changes") {
			t.Fatal("unscoped secondary model admitted through inline history")
		}
	}
}
