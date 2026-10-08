package gateway

import (
	"encoding/json"
	"fmt"
	"testing"

	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
)

// Exercise the public response -> next API request boundary, independently of
// the storage implementation. Opaque signatures and tool numbers are identity.
func TestReviewHelperDeliveredPrefixMatchesClientContinuation(t *testing.T) {
	user := json.RawMessage(`{"role":"user","content":"read"}`)
	content := `[{"type":"thinking","thinking":"reason","signature":"opaque-final"},{"type":"tool_use","id":"tool_1","name":"Read","input":{"offset":9007199254740993,"ratio":1.2300}}]`
	response := []byte(`{"type":"message","role":"assistant","id":"msg_1","model":"provider","content":` + content + `,"stop_reason":"tool_use","usage":{"input_tokens":2,"output_tokens":3}}`)
	delivered, err := helperDeliveredPrefix([]json.RawMessage{user}, response, false)
	if err != nil {
		t.Fatal(err)
	}
	request := []byte(`{"model":"alias","messages":[` + string(user) + `,{"content":` + content + `,"role":"assistant"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"tool_1","content":"file"}]}]}`)
	_, prefixes, err := publicHelperPrefixes(request)
	if err != nil || len(prefixes) != 1 || prefixes[0] != delivered {
		t.Fatalf("continuation identity differs: %v %v", prefixes, err)
	}
	for _, bad := range []string{
		`{"type":"message","role":"assistant","id":"msg_1","content":[],"stop_reason":null}`,
		`{"type":"message","role":"user","id":"msg_1","content":[],"stop_reason":"end_turn"}`,
		`{"type":"message","role":"assistant","id":"msg_1","content":[],"stop_reason":"end_turn","stop_reason":"tool_use"}`,
	} {
		if _, err := helperDeliveredPrefix([]json.RawMessage{user}, []byte(bad), false); err == nil {
			t.Fatal("invalid response acquired history identity")
		}
	}
}

func TestReviewHelperPublicLongHistoryAndCanonicalPrefix(t *testing.T) {
	messages := []json.RawMessage{}
	for i := 0; i < wire.MaxChainDepth+1; i++ {
		messages = append(messages, json.RawMessage(`{"role":"user","content":"<你好>"}`), json.RawMessage(fmt.Sprintf(`{"content":[{"type":"tool_use","name":"x","id":"t%d","input":{"n":9007199254740993,"d":1.2300}}],"role":"assistant"}`, i)))
	}
	raw, _ := json.Marshal(map[string]any{"model": "alias", "messages": messages})
	got, prefixes, err := publicHelperPrefixes(raw)
	if err != nil || len(prefixes) != wire.MaxChainDepth+1 {
		t.Fatalf("ordinary long history rejected: %d %v", len(prefixes), err)
	}
	for _, i := range []int{0, 17, wire.MaxChainDepth} {
		prefix, _ := json.Marshal(messages[:2*i+2])
		want, err := wire.CanonicalDigest(prefix)
		if err != nil || prefixes[i] != want {
			t.Fatal("incremental digest differs", i, err)
		}
	}
	if len(got) != len(messages) {
		t.Fatal("history truncated")
	}
}
