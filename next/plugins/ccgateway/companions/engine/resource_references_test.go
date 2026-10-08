package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestAdmittedFileParserAndExactHistory(t *testing.T) {
	body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": []any{Object{"type": "text", "text": "before"}, Object{"type": "document", "source": Object{"type": "file", "file_id": "file_fixture"}}}}}}
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("unverified file accepted")
	}
	grant := &resourceAdmission{ids: map[string]bool{"file_fixture": true}}
	req, err := parsePolicyRequestWithResources(raw, http.Header{}, grant)
	if err != nil {
		t.Fatal(err)
	}
	if err := req.validateOutboundResources(raw); err != nil {
		t.Fatal(err)
	}
	for _, change := range []string{"drop", "move", "unapproved", "duplicate"} {
		wire, _ := decodeObject(raw)
		ms := wire["messages"].([]any)
		m := ms[0].(Object)
		content := m["content"].([]any)
		switch change {
		case "drop":
			m["content"] = content[:1]
		case "move":
			m["content"] = []any{content[1], content[0]}
		case "unapproved":
			content[1].(Object)["source"].(Object)["file_id"] = "file_other"
		case "duplicate":
			m["content"] = append(content, content[1])
		}
		modified, _ := json.Marshal(wire)
		if req.validateOutboundResources(modified) == nil {
			t.Fatal("resource history mutation accepted", change)
		}
	}
	other, _ := decodeObject(raw)
	other["messages"].([]any)[0].(Object)["content"].([]any)[1].(Object)["source"].(Object)["file_id"] = "file_other"
	otherRaw, _ := json.Marshal(other)
	otherReq, err := parsePolicyRequestWithResources(otherRaw, http.Header{}, &resourceAdmission{ids: map[string]bool{"file_other": true}})
	if err != nil {
		t.Fatal(err)
	}
	if digest(fingerprints(req.Messages)) == digest(fingerprints(otherReq.Messages)) {
		t.Fatal("file identity missing from history fingerprint")
	}
}
