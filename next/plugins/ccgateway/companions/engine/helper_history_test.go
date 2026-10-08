package engine

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperHistoryCaptureReplay(t *testing.T) {
	public := json.RawMessage(`[{"role":"user","content":"public"},{"role":"assistant","content":"answer"}]`)
	tools := json.RawMessage(`[{"name":"weather","input_schema":{"type":"object","minimum":9007199254740993}}]`)
	r := internalCacheReviewRequest()
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	blocks[0]["input"].(Object)["precise"] = json.Number("9007199254740993")
	observeCacheFixture(r, blocks)
	if err := r.confirmHiddenHelperMessage(Object{"id": r.internalCache.roundIDs[0], "content": blocks}); err != nil {
		t.Fatal(err)
	}
	segment, err := r.captureHelperHistory(public, tools, 0, suffix)
	if err != nil {
		t.Fatal(err)
	}
	payload := helperhistory.Payload{Version: 1, Segments: []helperhistory.Segment{segment}}
	out, err := r.replayHelperHistory(public, tools, payload)
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 4 || !bytes.Contains(out[1], []byte("9007199254740993")) {
		t.Fatal("hidden order or numeric lexeme changed")
	}
	original := append([]byte(nil), segment.Messages[0]...)
	out[1][0] = 'x'
	if !bytes.Equal(original, segment.Messages[0]) {
		t.Fatal("replay aliases persistent payload")
	}
	for _, mutate := range []string{"anchor", "catalog", "duplicate-id", "unpaired", "public-overlap", "client-collision", "changed-public", "duplicate-json"} {
		t.Run(mutate, func(t *testing.T) {
			copyRaw, _ := json.Marshal(payload)
			var candidate helperhistory.Payload
			json.Unmarshal(copyRaw, &candidate)
			p := append(json.RawMessage(nil), public...)
			catalog := append(json.RawMessage(nil), tools...)
			switch mutate {
			case "anchor":
				candidate.Segments[0].PublicAnchorDigest = string(bytes.Repeat([]byte("0"), 64))
			case "catalog":
				catalog = bytes.ReplaceAll(catalog, []byte("9007199254740993"), []byte("9007199254740992"))
			case "duplicate-id":
				candidate.Segments = append(candidate.Segments, candidate.Segments[0])
			case "unpaired":
				candidate.Segments[0].Messages = candidate.Segments[0].Messages[:1]
			case "public-overlap":
				message, _ := decodeObject(candidate.Segments[0].Messages[0])
				bs, _ := historyContent(message["content"])
				message["content"] = append(bs, Object{"type": "tool_use", "id": "external", "name": "mcp__ccgateway__weather", "input": Object{}})
				candidate.Segments[0].Messages[0], _ = json.Marshal(message)
			case "client-collision":
				p = json.RawMessage(`[{"role":"user","content":"public"},{"role":"assistant","content":[{"type":"tool_use","id":"call_search","name":"weather","input":{}}]}]`)
			case "changed-public":
				p = bytes.ReplaceAll(p, []byte("public"), []byte("changed"))
			case "duplicate-json":
				p = json.RawMessage(`[{"role":"user","role":"user","content":"public"}]`)
			}
			if _, err := r.replayHelperHistory(p, catalog, candidate); err == nil {
				t.Fatal("unproven replay accepted")
			}
		})
	}
}

func TestHelperHistoryRequiresProviderEvidence(t *testing.T) {
	r := internalCacheReviewRequest()
	if _, err := r.captureHelperHistory(json.RawMessage(`[{"role":"user","content":"public"}]`), json.RawMessage(`[]`), 0, internalCacheSuffix()); err == nil {
		t.Fatal("client lookalike became trusted evidence")
	}
}
