package engine

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func helperInlineFixture(t *testing.T, extra []any) (*Request, json.RawMessage, json.RawMessage) {
	t.Helper()
	base := []any{Object{"name": "alpha", "defer_loading": true, "input_schema": Object{"type": "object"}}}
	definition := Object{"name": "beta", "description": "old beta", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}}
	ms := []any{Object{"role": "user", "content": "fixture"}, Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": definition}}}}}
	ms = append(ms, extra...)
	body := basic()
	body["tools"] = base
	body["messages"] = ms
	body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 64000, "remaining": 32000}}
	raw, _ := json.Marshal(body)
	public, _ := json.Marshal(ms)
	tools, _ := json.Marshal(base)
	x := &helperHistoryExecution{payloadVersion: 2, authenticated: true, public: public, tools: tools, imported: helperhistory.Payload{Version: 1}, delta: helperhistory.Payload{Version: 1}}
	h := http.Header{}
	h.Set("anthropic-beta", taskBudgetBeta+",inline-tools-2026-09-15")
	h.Set("X-CCGateway-Request-Policy", `{"tool_search":"true"}`)
	r, err := parsePolicyRequestWithHelper(raw, h, nil, x)
	if err != nil {
		t.Fatal(err)
	}
	return r, public, tools
}

func TestHelperInlineCustodyAtTrailingSystemAndWithdrawnReplay(t *testing.T) {
	r, public, tools := helperInlineFixture(t, nil)
	if err := r.admitHelperHistory(r.helperHistory); err != nil {
		t.Fatal("ordinary inline custody rejected", err)
	}
	r.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	blocks[0]["input"] = Object{"query": "select:mcp__ccgateway__beta"}
	results, _ := historyContent(suffix[1].(Object)["content"])
	results[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__beta"}}
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	segment, err := r.captureHelperHistory(public, tools, 1, suffix)
	if err != nil {
		t.Fatal("trailing inline system not anchored", err)
	}
	withdraw := Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}}}
	current, history, base := helperInlineFixture(t, []any{Object{"role": "assistant", "content": "old answer"}, Object{"role": "user", "content": "next"}, withdraw})
	if current.runtimeToolSearchable("beta") {
		t.Fatal("withdrawn tool searchable before replay")
	}
	out, err := current.replayHelperHistory(history, base, helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}})
	if err != nil {
		t.Fatal("old legitimate discovery rejected using current withdrawn directory", err)
	}
	if len(out) != 7 || digest(out[1]) != digest(json.RawMessage(segmentPublicSystem(public))) {
		t.Fatal("public system position changed")
	}
	if current.runtimeToolSearchable("beta") || current.internalCache != nil {
		t.Fatal("old helper discovery revived current tool")
	}
	// A plausible digest cannot authorize a future-only tool at an earlier
	// public boundary; the old ordinary directory is rebuilt independently.
	segment.AfterMessage = 0
	segment.PublicAnchorDigest, _, err = helperHistoryAnchors(history, base, 0)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = current.replayHelperHistory(history, base, helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}}); err == nil {
		t.Fatal("future inline tool became known before its addition")
	}
	assistant, _ := decodeObject(segment.Messages[0])
	as, _ := historyContent(assistant["content"])
	as[0]["input"] = Object{"query": "select:mcp__ccgateway__alpha"}
	segment.Messages[0], _ = json.Marshal(assistant)
	user, _ := decodeObject(segment.Messages[1])
	us, _ := historyContent(user["content"])
	us[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__alpha"}}
	segment.Messages[1], _ = json.Marshal(user)
	if _, err = current.replayHelperHistory(history, base, helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}}); err != nil {
		t.Fatal("older ordinary segment no longer restores", err)
	}
}

func segmentPublicSystem(raw []byte) []byte {
	var ms []json.RawMessage
	_ = json.Unmarshal(raw, &ms)
	return ms[1]
}

func TestHelperInlineHistoricalSchemaAndRequestIsolation(t *testing.T) {
	definition := Object{"name": "beta", "description": "new beta", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740995")}}}}
	remove := Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "beta"}}}}
	add := Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": definition}}}}
	r, public, tools := helperInlineFixture(t, []any{Object{"role": "assistant", "content": "done"}, Object{"role": "user", "content": "withdraw"}, remove, Object{"role": "assistant", "content": "withdrawn"}, Object{"role": "user", "content": "readd"}, add})
	before := digest(r.Messages)
	carriers := make([]string, len(r.Messages))
	for i, m := range r.Messages {
		carriers[i] = m.toolCarrier
	}
	for _, tc := range []struct {
		after      int
		searchable bool
		number     string
	}{{0, false, ""}, {1, true, "9007199254740993"}, {4, false, "9007199254740993"}, {7, true, "9007199254740995"}} {
		view, err := r.helperInlineHistoryView(tc.after)
		if err != nil {
			t.Fatal(err)
		}
		found := false
		for _, tool := range view.Tools {
			if tool.Name == "beta" {
				found = true
				raw, _ := json.Marshal(tool.Schema)
				if !bytes.Contains(raw, []byte(tc.number)) {
					t.Fatal("historical schema came from future definition")
				}
			}
		}
		if tc.number == "" && found {
			t.Fatal("future-only tool entered earlier history directory")
		}
		if found && view.runtimeToolSearchable("beta") != tc.searchable {
			t.Fatal("historical searchability wrong")
		}
		anchor, _, err := helperHistoryAnchors(public, tools, tc.after)
		if err != nil || anchor == "" {
			t.Fatal("actual trailing directive anchor rejected", err)
		}
	}
	if digest(r.Messages) != before {
		t.Fatal("historical compilation mutated public input")
	}
	for i, m := range r.Messages {
		if m.toolCarrier != carriers[i] {
			t.Fatal("historical compilation rewrote active carrier")
		}
	}
	for _, raw := range []json.RawMessage{json.RawMessage(`[{"role":"system","content":"orphan"}]`), json.RawMessage(`[{"role":"user","content":"u"},{"role":"assistant","content":"a"},{"role":"system","content":"s"}]`)} {
		var ms []json.RawMessage
		json.Unmarshal(raw, &ms)
		if _, _, err := helperHistoryAnchors(raw, tools, len(ms)-1); err == nil {
			t.Fatal("non-user turn boundary accepted")
		}
	}
}

func verifyHelperInlineFixtureWire(t *testing.T, wire Object) {
	t.Helper()
	rows, _ := wire["messages"].([]any)
	found := false
	for _, raw := range rows {
		m, _ := raw.(Object)
		blocks, _ := historyContent(m["content"])
		for _, block := range blocks {
			if str(block, "type") != "tool_addition" {
				continue
			}
			definition := inlineToolDefinition(block)
			name := str(definition, "name")
			if name != "mcp__ccgateway__spare" && name != "mcp__ccgateway__weather" {
				t.Fatal("inline tool identity changed")
			}
			number, description := "9007199254740993", "precise fixture"
			if name == "mcp__ccgateway__spare" {
				found = true
			} else {
				number, description = "9007199254740995", "readded fixture"
			}
			expected := Object{"name": name, "description": description, "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number(number)}}}}
			if digest(definition) != digest(expected) || str(m, "role") != "system" {
				t.Fatal("inline definition fields/numeric lexeme/role changed")
			}
		}
	}
	if !found {
		t.Fatal("original inline definition missing from provider history")
	}
}
