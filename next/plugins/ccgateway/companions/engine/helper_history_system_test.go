package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperSystemSourceConversionIsNarrow(t *testing.T) {
	base := Object{"role": "system", "content": []any{Object{"type": "text", "text": "catalog", "cache_control": Object{"type": "ephemeral"}}}}
	actual := []any{Object{"role": "system", "content": "catalog"}}
	if !helperSystemsMatchSource([]any{base}, actual) {
		t.Fatal("observed conversion rejected")
	}
	for _, mode := range []string{"text", "unknown-block", "unknown-cache", "cache-type", "ttl", "multiple", "envelope"} {
		t.Run(mode, func(t *testing.T) {
			candidate := cloneHelperMessages([]any{base})
			m := candidate[0].(Object)
			blocks := m["content"].([]any)
			b := blocks[0].(Object)
			switch mode {
			case "text":
				b["text"] = "changed"
			case "unknown-block":
				b["future"] = true
			case "unknown-cache":
				b["cache_control"].(Object)["future"] = true
			case "cache-type":
				b["cache_control"].(Object)["type"] = "persistent"
			case "ttl":
				b["cache_control"].(Object)["ttl"] = "2h"
			case "multiple":
				m["content"] = append(blocks, b)
			case "envelope":
				m["output_config"] = Object{"effort": "high"}
			}
			if helperSystemsMatchSource(candidate, actual) {
				t.Fatal("unproved conversion accepted")
			}
		})
	}
}

func TestHelperSystemCaptureAndReplayAtOriginalBoundary(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	r.helperHistory = &helperHistoryExecution{public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 1}}
	first := Object{"role": "system", "content": []any{Object{"type": "text", "text": "catalog", "cache_control": Object{"type": "ephemeral"}}}}
	if err := r.applyHelperHistory(Object{"messages": []any{Object{"role": "user", "content": "public"}, first}}); err != nil {
		t.Fatal(err)
	}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	observeCacheFixture(r, blocks)
	confirmReviewHidden(t, r)
	actual := Object{"role": "system", "content": "catalog"}
	body := Object{"messages": append([]any{Object{"role": "user", "content": "public"}, actual}, suffix...)}
	if err := r.applyHelperHistory(body); err != nil {
		t.Fatal(err)
	}
	x := r.helperHistory
	if len(x.delta.Segments) != 1 || len(x.delta.Segments[0].Messages) != 3 {
		t.Fatal("system not persisted with whole pair")
	}
	saved, _ := decodeObject(x.delta.Segments[0].Messages[0])
	if digest(saved) != digest(actual) {
		t.Fatal("old marker copied instead of current object")
	}
	public := json.RawMessage(`[{"role":"user","content":"public"},{"role":"system","content":"client system after boundary"},{"role":"assistant","content":"public answer"}]`)
	out, err := r.replayHelperHistory(public, x.tools, x.delta)
	if err != nil {
		t.Fatal(err)
	}
	var rootSystem Object
	json.Unmarshal(out[4], &rootSystem)
	if str(rootSystem, "content") != "client system after boundary" || digest(out[1]) != digest(x.delta.Segments[0].Messages[0]) {
		t.Fatal("system crossed public boundary")
	}
}
