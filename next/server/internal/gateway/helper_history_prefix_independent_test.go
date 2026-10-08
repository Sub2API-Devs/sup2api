package gateway

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"hash"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

type failedClonePrefixHash struct{ hash.Hash }

func (failedClonePrefixHash) Clone() (hash.Cloner, error) { return nil, errors.ErrUnsupported }

func TestIndependentHelperPrefixCanonicalAndFailedClone(t *testing.T) {
	raw := []byte(`{"model":"x","messages":[{"role":"system","content":"before"},{"content":[{"input":{"a":-0,"b":1E+3,"c":1.2300,"d":1e400,"e":9007199254740993,"escaped":"\u003c&\u2028\u2029中文"},"type":"tool_use","id":"first"}],"role":"assistant"},{"role":"user","content":"next"},{"role":"system","content":"middle"},{"role":"assistant","content":[]}],"other":{"z":1,"a":2}}`)
	messages, prefixes, err := publicHelperPrefixes(raw)
	if err != nil || len(prefixes) != 2 {
		t.Fatal(err, prefixes)
	}
	state := failedClonePrefixHash{sha256.New()}
	state.Write([]byte("["))
	n := 0
	for i, m := range messages {
		if i > 0 {
			state.Write([]byte(","))
		}
		state.Write(m)
		var role struct{ Role string }
		json.Unmarshal(m, &role)
		if role.Role != "assistant" {
			continue
		}
		full, _ := json.Marshal(messages[:i+1])
		want, err := wire.CanonicalDigest(full)
		if err != nil || prefixes[n] != want {
			t.Fatal("incremental differs from canonical", err)
		}
		before := string(state.Sum(nil))
		for range 2 {
			got, err := publicPrefixDigest(state, messages[:i+1])
			if err != nil || got != want {
				t.Fatal("failed Clone fallback changed digest", err)
			}
		}
		if before != string(state.Sum(nil)) {
			t.Fatal("prefix digest mutated running state")
		}
		n++
	}
	for _, invalid := range []string{`{"messages":[{"role":"assistant","content":{"x":1,"\u0078":2}}]}`, `{"messages":[]} {}`, `{"messages":[{"role":"assistant","role":"user"}]}`} {
		if _, _, err := publicHelperPrefixes([]byte(invalid)); err == nil {
			t.Fatal("noncanonical ambiguity accepted")
		}
	}
}
