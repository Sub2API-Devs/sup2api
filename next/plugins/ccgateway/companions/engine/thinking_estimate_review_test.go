package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReviewThinkingEstimatePreservesHiddenLedger(t *testing.T) {
	r := internalCacheReviewRequest()
	recorder := httptest.NewRecorder()
	writeHelperHistoryFixture(recorder, "fixture", []Object{{"type": "thinking", "thinking": "reason", "signature": "opaque"}, {"type": "tool_use", "id": "estimate-helper", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
	for _, line := range strings.Split(recorder.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, err := decodeObject([]byte(strings.TrimSpace(line[5:])))
		if err != nil {
			t.Fatal(err)
		}
		if d, ok := e["delta"].(Object); ok && str(d, "type") == "thinking_delta" {
			d["estimated_tokens"] = json.Number("9007199254740993")
		}
		before := digest(e)
		r.observeInternalCacheEvent(e)
		if digest(e) != before {
			t.Fatal("source event changed")
		}
	}
	if r.internalCache.failed || len(r.internalCache.rounds) != 1 {
		t.Fatal("official progress estimate invalidated complete hidden response")
	}
	raw, _ := json.Marshal(r.internalCache.rounds[0])
	if bytes.Contains(raw, []byte("estimated_tokens")) || !bytes.Contains(raw, []byte(`"signature":"opaque"`)) {
		t.Fatal("progress leaked into history or signature changed")
	}
}

func TestReviewThinkingEstimateAccumulator(t *testing.T) {
	for _, estimate := range []any{nil, json.Number("0"), json.Number("9007199254740993")} {
		events := thinkingFixtureEvents("", "opaque")
		delta := Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "thinking_delta", "thinking": "reason", "estimated_tokens": estimate}}
		events = append(append(append([]Object{}, events[:2]...), delta), events[2:]...)
		a := &Accumulator{}
		for _, e := range events {
			before := digest(e)
			if err := a.push(e, &Request{}); err != nil {
				t.Fatal(err)
			}
			if digest(e) != before {
				t.Fatal("public stream event changed")
			}
		}
		raw, _ := json.Marshal(a.Message)
		if !a.Done || bytes.Contains(raw, []byte("estimated_tokens")) {
			t.Fatal("estimate persisted as final content or usage")
		}
		usage, _ := a.Message["usage"].(Object)
		if tokenCount(usage["input_tokens"]) != 2 || tokenCount(usage["output_tokens"]) != 3 {
			t.Fatal("progress estimate altered billed token facts")
		}
	}
}
