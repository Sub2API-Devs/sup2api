package engine

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func independentHelperContextFixture(t *testing.T) (*Request, Object, *modControl, string) {
	t.Helper()
	const context = "trusted independent context"
	suffix := "\n\n<system-reminder>\n" + context + "\n</system-reminder>"
	original := "client owns same text" + suffix + "\t"
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	x := &helperHistoryExecution{public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 1}}
	r.helperHistory = x
	if err := r.applyHelperHistory(Object{"messages": []any{Object{"role": "user", "content": "public"}}}); err != nil {
		t.Fatal(err)
	}
	hidden := internalCacheSuffix()
	blocks, _ := historyContent(hidden[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	if err := r.applyHelperHistory(Object{"messages": append([]any{Object{"role": "user", "content": "public"}}, hidden...)}); err != nil {
		t.Fatal(err)
	}
	x.imported, x.delta = x.delta, helperhistory.Payload{Version: 1}
	x.systemObserved = false
	r.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "public_call", "name": "weather", "input": Object{}}}}, Message{Role: "user", Content: []Object{{"type": "text", "text": "prefix"}, {"type": "tool_result", "tool_use_id": "public_call", "content": original}}})
	wire := []any{Object{"role": "user", "content": "public"}, Object{"role": "assistant", "content": r.wireMessage(r.Messages[1]).Content}, Object{"role": "user", "content": []Object{{"type": "text", "text": "prefix"}, {"type": "tool_result", "tool_use_id": "public_call", "content": original + suffix}}}}
	public := cloneHelperMessages(wire)
	pblocks, _ := historyContent(public[2].(Object)["content"])
	pblocks[1]["content"] = original
	x.public, _ = json.Marshal(public)
	return r, Object{"messages": wire}, &modControl{sessionContexts: map[string]bool{context: true}}, original + suffix
}

func TestIndependentHelperContextRestoresPublicPosition(t *testing.T) {
	r, body, control, want := independentHelperContextFixture(t)
	restore, err := normalizeToolResultContexts(r, body, control)
	if err != nil {
		t.Fatal(err)
	}
	hiddenBefore := append([]byte(nil), r.helperHistory.imported.Segments[0].Messages[1]...)
	called := 0
	if err = r.applyHelperHistory(body, func(view Object) error {
		called++
		if len(view["messages"].([]any)) != 3 {
			t.Fatal("restoration occurred after hidden insertion")
		}
		if err := restore(view); err != nil {
			return err
		}
		return restore(view) // Existing closure must remain idempotent in its original view.
	}); err != nil {
		t.Fatal(err)
	}
	if called != 1 {
		t.Fatalf("callback count %d", called)
	}
	rows := body["messages"].([]any)
	if len(rows) != 5 {
		t.Fatalf("hidden pair not inserted: %d", len(rows))
	}
	actual, _ := historyContent(rows[4].(Object)["content"])
	if actual[1]["content"] != want {
		t.Fatal("client TAB/context or trusted suffix changed")
	}
	before, err := decodeObject(hiddenBefore)
	if err != nil {
		t.Fatal(err)
	}
	if digest(rows[2]) != digest(before) {
		t.Fatal("hidden user result changed")
	}
}

func TestIndependentHelperContextOldOrderStillRejected(t *testing.T) {
	r, body, control, _ := independentHelperContextFixture(t)
	restore, err := normalizeToolResultContexts(r, body, control)
	if err != nil {
		t.Fatal(err)
	}
	if err = r.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	if err = restore(body); err == nil {
		t.Fatal("strict public index was relaxed to global tool ID lookup")
	}
}

func TestIndependentHelperContextStrictPositionAndFailure(t *testing.T) {
	for _, variant := range []string{"id", "block", "content", "cancelled"} {
		t.Run(variant, func(t *testing.T) {
			r, body, control, _ := independentHelperContextFixture(t)
			restore, err := normalizeToolResultContexts(r, body, control)
			if err != nil {
				t.Fatal(err)
			}
			called := 0
			err = r.applyHelperHistory(body, func(view Object) error {
				called++
				blocks, _ := historyContent(view["messages"].([]any)[2].(Object)["content"])
				switch variant {
				case "id":
					blocks[1]["tool_use_id"] = "different"
				case "block":
					blocks[0], blocks[1] = blocks[1], blocks[0]
				case "content":
					blocks[1]["content"] = "tampered"
				case "cancelled":
					return context.Canceled
				}
				return restore(view)
			})
			if err == nil || called != 1 {
				t.Fatalf("invalid restoration accepted: %v calls=%d", err, called)
			}
			if len(body["messages"].([]any)) != 3 {
				t.Fatal("hidden rows inserted despite failed restoration")
			}
			if r.helperHistory.err == nil {
				t.Fatal("failure not latched")
			}
			if variant == "cancelled" && !errors.Is(err, context.Canceled) {
				t.Fatal("cancellation cause lost")
			}
		})
	}
}

func TestIndependentHelperContextNoHelperAndProofFailure(t *testing.T) {
	r, body, control, want := independentHelperContextFixture(t)
	r.helperHistory = nil
	restore, err := normalizeToolResultContexts(r, body, control)
	if err != nil {
		t.Fatal(err)
	}
	called := 0
	if err = r.applyHelperHistory(body, func(view Object) error { called++; return restore(view) }); err != nil {
		t.Fatal(err)
	}
	blocks, _ := historyContent(body["messages"].([]any)[2].(Object)["content"])
	if called != 1 || blocks[1]["content"] != want {
		t.Fatal("ordinary restoration changed")
	}
	r, body, control, _ = independentHelperContextFixture(t)
	restore, err = normalizeToolResultContexts(r, body, control)
	if err != nil {
		t.Fatal(err)
	}
	body["messages"].([]any)[0].(Object)["content"] = "changed public history"
	called = 0
	if err = r.applyHelperHistory(body, func(view Object) error { called++; return restore(view) }); err == nil || called != 0 {
		t.Fatal("restoration ran before history proof")
	}
}
