package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewHelperInlineConsecutiveSystemAnchor(t *testing.T) {
	public := json.RawMessage(`[{"role":"user","content":"u"},{"role":"system","content":"first"},{"role":"system","content":"second"}]`)
	a, _, err := helperHistoryAnchors(public, json.RawMessage(`[]`), 2)
	if err != nil {
		t.Fatal(err)
	}
	mutated := json.RawMessage(`[{"role":"user","content":"u"},{"role":"system","content":"changed"},{"role":"system","content":"second"}]`)
	b, _, err := helperHistoryAnchors(mutated, json.RawMessage(`[]`), 2)
	if err != nil || a == b {
		t.Fatal("directive omitted from public anchor")
	}
}

func TestReviewHelperInlineViewDoesNotAliasDiscoveryOrDirectory(t *testing.T) {
	r, _, _ := helperInlineFixture(t, nil)
	r.internalCache = &internalCacheRounds{discovered: map[string]bool{"fixture": true}}
	original := digest(r.InlineTools)
	v, err := r.helperInlineHistoryView(1)
	if err != nil {
		t.Fatal(err)
	}
	v.InlineTools.Active["alpha"] = true
	v.InlineTools.Searchable["beta"] = false
	v.InlineTools.Withdrawn["beta"] = true
	if digest(r.InlineTools) != original || v.internalCache != nil || !r.internalCache.discovered["fixture"] {
		t.Fatal("historical mutable discovery aliases current request")
	}
	early, err := r.helperInlineHistoryView(0)
	if err != nil || early.InlineTools != nil || len(early.Tools) != 1 || early.Tools[0].Name != "alpha" {
		t.Fatal("early prefix retains future catalog", err)
	}
}
