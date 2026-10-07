package engine

import "testing"

func TestServerLedgerDelayedResultsAndForgery(t *testing.T) {
	body := webTestBody("web_search_20250305")
	body["tools"] = append(body["tools"].([]any), Object{"name": "weather", "input_schema": Object{"type": "object"}})
	blocks := webFixture("web_search")
	mixed := []any{blocks[0], Object{"type": "tool_use", "id": "client1", "name": "weather", "input": Object{}}}
	body["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "assistant", "content": mixed}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "client1", "content": "result"}}}}
	r, err := parseRequest(mustServerJSON(body))
	if err != nil {
		t.Fatal(err)
	}
	l, err := r.serverHistoryLedger()
	if err != nil || len(l.pending) != 1 {
		t.Fatal("pending server call lost", err)
	}
	if err := l.complete("end_turn", false); err == nil {
		t.Fatal("pending call silently omitted")
	}
	if err := l.complete("tool_use", true); err != nil {
		t.Fatal("valid handoff rejected", err)
	}
	if err := l.accept(blocks[1], r); err != nil {
		t.Fatal("delayed result rejected", err)
	}
	if err := l.accept(blocks[1], r); err == nil {
		t.Fatal("duplicate delayed result accepted")
	}
	l, _ = r.serverHistoryLedger()
	wrong := webFixture("web_fetch")[1]
	if err := l.accept(wrong, r); err == nil {
		t.Fatal("cross-kind result accepted")
	}
	if err := l.accept(blocks[0], r); err == nil {
		t.Fatal("server ID reused")
	}
}
