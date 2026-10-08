package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperHistoryCapturesAttributedTrailingReminder(t *testing.T) {
	for _, mode := range []string{"valid", "no-ack", "wrong-round", "changed", "v1", "unconfirmed", "incomplete", "unknown-field"} {
		t.Run(mode, func(t *testing.T) {
			r := internalCacheReviewRequest()
			r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
			x := &helperHistoryExecution{payloadVersion: 2, public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 2}}
			if mode == "v1" {
				x.payloadVersion = 1
				x.delta.Version = 1
			}
			r.helperHistory = x
			public := Object{"role": "user", "content": "public"}
			if err := r.applyHelperHistory(Object{"messages": []any{public}}); err != nil {
				t.Fatal(err)
			}
			suffix := internalCacheSuffix()
			blocks, _ := historyContent(suffix[0].(Object)["content"])
			observeCacheFixture(r, blocks)
			confirmReviewHidden(t, r)
			if mode == "unconfirmed" {
				r.internalCache.hidden = nil
			}
			if mode == "incomplete" {
				r.internalCache.failed = true
			}
			text := "<total_tokens>14998238 tokens left</total_tokens>"
			control := &modControl{helperRequest: r, scope: newMainRequestScope()}
			if err := control.scope.enter(); err != nil {
				t.Fatal(err)
			}
			if mode != "no-ack" && mode != "incomplete" {
				raw, _ := json.Marshal(Object{"text": text})
				if !control.acknowledgeHelperReminder(raw) {
					t.Fatal("attributed attachment rejected")
				}
			}
			if mode == "wrong-round" {
				x.reminders[0] = text
				delete(x.reminders, 1)
			}
			if mode == "changed" {
				text += "changed"
			}
			tail := Object{"role": "system", "content": []any{Object{"type": "text", "text": text, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}}}
			if mode == "unknown-field" {
				tail["clear_at"] = "unexpected"
			}
			messages := append([]any{public}, suffix...)
			messages = append(messages, tail)
			err := r.applyHelperHistory(Object{"messages": messages})
			if mode != "valid" {
				if err == nil {
					t.Fatal("unproven tail accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if len(x.delta.Segments) != 2 || x.delta.Segments[1].Kind != helperhistory.SegmentSystemOnly {
				t.Fatal("tail not stored at separate ordered position")
			}
			var actual Object
			if err := json.Unmarshal(x.delta.Segments[1].Messages[0], &actual); err != nil {
				t.Fatal(err)
			}
			if digest(actual) != digest(tail) {
				t.Fatal("tail bytes/fields changed")
			}
		})
	}
}

func TestHelperReminderAckRequiresActiveStrictControl(t *testing.T) {
	r := internalCacheReviewRequest()
	r.helperHistory = &helperHistoryExecution{}
	for _, mode := range []string{"no-scope", "inactive", "unknown-detail", "wrong-type"} {
		c := &modControl{helperRequest: r}
		if mode != "no-scope" {
			c.scope = newMainRequestScope()
		}
		if mode != "no-scope" && mode != "inactive" {
			if err := c.scope.enter(); err != nil {
				t.Fatal(err)
			}
		}
		raw := json.RawMessage(`{"text":"fixture"}`)
		if mode == "unknown-detail" {
			raw = json.RawMessage(`{"text":"fixture","round":1}`)
		}
		if mode == "wrong-type" {
			raw = json.RawMessage(`{"text":1}`)
		}
		if c.acknowledgeHelperReminder(raw) {
			t.Fatalf("accepted %s", mode)
		}
	}
}

// A previously authenticated v2 chain may place a system after a whole round.
// Its identical text at the leading boundary must not make it a duplicate.
func TestHelperHistoryReplayTrailingSystemPreservesPosition(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	x := &helperHistoryExecution{payloadVersion: 2, public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 2}}
	r.helperHistory = x
	system := Object{"role": "system", "content": "same exact text at two distinct positions"}
	if err := r.applyHelperHistory(Object{"messages": []any{Object{"role": "user", "content": "public"}, system}}); err != nil {
		t.Fatal(err)
	}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	if err := r.applyHelperHistory(Object{"messages": append([]any{Object{"role": "user", "content": "public"}, system}, suffix...)}); err != nil {
		t.Fatal(err)
	}
	tail, err := helperSystemSegment(x.public, x.tools, 0, []any{system})
	if err != nil {
		t.Fatal(err)
	}
	x.imported = x.delta
	x.imported.Segments = append(x.imported.Segments, tail)
	x.delta = helperhistory.Payload{Version: 2}
	x.systemObserved = false
	cold := internalCacheReviewRequest()
	cold.Messages, cold.helperHistory = r.Messages, x
	body := Object{"messages": []any{Object{"role": "user", "content": "public"}, system}}
	if err := cold.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	messages := body["messages"].([]any)
	if len(messages) != 5 || digest(messages[1]) != digest(system) || digest(messages[4]) != digest(system) {
		t.Fatal("same-text system boundaries moved, merged or duplicated")
	}
}
