package engine

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func TestReviewHelperTailSameTextAtThreePositions(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	public := json.RawMessage(`[{"role":"user","content":"public"}]`)
	tools := json.RawMessage(`[]`)
	same := Object{"role": "system", "content": []any{Object{"type": "text", "text": "same reminder", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}}
	first, _ := helperSystemSegment(public, tools, 0, []any{same})
	makeRound := func(id string) helperhistory.Segment {
		suffix := internalCacheSuffix()
		b, _ := historyContent(suffix[0].(Object)["content"])
		b[0]["id"] = id
		result, _ := historyContent(suffix[1].(Object)["content"])
		result[0]["tool_use_id"] = id
		s := first
		s.Kind = helperhistory.SegmentWholeRound
		s.Messages = nil
		for _, m := range suffix {
			raw, _ := json.Marshal(m)
			s.Messages = append(s.Messages, raw)
		}
		return s
	}
	imported := helperhistory.Payload{Version: 2, Segments: []helperhistory.Segment{first, makeRound("one"), first, makeRound("two"), first}}
	raw, _ := json.Marshal(imported)
	if err := helperhistory.Validate(raw); err != nil {
		t.Fatal(err)
	}
	r.helperHistory = &helperHistoryExecution{payloadVersion: 2, public: public, tools: tools, imported: imported, delta: helperhistory.Payload{Version: 2}}
	body := Object{"messages": []any{Object{"role": "user", "content": "public"}, same}}
	if err := r.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	messages := body["messages"].([]any)
	if len(messages) != 8 {
		t.Fatalf("got %d messages", len(messages))
	}
	for _, i := range []int{1, 4, 7} {
		if digest(messages[i]) != digest(same) {
			t.Fatalf("system lost/moved at %d", i)
		}
	}
	for _, i := range []int{2, 5} {
		if str(messages[i].(Object), "role") != "assistant" || str(messages[i+1].(Object), "role") != "user" {
			t.Fatal("whole round order changed")
		}
	}
}

func TestReviewHelperReminderAcknowledgementNeedsActiveLease(t *testing.T) {
	for _, mode := range []string{"inactive", "failed", "malformed", "no-history"} {
		t.Run(mode, func(t *testing.T) {
			r := internalCacheReviewRequest()
			r.helperHistory = &helperHistoryExecution{payloadVersion: 2}
			c := &modControl{helperRequest: r, scope: newMainRequestScope()}
			raw := json.RawMessage(`{"text":"observed reminder"}`)
			if mode != "inactive" {
				if err := c.scope.enter(); err != nil {
					t.Fatal(err)
				}
			}
			switch mode {
			case "failed":
				r.internalCache.failed = true
			case "malformed":
				raw = json.RawMessage(`{"text":1}`)
			case "no-history":
				r.helperHistory = nil
			}
			if c.acknowledgeHelperReminder(raw) {
				t.Fatal("unproven reminder acknowledged")
			}
		})
	}
}
