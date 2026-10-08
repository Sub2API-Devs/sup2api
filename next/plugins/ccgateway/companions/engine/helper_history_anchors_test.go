package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

func TestHelperAnchorIndexPreservesExactPublicAndCatalog(t *testing.T) {
	public := json.RawMessage(`[{"role":"user","content":[{"type":"tool_result","tool_use_id":"one","content":"9007199254740993"}]},{"role":"assistant","content":[{"type":"tool_use","id":"two","name":"fixture","input":{"n":9007199254740993}}]},{"role":"user","content":"next"}]`)
	tools := json.RawMessage(`[{"name":"fixture","input_schema":{"type":"object","const":9007199254740993}}]`)
	index, err := newHelperAnchorIndex(public, tools)
	if err != nil {
		t.Fatal(err)
	}
	var messages []json.RawMessage
	if err = json.Unmarshal(public, &messages); err != nil {
		t.Fatal(err)
	}
	for _, after := range []int{2, 0, 2, 0} {
		raw, _ := json.Marshal(messages[:after+1])
		want, _ := helperhistory.CanonicalDigest(raw)
		got, err := index.at(after)
		if err != nil || got != want {
			t.Fatal("public prefix changed", err)
		}
	}
	for _, invalid := range []int{-1, 1, 3} {
		if _, err := index.at(invalid); err == nil {
			t.Fatal("invalid boundary accepted")
		}
	}
	want, _ := helperhistory.CanonicalDigest(tools)
	if index.catalog != want {
		t.Fatal("tool catalog changed")
	}
	for _, pair := range [][2]json.RawMessage{{json.RawMessage(`[{"role":"user","role":"assistant","content":[]}]`), tools}, {public, json.RawMessage(`[{"name":"a","name":"b"}]`)}} {
		if _, err := newHelperAnchorIndex(pair[0], pair[1]); err == nil {
			t.Fatal("duplicate keys accepted")
		}
	}
}
