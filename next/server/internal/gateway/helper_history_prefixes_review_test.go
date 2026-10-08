package gateway

import (
	"crypto/sha256"
	"encoding/json"
	"hash"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

type nonCloneReviewHash struct{ hash.Hash }

func TestReviewPublicHelperPrefixCloneAndFallbackPreserveNumbers(t *testing.T) {
	raw := []byte(`{"messages":[{"role":"user","content":"<user>"},{"role":"assistant","content":[{"type":"tool_use","id":"fixture","input":{"integer":9007199254740993,"fraction":1.00}}]},{"role":"user","content":"next"},{"role":"assistant","content":"done"}]}`)
	ms, got, err := publicHelperPrefixes(raw)
	if err != nil || len(got) != 2 {
		t.Fatal("prefix parse", err)
	}
	for i, after := range []int{1, 3} {
		prefix, _ := json.Marshal(ms[:after+1])
		want, err := wire.CanonicalDigest(prefix)
		if err != nil || got[i] != want {
			t.Fatal("incremental prefix changed", err)
		}
		state := nonCloneReviewHash{sha256.New()}
		state.Write(prefix[:len(prefix)-1])
		fallback, err := publicPrefixDigest(state, ms[:after+1])
		if err != nil || fallback != want {
			t.Fatal("noncloning hash fallback changed", err)
		}
	}
	if _, _, err := publicHelperPrefixes([]byte(`{"messages":[],"messages":[{"role":"assistant","content":"x"}]}`)); err == nil {
		t.Fatal("duplicate message key accepted")
	}
}
