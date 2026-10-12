package engine

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSystemMessageParsingAndPendingTurn(t *testing.T) {
	v := basic()
	v["messages"] = []any{
		Object{"role": "user", "content": "first"},
		Object{"role": "system", "content": "middle"},
		Object{"role": "assistant", "content": "answer"},
		Object{"role": "user", "content": "second"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "late one", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"type": "text", "text": "late two"}}},
		Object{"role": "system", "content": "late three"},
	}
	r := parsed(t, v)
	if len(r.Messages) != 6 || r.Messages[1].Role != "system" || r.pendingStart() != 3 {
		t.Fatalf("system positions lost: %#v", r.Messages)
	}
	if pending := r.pendingWireMessage(); pending.Role != "user" || len(pending.Content) != 1 || str(pending.Content[0], "text") != "second" {
		t.Fatalf("pending input changed: %#v", pending)
	}
	if got := strings.Join(r.pendingSystems(), "|"); got != "late one|late two|late three" {
		t.Fatalf("pending systems = %q", got)
	}
	if r.Messages[4].Content[0]["cache_control"] == nil {
		t.Fatal("request cache directive lost")
	}
	withCache := fingerprints(r.Messages)
	noCache := append([]Message(nil), r.Messages...)
	for i := range noCache {
		noCache[i].Content = withoutProtocolCache(noCache[i].Content)
	}
	if digest(withCache) != digest(fingerprints(noCache)) {
		t.Fatal("cache_control polluted the history fingerprint")
	}
	for _, invalid := range []Object{
		{"role": "system", "content": []any{Object{"type": "image"}}},
		{"role": "system", "content": []any{Object{"type": "text", "text": 42}}},
		{"role": "system", "content": []any{Object{"type": "text", "text": ""}}},
		{"role": "system", "content": []any{}},
		{"role": "system", "content": ""},
		{"role": "system", "content": "x", "output_config": Object{"effort": "invalid"}},
		{"role": "system", "content": "x", "clear_at": "invalid"},
	} {
		v["messages"] = []any{Object{"role": "user", "content": "q"}, invalid}
		b, _ := json.Marshal(v)
		if _, err := parseRequest(b); err == nil {
			t.Fatalf("accepted invalid system: %#v", invalid)
		}
	}
}

// Claude Code shortens long mod context; such input must be refused, not cut.
func TestPendingSystemLengthLimits(t *testing.T) {
	v := basic()
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("a", pendingSystemBlockLimit)}}
	parsed(t, v)
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("a", pendingSystemBlockLimit+1)}}
	b, _ := json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("accepted an oversized pending system block")
	}
	// Characters outside the BMP count twice, as Claude Code counts them.
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": strings.Repeat("😀", pendingSystemBlockLimit/2+1)}}
	b, _ = json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("counted UTF-16 length incorrectly")
	}
	half := strings.Repeat("b", pendingSystemBlockLimit)
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": half}, Object{"role": "system", "content": half}, Object{"role": "system", "content": "c"}}
	b, _ = json.Marshal(v)
	if _, err := parseRequest(b); err == nil {
		t.Fatal("accepted oversized pending system total")
	}
	// Committed history is written as a record and is not shortened.
	v["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": half}, Object{"role": "system", "content": half}, Object{"role": "system", "content": "c"}, Object{"role": "assistant", "content": "a"}, Object{"role": "user", "content": "next"}}
	parsed(t, v)
}

func TestSystemRowMatchesModRecord(t *testing.T) {
	raw, id := systemRow([]string{"one", "two"}, "parent-uuid", "session", "/work", "2.1.288")
	var row Object
	if err := json.Unmarshal(raw, &row); err != nil {
		t.Fatal(err)
	}
	attachment := row["attachment"].(Object)
	rendered := row["rendered"].([]any)[0].(Object)
	if str(row, "uuid") != id || str(row, "parentUuid") != "parent-uuid" || str(row, "type") != "attachment" || str(row, "renderedRole") != "system" ||
		str(attachment, "type") != "hook_additional_context" || str(attachment, "hookName") != "prompt.submit" || str(attachment, "hookEvent") != "UserPromptSubmit" ||
		str(rendered, "content") != "<system-reminder>\nprompt.submit hook additional context: one\ntwo\n</system-reminder>" {
		t.Fatalf("record shape: %s", raw)
	}
	before := []json.RawMessage{raw}
	if nativeSystemRecorded(before, before, []string{"one", "two"}) {
		t.Fatal("history record counted as the pending turn's")
	}
	other, _ := systemRow([]string{"one", "two"}, id, "session", "/work", "2.1.288")
	if !nativeSystemRecorded(before, append(before, other), []string{"one", "two"}) || nativeSystemRecorded(before, append(before, other), []string{"one"}) {
		t.Fatal("pending record not matched exactly")
	}
}
