package engine

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func TestHelperPositionalSystemsStayBeforePublicDirective(t *testing.T) {
	r, public, tools := helperInlineFixture(t, nil)
	if err := r.admitHelperHistory(r.helperHistory); err != nil {
		t.Fatal(err)
	}
	var rows []any
	if err := json.Unmarshal(public, &rows); err != nil {
		t.Fatal(err)
	}
	// Decode with the production number-preserving decoder.
	for i, raw := range helperPublicRowsForTest(t, public) {
		rows[i], _ = decodeObject(raw)
	}
	system := Object{"role": "system", "content": "private catalogue"}
	positions, err := helperInterleavedSystems([]any{rows[0], system, rows[1]}, []int{0, 2})
	if err != nil {
		t.Fatal(err)
	}
	pos, err := helperSystemSegment(public, tools, 0, positions[0])
	if err != nil {
		t.Fatal(err)
	}
	r.internalCache = &internalCacheRounds{results: map[string]string{}, helpers: map[string]string{}}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	blocks[0]["input"] = Object{"query": "select:mcp__ccgateway__alpha"}
	results, _ := historyContent(suffix[1].(Object)["content"])
	results[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__alpha"}}
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	whole, err := r.captureHelperHistory(public, tools, 1, suffix)
	if err != nil {
		t.Fatal(err)
	}
	whole.Kind = helperhistory.SegmentWholeRound
	delta := helperhistory.Payload{Version: 2, Segments: []helperhistory.Segment{pos, whole}}
	if len(delta.Segments) != 2 || delta.Segments[0].Kind != helperhistory.SegmentSystemOnly || delta.Segments[0].AfterMessage != 0 || delta.Segments[1].AfterMessage != 1 {
		t.Fatalf("wrong positions: %+v", delta.Segments)
	}
	out, err := r.replayHelperHistory(public, tools, delta)
	if err != nil {
		t.Fatal(err)
	}
	var got Object
	_ = json.Unmarshal(out[1], &got)
	if digest(got) != digest(system) {
		t.Fatal("catalogue changed")
	}
	actual, _ := decodeObject(out[2])
	if digest(actual) != digest(rows[1]) {
		t.Fatal("public directive copied or moved")
	}
	bad := delta
	bad.Segments = append([]helperhistory.Segment(nil), delta.Segments...)
	bad.Segments[0].AfterMessage = 1
	if _, err := r.replayHelperHistory(public, tools, bad); err == nil {
		t.Fatal("wrong anchor accepted")
	}
}

func helperPublicRowsForTest(t *testing.T, raw []byte) []json.RawMessage {
	t.Helper()
	var rows []json.RawMessage
	if err := json.Unmarshal(raw, &rows); err != nil {
		t.Fatal(err)
	}
	return rows
}

func TestHelperInlineRequiresNegotiatedPositions(t *testing.T) {
	r, _, _ := helperInlineFixture(t, nil)
	r.helperHistory.payloadVersion = 1
	if err := r.admitHelperHistory(r.helperHistory); err == nil {
		t.Fatal("v1 inline silently accepted")
	}
}

func TestHelperPositionalSystemSourceCannotMoveOrMutate(t *testing.T) {
	original := map[int][]any{0: {Object{"role": "system", "content": "private"}}}
	for _, changed := range []map[int][]any{{1: original[0]}, {0: {Object{"role": "system", "content": "changed"}}}, {}} {
		if sameHelperSystemPositions(original, changed) {
			t.Fatal("source position/identity changed")
		}
	}
}

func TestHelperPositionalGapRejectsNonSystem(t *testing.T) {
	for _, role := range []string{"assistant", "user"} {
		_, err := helperInterleavedSystems([]any{Object{"role": "user", "content": "public"}, Object{"role": role, "content": "unregistered"}, Object{"role": "system", "content": "public directive"}}, []int{0, 2})
		if err == nil {
			t.Fatal("non-system public gap accepted")
		}
	}
}
