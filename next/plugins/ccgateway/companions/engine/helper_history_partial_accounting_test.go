package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperHistoryFailedNextWireKeepsConsumedUsage(t *testing.T) {
	r := internalCacheReviewRequest()
	r.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "public"}}}}
	r.helperHistory = &helperHistoryExecution{public: json.RawMessage(`[{"role":"user","content":"public"}]`), tools: json.RawMessage(`[]`), delta: helperhistory.Payload{Version: 1}}
	suffix := internalCacheSuffix()
	blocks, _ := historyContent(suffix[0].(Object)["content"])
	recorder := httptest.NewRecorder()
	writeInternalCacheFixture(recorder, "fixture", blocks)
	o := &apiTerminalObserver{req: r, relay: &outboundRelay{}}
	for _, frame := range strings.Split(recorder.Body.String(), "\n\n") {
		o.observe([]byte(frame))
	}
	if err := r.confirmHiddenHelperMessage(Object{"id": r.internalCache.roundIDs[0], "content": blocks}); err != nil {
		t.Fatal(err)
	}
	results, _ := historyContent(suffix[1].(Object)["content"])
	results[0]["tool_use_id"] = "unproven"
	wire := Object{"messages": append([]any{Object{"role": "user", "content": "public"}}, suffix...)}
	if err := r.applyHelperHistory(wire); err == nil {
		t.Fatal("invalid second wire accepted")
	}
	a := r.helperHistory.failureAccounting(helperhistory.AccountingEvidence{})
	if a.Source != helperhistory.AccountingProviderCalls || !a.Known || a.Complete || len(a.Calls) != 1 || !a.Calls[0].Complete {
		t.Fatal("completed first call accounting was lost or whole request falsely complete")
	}
	if err := a.Validate(); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(a.Calls[0].Frames)
	if !bytes.Contains(raw, []byte(`"input_tokens":20`)) || !bytes.Contains(raw, []byte(`"output_tokens":8`)) {
		t.Fatal("original observed usage facts missing")
	}
	public := helperhistory.AccountingEvidence{Known: true, Complete: true, Frames: []json.RawMessage{json.RawMessage(`{"usage":{"input_tokens":40,"output_tokens":16}}`)}}
	selected := r.helperHistory.failureAccounting(public)
	if selected.Source != helperhistory.AccountingPublic || len(selected.Calls) != 0 || len(selected.Frames) != 1 {
		t.Fatal("public aggregate double counted with provider calls")
	}
}

func TestHelperHistoryIncompleteSecondCallKeepsSeparateFacts(t *testing.T) {
	x := &helperHistoryExecution{}
	var first, second *helperAccounting
	x.observeProviderAccounting(&first, []byte(`{"type":"message_start","message":{"model":"fixture","usage":{"input_tokens":9007199254740993}}}`))
	x.observeProviderAccounting(&first, []byte(`{"type":"message_delta","usage":{"output_tokens":8}}`))
	x.observeProviderAccounting(&first, []byte(`{"type":"message_stop"}`))
	x.observeProviderAccounting(&second, []byte(`{"type":"message_start","message":{"model":"fixture","usage":{"input_tokens":17}}}`))
	a := x.failureAccounting(helperhistory.AccountingEvidence{})
	if !a.Known || a.Complete || len(a.Calls) != 2 || !a.Calls[0].Complete || a.Calls[1].Complete {
		t.Fatal("call boundaries or incomplete outcome changed")
	}
	if !bytes.Contains(a.Calls[0].Frames[0], []byte("9007199254740993")) {
		t.Fatal("number rounded")
	}
	if err := a.Validate(); err != nil {
		t.Fatal(err)
	}
}
