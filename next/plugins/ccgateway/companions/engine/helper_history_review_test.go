package engine

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func TestReviewHelperHistoryRejectsUnobservedEnvelopeControls(t *testing.T) {
	for _, test := range []struct {
		name    string
		message int
		field   string
		value   any
	}{
		{"assistant-output-config", 0, "output_config", Object{"effort": "high"}},
		{"user-clear-at", 1, "clear_at", "source"},
	} {
		t.Run(test.name, func(t *testing.T) {
			r := internalCacheReviewRequest()
			suffix := internalCacheSuffix()
			blocks, _ := historyContent(suffix[0].(Object)["content"])
			observeCacheFixture(r, blocks)
			confirmReviewHidden(t, r)
			suffix[test.message].(Object)[test.field] = test.value
			if _, err := r.captureHelperHistory(json.RawMessage(`[{"role":"user","content":"public"}]`), json.RawMessage(`[]`), 0, suffix); err == nil {
				t.Fatal("unobserved hidden envelope control was captured")
			}
		})
	}
}

func TestReviewHelperHistoryReplayPairAndDirectoryBoundaries(t *testing.T) {
	public := json.RawMessage(`[{"role":"user","content":"public"},{"role":"assistant","content":"answer"}]`)
	tools := json.RawMessage(`[{"name":"weather","input_schema":{"type":"object"}}]`)
	r := internalCacheReviewRequest()
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	segment, err := r.captureHelperHistory(public, tools, 0, suffix)
	if err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"wrong-result-id", "extra-result", "unknown-reference", "client-owned-helper", "disabled-search", "forced-catalog"} {
		t.Run(kind, func(t *testing.T) {
			copyRaw, _ := json.Marshal(segment)
			var candidate helperhistory.Segment
			json.Unmarshal(copyRaw, &candidate)
			view := internalCacheReviewRequest()
			result, _ := decodeObject(candidate.Messages[1])
			bs, _ := historyContent(result["content"])
			switch kind {
			case "wrong-result-id":
				bs[0]["tool_use_id"] = "other"
			case "extra-result":
				bs = append(bs, bs[0])
			case "unknown-reference":
				bs[0]["content"] = []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__unknown"}}
			case "client-owned-helper":
				view.Tools = append(view.Tools, Tool{Name: "ToolSearch"})
				view.Native = map[string]bool{"ToolSearch": true}
			case "disabled-search":
				view.ToolSearch = "false"
			case "forced-catalog":
				view.Plan = &RequestPlan{fields: map[string]json.RawMessage{"tool_choice": json.RawMessage(`{"type":"any"}`)}}
				no := false
				view.Tools[0].DeferLoading = &no
			}
			result["content"] = bs
			candidate.Messages[1], _ = json.Marshal(result)
			if _, err = view.replayHelperHistory(public, tools, helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{candidate}}); err == nil {
				t.Fatal("invalid replay accepted")
			}
		})
	}
}

func TestReviewHelperHistoryWholeHiddenThinkingAndText(t *testing.T) {
	public := json.RawMessage(`[{"role":"user","content":"public"},{"role":"assistant","content":"final"}]`)
	tools := json.RawMessage(`[{"name":"weather","input_schema":{"type":"object"}}]`)
	r := internalCacheReviewRequest()
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	blocks = append([]Object{{"type": "thinking", "thinking": "hidden reasoning", "signature": "opaque-signature-exact"}, {"type": "text", "text": "hidden search preface"}}, blocks...)
	suffix[0].(Object)["content"] = blocks
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	segment, err := r.captureHelperHistory(public, tools, 0, suffix)
	if err != nil {
		t.Fatal("whole attributed hidden round incorrectly classified as public overlap", err)
	}
	replay, err := r.replayHelperHistory(public, tools, helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}})
	if err != nil {
		t.Fatal(err)
	}
	want, _ := json.Marshal(suffix[0])
	gotDigest, _ := helperhistory.CanonicalDigest(replay[1])
	wantDigest, _ := helperhistory.CanonicalDigest(want)
	if gotDigest != wantDigest {
		t.Fatal("whole hidden thinking/text/signature changed")
	}
	if string(replay[0]) != `{"role":"user","content":"public"}` || string(replay[3]) != `{"role":"assistant","content":"final"}` {
		t.Fatal("public messages changed")
	}
}

func confirmReviewHidden(t *testing.T, r *Request) {
	t.Helper()
	for i, id := range r.internalCache.roundIDs {
		source := r.internalCache.rounds[i]
		if err := r.confirmHiddenHelperMessage(Object{"id": id, "content": source["content"]}); err != nil {
			t.Fatal(err)
		}
	}
}
func TestReviewHelperHistoryObservedIsNotProofOfHidden(t *testing.T) {
	r := internalCacheReviewRequest()
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	if _, err := r.captureHelperHistory(json.RawMessage(`[{"role":"user","content":"public"}]`), json.RawMessage(`[]`), 0, suffix); err == nil {
		t.Fatal("observed but potentially public round accepted")
	}
	source := r.internalCache.rounds[0]
	if err := r.confirmHiddenHelperMessage(Object{"id": "other_message", "content": source["content"]}); err == nil {
		t.Fatal("wrong provider message identity accepted")
	}
}

func TestReviewHelperHistoryChangedSignatureAndUnknownBlocks(t *testing.T) {
	for _, kind := range []string{"signature", "unknown-block", "server-block"} {
		t.Run(kind, func(t *testing.T) {
			r := internalCacheReviewRequest()
			suffix := internalCacheSuffix()
			blocks, _ := historyContent(suffix[0].(Object)["content"])
			switch kind {
			case "signature":
				blocks = append([]Object{{"type": "thinking", "thinking": "private", "signature": "original"}}, blocks...)
			case "unknown-block":
				blocks = append(blocks, Object{"type": "future_instruction", "opaque": "not registered"})
			case "server-block":
				blocks = append(blocks, Object{"type": "server_tool_use", "id": "server_call", "name": "web_search", "input": Object{"query": "fixture"}})
			}
			suffix[0].(Object)["content"] = blocks
			observeCacheFixture(r, blocks)
			confirmReviewHidden(t, r)
			if kind == "signature" {
				blocks[0]["signature"] = "changed"
			}
			if _, err := r.captureHelperHistory(json.RawMessage(`[{"role":"user","content":"public"}]`), json.RawMessage(`[]`), 0, suffix); err == nil {
				t.Fatal("unproven hidden semantics accepted")
			}
		})
	}
}
