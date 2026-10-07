package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestServerPauseObserverAndNativeMetadataComparison(t *testing.T) {
	for _, reason := range []string{"pause_turn", "end_turn", "tool_use"} {
		relay := &outboundRelay{}
		observer := &apiTerminalObserver{relay: relay, req: &Request{ServerTools: []Object{{"name": "web_search"}}}}
		for _, event := range []Object{{"type": "message_delta", "delta": Object{"stop_reason": reason}}, {"type": "message_stop"}} {
			raw, _ := json.Marshal(event)
			observer.observe([]byte(fmt.Sprintf("data: %s\n\n", raw)))
		}
		if relay.isStopped() != (reason == "pause_turn") {
			t.Fatal("server-only observer changed non-pause native lifecycle")
		}
	}
	want := []Object{{"type": "text", "text": "answer", "citations": []any{Object{"type": "char_location", "document_index": 0, "start_char_index": 0, "end_char_index": 1, "cited_text": "a"}}}}
	row, _ := json.Marshal(Object{"type": "assistant", "message": Object{"id": "msg_cmp", "content": []any{Object{"type": "text", "text": "answer"}}}})
	if !nativeResponseContentMatches([]json.RawMessage{row}, "msg_cmp", &Request{}, want) {
		t.Fatal("restorable citation omission broke native checkpoint")
	}
	want[0]["text"] = "different"
	if nativeResponseContentMatches([]json.RawMessage{row}, "msg_cmp", &Request{}, want) {
		t.Fatal("ordinary response text mismatch accepted")
	}
}

func contextRequest(t *testing.T, fields string, beta string) (*Request, error) {
	t.Helper()
	raw := []byte(`{"model":"claude-opus-5-5","max_tokens":64,"messages":[{"role":"user","content":"hello"}]` + fields + `}`)
	h := http.Header{}
	h.Set("anthropic-beta", beta)
	return parsePolicyRequest(raw, h)
}

func TestContextCompactionAdmissionAndOpaqueMapping(t *testing.T) {
	for _, fields := range []string{
		`,"compaction":null,"context_management":null`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"all"}}]}`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"thinking_turns","value":2}},{"type":"clear_tool_uses_20250919","clear_at_least":null,"clear_tool_inputs":null,"exclude_tools":null}]}`,
		`,"context_management":{"edits":[{"type":"compact_20260112","trigger":null,"instructions":null,"pause_after_compaction":false}]}`,
	} {
		if _, err := contextRequest(t, fields, contextBeta+","+thresholdCompactionBeta); err != nil {
			t.Fatal(err)
		}
	}
	for _, fields := range []string{
		`,"context_management":{"edits":null}`,
		`,"context_management":{"edits":[{"type":"clear_thinking_20251015","keep":{"type":"thinking_turns","value":-0}}]}`,
		`,"context_management":{"edits":[{"type":"clear_tool_uses_20250919","keep":{"type":"tool_uses","value":1e999}}]}`,
		`,"context_management":{"edits":[{"type":"clear_tool_uses_20250919"},{"type":"clear_thinking_20251015"}]}`,
		`,"compaction":{"type":"summarize","instructions":" "}`,
		`,"compaction":{"type":"summarize"},"context_management":{"edits":[]}`,
		`,"compaction":{"type":"summarize"},"stop_sequences":["end"]`,
	} {
		if _, err := contextRequest(t, fields, contextBeta+","+signedCompactionBeta); err == nil {
			t.Fatalf("accepted invalid %s", fields)
		}
	}
	if _, err := contextRequest(t, `,"compaction":{"type":"summarize"}`, ""); err == nil {
		t.Fatal("accepted missing beta")
	}
	r, err := contextRequest(t, `,"tools":[{"name":"lookup","input_schema":{"type":"object"}}],"context_management":{"edits":[{"type":"clear_tool_uses_20250919","exclude_tools":["lookup","old_tool"],"clear_tool_inputs":["lookup"]}]}`, contextBeta)
	if err != nil {
		t.Fatal(err)
	}
	before := r.Plan.MainRequestFields()
	wire := Object{}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(wire)
	if !strings.Contains(string(raw), "mcp__ccgateway__lookup") || !strings.Contains(string(raw), "old_tool") {
		t.Fatal("tool identity mapping incorrect")
	}
	if digest(before) != digest(r.Plan.MainRequestFields()) {
		t.Fatal("plan mutated")
	}
}

func TestContinuationTransportAndMergedCheckpoint(t *testing.T) {
	r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{{"type": "text", "text": "prefix"}}}}}
	r.configureContinuation()
	if r.pendingStart() != len(r.Messages) {
		t.Fatal("assistant history not all imported")
	}
	body := Object{"messages": []any{Object{"role": "user", "content": "question"}, Object{"role": "assistant", "content": "prefix"}, Object{"role": "user", "content": r.pendingWireMessage().Content}}}
	if err := r.removeContinuation(body); err != nil {
		t.Fatal(err)
	}
	if len(body["messages"].([]any)) != 2 {
		t.Fatal("trigger not removed")
	}
	bad := Object{"messages": []any{Object{"role": "assistant", "content": "prefix"}, Object{"role": "user", "content": []Object{{"type": "text", "text": "extra"}, {"type": "text", "text": r.continuation}}}}}
	if r.removeContinuation(bad) == nil {
		t.Fatal("silently removed extra CC content")
	}
	cache, err := newCache(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	p := &Prepared{Hashes: fingerprints(r.Messages)}
	answer := Object{"id": "msg_continue", "role": "assistant", "stop_reason": "end_turn", "content": []Object{{"type": "text", "text": "suffix"}}}
	if err := p.commitResponseOnly(r, answer, cache, "scope", time.Now()); err != nil {
		t.Fatal(err)
	}
	merged := append([]Message(nil), r.Messages...)
	merged[1].Content = []Object{{"type": "text", "text": "prefix"}, {"type": "text", "text": "suffix"}}
	hashes := fingerprints(merged)
	snapshot := cache.get(cacheKey("scope", r.toolHistoryNamespace(), hashes[1]))
	if snapshot == nil || !snapshot.ResponseOnly || len(snapshot.Hashes) != 2 {
		t.Fatal("adjacent assistant checkpoint does not match normalized client history")
	}
	if len(r.Messages[1].Content) != 1 {
		t.Fatal("client history mutated")
	}
}

func TestInterruptedServerTailRestorationRequiresExactPrefix(t *testing.T) {
	r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{{"type": "server_tool_use", "id": "srv_fixture", "name": "web_search", "input": Object{"query": "q"}}}}}, ServerTools: []Object{{"type": "web_search_20250305", "name": "web_search"}}}
	r.configureContinuation()
	for _, tc := range []struct {
		prefix, placeholder string
		ok                  bool
	}{{"question", "[Tool use interrupted]", true}, {"different", "[Tool use interrupted]", false}, {"question", "ordinary assistant text", false}} {
		body := Object{"messages": []any{Object{"role": "user", "content": tc.prefix}, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": tc.placeholder}}}}}
		err := r.restoreContinuationTail(body)
		if (err == nil) != tc.ok {
			t.Fatalf("restoration acceptance=%v want=%v", err, tc.ok)
		}
		if err == nil {
			messages := body["messages"].([]any)
			tail := messages[1].(map[string]any)
			blocks, _ := historyContent(tail["content"])
			if len(blocks) != 1 || str(blocks[0], "id") != "srv_fixture" {
				t.Fatal("server call identity not restored")
			}
		}
	}
}
