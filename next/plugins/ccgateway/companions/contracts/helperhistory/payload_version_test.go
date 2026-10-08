package helperhistory

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func versionTwoFixture(kind string, messages ...json.RawMessage) json.RawMessage {
	raw, _ := json.Marshal(Payload{Version: 2, Segments: []Segment{{Kind: kind, AfterMessage: 0, PublicAnchorDigest: strings.Repeat("a", 64), ToolCatalogDigest: strings.Repeat("b", 64), Messages: messages}}})
	return raw
}
func TestHelperPayloadVersionNegotiation(t *testing.T) {
	v2 := versionTwoFixture(SegmentSystemOnly, json.RawMessage(`{"role":"system","content":"PRIVATE_ORIGINAL"}`))
	old := json.RawMessage("{\n\"version\":1,\"segments\":[]}")
	r := transportFixture(t)
	r.History = []json.RawMessage{old, v2}
	if r.Validate() == nil {
		t.Fatal("omission accepted version2")
	}
	r.PayloadVersion = 2
	if err := r.Validate(); err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(old, r.History[0]) {
		t.Fatal("old receipt bytes rewritten")
	}
	encoded, _ := json.Marshal(r)
	for _, v := range []string{"0", "null", "3", "\"2\"", "1.0"} {
		bad := bytes.Replace(encoded, []byte(`"payload_version":2`), []byte(`"payload_version":`+v), 1)
		if _, err := DecodeRequest(bad); err == nil {
			t.Fatal("invalid explicit payload version accepted", v)
		}
	}
	r.PayloadVersion = 0
	r.History = []json.RawMessage{old}
	encoded, _ = json.Marshal(r)
	if bytes.Contains(encoded, []byte("payload_version")) {
		t.Fatal("legacy peer receives new field")
	}
	if _, err := DecodeRequest(encoded); err != nil {
		t.Fatal(err)
	}
}
func TestHelperPayloadKindsRemainClosed(t *testing.T) {
	for _, content := range []string{`""`, `[]`, `null`, `{}`} {
		if Validate(versionTwoFixture(SegmentSystemOnly, json.RawMessage(`{"role":"system","content":`+content+`}`))) == nil {
			t.Fatal("empty/invalid system accepted")
		}
	}
	for _, role := range []string{"user", "assistant", "tool"} {
		if Validate(versionTwoFixture(SegmentSystemOnly, json.RawMessage(`{"role":"`+role+`","content":[{"type":"text","text":"x"}]}`))) == nil {
			t.Fatal("non-system accepted")
		}
	}
	valid := versionTwoFixture(SegmentSystemOnly, json.RawMessage(`{"role":"system","content":"x"}`))
	if err := Validate(valid); err != nil {
		t.Fatal(err)
	}
	if Validate(bytes.Replace(valid, []byte(`"version":2`), []byte(`"version":1`), 1)) == nil {
		t.Fatal("v1 accepted new kind")
	}
	if Validate(versionTwoFixture(SegmentWholeRound, json.RawMessage(`{"role":"system","content":"x"}`))) == nil {
		t.Fatal("whole round accepted system only")
	}
}
