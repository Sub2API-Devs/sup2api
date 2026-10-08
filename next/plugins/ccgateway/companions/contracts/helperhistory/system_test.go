package helperhistory

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSystemRequiresWholeFollowingHelperPair(t *testing.T) {
	system := json.RawMessage(`{"role":"system","content":"original catalogue"}`)
	assistant := json.RawMessage(`{"role":"assistant","content":[{"type":"tool_use","id":"helper","name":"ToolSearch","input":{}}]}`)
	user := json.RawMessage(`{"role":"user","content":[{"type":"tool_result","tool_use_id":"helper","content":"loaded"}]}`)
	check := func(messages []json.RawMessage) error {
		p := Payload{Version: Version, Segments: []Segment{{AfterMessage: 0, PublicAnchorDigest: strings.Repeat("a", 64), ToolCatalogDigest: strings.Repeat("b", 64), Messages: messages}}}
		raw, _ := json.Marshal(p)
		return Validate(raw)
	}
	if err := check([]json.RawMessage{system, assistant, user}); err != nil {
		t.Fatal(err)
	}
	for _, messages := range [][]json.RawMessage{{system}, {system, assistant}, {assistant, system, user}, {assistant, user, system}} {
		if check(messages) == nil {
			t.Fatal("unpaired or displaced system accepted")
		}
	}
}
