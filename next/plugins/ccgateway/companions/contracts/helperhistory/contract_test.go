package helperhistory

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestCanonicalIdentity(t *testing.T) {
	a, e := CanonicalDigest([]byte(`{"n":9007199254740993,"x":[1,2]}`))
	if e != nil {
		t.Fatal(e)
	}
	b, e := CanonicalDigest([]byte(` { "x" : [1,2], "n":9007199254740993 } `))
	if e != nil || a != b {
		t.Fatal("whitespace/object order changed identity")
	}
	c, _ := CanonicalDigest([]byte(`{"n":9007199254740992,"x":[1,2]}`))
	if c == a {
		t.Fatal("integer rounded")
	}
	for _, bad := range []string{`{"n":1,"n":2}`, `{"x":{"a":1,"\u0061":2}}`, `{} {}`, `[`} {
		if _, e = CanonicalDigest([]byte(bad)); e == nil {
			t.Fatal("bad JSON", bad)
		}
	}
}
func TestPayloadFraming(t *testing.T) {
	p := Payload{Version: Version, Segments: []Segment{{AfterMessage: 0, PublicAnchorDigest: strings.Repeat("a", 64), ToolCatalogDigest: strings.Repeat("b", 64), Messages: []json.RawMessage{json.RawMessage(`{"role":"assistant","content":[{"type":"tool_use","id":"a","name":"ToolSearch","input":{"n":9007199254740993}}]}`), json.RawMessage(`{"role":"user","content":[{"type":"tool_result","tool_use_id":"a","content":"ok"}]}`)}}}}
	raw, _ := json.Marshal(p)
	if e := Validate(raw); e != nil {
		t.Fatal(e)
	}
	for _, bad := range [][]byte{bytes.Replace(raw, []byte(`"version":1`), []byte(`"version":1,"future":true`), 1), bytes.Replace(raw, []byte(`"after_message":0`), []byte(`"after_message":-1`), 1), bytes.Replace(raw, []byte(`"version":1`), []byte(`"version":1,"version":1`), 1)} {
		if Validate(bad) == nil {
			t.Fatal("invalid framing accepted")
		}
	}
}
