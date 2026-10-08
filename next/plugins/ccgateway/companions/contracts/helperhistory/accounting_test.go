package helperhistory

import (
	"encoding/json"
	"testing"
)

func TestAccountingProviderCallsRemainDistinct(t *testing.T) {
	f := json.RawMessage(`{"usage":{"input_tokens":9007199254740993}}`)
	a := AccountingEvidence{Source: AccountingProviderCalls, Known: true, Complete: true, Calls: []AccountingCall{{Complete: true, Frames: []json.RawMessage{f}}, {Complete: true, Frames: []json.RawMessage{f}}}}
	if e := a.Validate(); e != nil {
		t.Fatal(e)
	}
	b := a
	b.Frames = []json.RawMessage{f}
	if b.Validate() == nil {
		t.Fatal("mixed sources admitted")
	}
	b = a
	b.Source = AccountingPublic
	if b.Validate() == nil {
		t.Fatal("calls admitted as public")
	}
	a.Calls[1].Complete = false
	if a.Validate() == nil {
		t.Fatal("partial marked complete")
	}
	a.Complete = false
	if e := a.Validate(); e != nil {
		t.Fatal(e)
	}
	a.Source = "guessed"
	if a.Validate() == nil {
		t.Fatal("unknown source")
	}
}
