package engine

import (
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func TestReviewHelperRestoreFailureCannotExportOrInsert(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	public := json.RawMessage(`[{"role":"user","content":"public"}]`)
	segment, err := helperSystemSegment(public, json.RawMessage(`[]`), 0, nil)
	if err != nil {
		t.Fatal(err)
	}
	segment.Kind = helperhistory.SegmentWholeRound
	for _, m := range internalCacheSuffix() {
		raw, _ := json.Marshal(m)
		segment.Messages = append(segment.Messages, raw)
	}
	x := &helperHistoryExecution{payloadVersion: 2, public: public, tools: json.RawMessage(`[]`), imported: helperhistory.Payload{Version: 2, Segments: []helperhistory.Segment{segment}}, delta: helperhistory.Payload{Version: 2}}
	r.helperHistory = x
	body := Object{"messages": []any{Object{"role": "user", "content": "public"}}}
	called := 0
	failure := errors.New("fixture public position rejected")
	err = r.applyHelperHistory(body, func(Object) error { called++; return failure })
	if !errors.Is(err, failure) || called != 1 || len(body["messages"].([]any)) != 1 {
		t.Fatal("failed public restore inserted private rows or hid error")
	}
	if _, err = x.exportDelta(); !errors.Is(err, failure) {
		t.Fatal("failed public restoration exported successful delta")
	}
}

func TestReviewHelperAlignmentMustPrecedePublicRestore(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	r.helperHistory = &helperHistoryExecution{payloadVersion: 2, public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 2}}
	called := false
	err := r.applyHelperHistory(Object{"messages": []any{Object{"role": "user", "content": "changed"}}}, func(Object) error { called = true; return nil })
	if err == nil || called {
		t.Fatal("unverified public view reached attachment restore")
	}
}
