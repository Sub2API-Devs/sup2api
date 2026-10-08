package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestReviewHelperRuntimeDoesNotDropUnrecordedSystemBetweenRounds(t *testing.T) {
	testReviewHelperSystemBoundary(t, false)
}

func TestReviewHelperRuntimeDoesNotMoveLeadingSystemAcrossHiddenRound(t *testing.T) {
	testReviewHelperSystemBoundary(t, true)
}

func testReviewHelperSystemBoundary(t *testing.T, leading bool) {
	t.Helper()
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	r.helperHistory = &helperHistoryExecution{public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 1}}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	messages := []any{Object{"role": "user", "content": "public"}, suffix[0], Object{"role": "system", "content": "unrecorded hidden-turn instruction"}, suffix[1]}
	if leading {
		messages[1], messages[2] = messages[2], messages[1]
	}
	body := Object{"messages": messages}
	if err := r.applyHelperHistory(body); err == nil {
		t.Fatal("hidden-round system message omitted from durable payload without proof")
	}
}

func TestReviewHelperReplaySystemRequiresExactBoundaryObject(t *testing.T) {
	for _, changed := range []bool{false, true} {
		r := internalCacheReviewRequest()
		r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
		x := &helperHistoryExecution{public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 1}}
		r.helperHistory = x
		system := Object{"role": "system", "content": "catalog"}
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
		x.imported, x.delta = x.delta, helperhistory.Payload{Version: 1}
		x.systemObserved = false
		cold := internalCacheReviewRequest()
		cold.Messages = r.Messages
		cold.helperHistory = x
		current := Object{"role": "system", "content": "catalog"}
		if changed {
			current["content"] = "different catalog"
		}
		body := Object{"messages": []any{Object{"role": "user", "content": "public"}, current}}
		err := cold.applyHelperHistory(body)
		if changed {
			if err == nil {
				t.Fatal("different system replaced by persisted system")
			}
			continue
		}
		if err != nil {
			t.Fatal(err)
		}
		messages := body["messages"].([]any)
		if len(messages) != 4 || digest(messages[1]) != digest(system) {
			t.Fatal("system duplicated or moved")
		}
	}
}

func TestReviewHelperSystemMatchingDoesNotPartiallySuppress(t *testing.T) {
	one := Object{"role": "system", "content": "one"}
	two := Object{"role": "system", "content": "two"}
	for _, actual := range [][]any{{one}, {one, two, two}, {one, Object{"role": "system", "content": "changed"}}} {
		skipped := map[int]bool{}
		if err := matchReplayedHelperSystems(actual, map[int]bool{}, skipped, 0, []any{one, two}); err == nil || len(skipped) != 0 {
			t.Fatal("partial system match changed replay suppression")
		}
	}
	skipped := map[int]bool{}
	if err := matchReplayedHelperSystems([]any{one}, map[int]bool{0: true}, skipped, 0, []any{two}); err != nil || len(skipped) != 0 {
		t.Fatal("client public system was consumed as private helper system")
	}
}
