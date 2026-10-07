package engine

import "testing"

func TestFallbackLedgerOnlyAbandonsCurrentSegment(t *testing.T) {
	req := &Request{ServerTools: []Object{{"name": "web_search"}}}
	call := func(id string) Object {
		return Object{"type": "server_tool_use", "id": id, "name": "web_search", "input": Object{}}
	}
	ledger := newServerToolLedger()
	if err := ledger.accept(call("prior"), req, true); err != nil {
		t.Fatal(err)
	}
	ledger.beginTurn()
	if err := ledger.accept(call("abandoned"), req); err != nil {
		t.Fatal(err)
	}
	if err := ledger.accept(fallbackFixture(), req); err != nil {
		t.Fatal(err)
	}
	if ledger.pending["prior"] == "" || ledger.pending["abandoned"] != "" {
		t.Fatal("fallback discarded prior-turn work or retained interrupted segment")
	}
	if err := ledger.accept(call("later"), req); err != nil {
		t.Fatal(err)
	}
	if err := ledger.complete("end_turn", false); err == nil {
		t.Fatal("fallback allowed missing result after boundary")
	}
	if err := ledger.accept(call("abandoned"), req); err == nil {
		t.Fatal("fallback allowed reused call ID")
	}
}

func TestFallbackHistoryExactPositionAndPartialMetadata(t *testing.T) {
	b := fallbackFixture()
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "anchor"}}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "before"}, b, {"type": "text", "text": "after"}}}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
	body := func(blocks []any) Object {
		return Object{"messages": []any{Object{"role": "user", "content": "anchor"}, Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": "next"}}}
	}
	for _, actual := range [][]any{{Object{"type": "text", "text": "before"}, Object{"type": "text", "text": "after"}}, {Object{"type": "text", "text": "before"}, fallbackIdentity(b), Object{"type": "text", "text": "after"}}} {
		wire := body(actual)
		if err := restoreProtocolHistory(req, wire); err != nil {
			t.Fatal(err)
		}
		if got := wireFallbackBlocks(wire); len(got) != 1 || digest(got[0]) != digest(b) {
			t.Fatal("trigger was not restored")
		}
	}
	wire := body([]any{fallbackIdentity(b), Object{"type": "text", "text": "before"}, Object{"type": "text", "text": "after"}})
	if err := restoreProtocolHistory(req, wire); err == nil {
		t.Fatal("moved fallback boundary accepted")
	}
	corrupted, _ := jsonCopyObject(b)
	corrupted["to"] = Object{"model": "different-model"}
	if err := restoreProtocolHistory(req, body([]any{Object{"type": "text", "text": "before"}, corrupted, Object{"type": "text", "text": "after"}})); err == nil {
		t.Fatal("changed transition accepted")
	}
}

func TestFallbackStreamRequiresClosedMatchingEvidence(t *testing.T) {
	relay := &outboundRelay{}
	observer := &apiTerminalObserver{relay: relay}
	observer.observeFallback(Object{"type": "message_start", "message": Object{"id": "observed"}})
	observer.observeFallback(Object{"type": "content_block_start", "index": 0, "content_block": fallbackFixture()})
	if relay.takeFallback("observed", 0) != nil {
		t.Fatal("recovered unclosed block")
	}
	observer.observeFallback(Object{"type": "content_block_stop", "index": 0})
	if relay.takeFallback("other-message", 0) != nil || relay.takeFallback("observed", 1) != nil {
		t.Fatal("cross-message/index recovery")
	}
	if digest(relay.takeFallback("observed", 0)) != digest(fallbackFixture()) {
		t.Fatal("closed original block missing")
	}
	if relay.takeFallback("observed", 0) != nil {
		t.Fatal("fallback evidence reused")
	}
}

func TestFallbackAdvisorHistoryRepairsCompose(t *testing.T) {
	expected := append(advisorFixture("advisor_redacted_result"), fallbackFixture(), Object{"type": "text", "text": "after"})
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "anchor"}}}, {Role: "assistant", Content: expected}, {Role: "user", Content: []Object{{"type": "text", "text": "next"}}}}}
	for _, partial := range []bool{false, true} {
		actual := []any{Object{"type": "text", "text": "ADVISOR_DONE"}}
		if partial {
			actual = append(actual, fallbackIdentity(fallbackFixture()))
		}
		actual = append(actual, Object{"type": "text", "text": "after"})
		wire := Object{"messages": []any{Object{"role": "user", "content": "anchor"}, Object{"role": "assistant", "content": actual}, Object{"role": "user", "content": "next"}}}
		if err := restoreProtocolHistory(req, wire); err != nil {
			t.Fatal(err)
		}
		content := wire["messages"].([]any)[1].(Object)["content"]
		if digest(content) != digest(expected) {
			t.Fatal("composed advisor/fallback restore changed block identity")
		}
	}
}
