package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperContextRestoresPublicResultBeforeHiddenInsertion(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	x := &helperHistoryExecution{payloadVersion: 2, public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 2}}
	r.helperHistory = x
	if err := r.applyHelperHistory(Object{"messages": []any{Object{"role": "user", "content": "public"}}}); err != nil {
		t.Fatal(err)
	}
	pair := internalCacheSuffix()
	blocks, _ := historyContent(pair[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	if err := r.applyHelperHistory(Object{"messages": append([]any{Object{"role": "user", "content": "public"}}, pair...)}); err != nil {
		t.Fatal(err)
	}
	imported := x.delta
	cold := internalCacheReviewRequest()
	cold.Messages = []Message{r.Messages[0], {Role: "assistant", Content: []Object{{"type": "tool_use", "id": "external", "name": "weather", "input": Object{}}}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "external", "content": "public result\t"}}}}
	raw, _ := json.Marshal([]any{Object{"role": "user", "content": "public"}, Object{"role": "assistant", "content": cold.Messages[1].Content}, Object{"role": "user", "content": cold.Messages[2].Content}})
	cold.helperHistory = &helperHistoryExecution{payloadVersion: 2, public: raw, tools: json.RawMessage(`[]`), imported: imported, delta: helperhistory.Payload{Version: 2}}
	suffix := "\n\n<system-reminder>\ntrusted\n</system-reminder>"
	body := Object{"messages": []any{Object{"role": "user", "content": "public"}, Object{"role": "assistant", "content": cold.wireMessage(cold.Messages[1]).Content}, Object{"role": "user", "content": []Object{{"type": "tool_result", "tool_use_id": "external", "content": "public result" + suffix}}}}}
	restore, err := normalizeToolResultContexts(cold, body, &modControl{sessionContexts: map[string]bool{"trusted": true}})
	if err != nil {
		t.Fatal(err)
	}
	if err = cold.applyHelperHistory(body, restore); err != nil {
		t.Fatal(err)
	}
	rows := body["messages"].([]any)
	if len(rows) != 5 {
		t.Fatalf("unexpected row count %d", len(rows))
	}
	result, _ := historyContent(rows[4].(Object)["content"])
	if result[0]["content"] != "public result\t"+suffix {
		t.Fatal("original public result or authenticated suffix lost")
	}
	if digest(rows[2]) != digest(pair[1]) {
		t.Fatal("hidden user modified")
	}
}
