package main

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
	"time"
)

func historyRows(t *testing.T, rows []json.RawMessage) []Object {
	t.Helper()
	out := make([]Object, len(rows))
	for i, raw := range rows {
		if err := json.Unmarshal(raw, &out[i]); err != nil {
			t.Fatal(err)
		}
	}
	return out
}

// Committed systems become native records at their position; the pending
// turn's systems go to the Mod and never into the seeded history.
func TestSystemHistoryRecordsAndPendingToolInput(t *testing.T) {
	r := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{
		Object{"role": "user", "content": "first"},
		Object{"role": "system", "content": "earlier instruction"},
		Object{"role": "system", "content": []any{Object{"type": "text", "text": "second block a"}, Object{"type": "text", "text": "second block b"}}},
		Object{"role": "assistant", "content": []any{Object{"type": "thinking", "thinking": "", "signature": "fixture"}, Object{"type": "tool_use", "id": "toolu_fixture", "name": "Bash", "input": Object{"command": "fixture"}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_fixture", "content": "external result", "is_error": false}}},
		Object{"role": "system", "content": "later instruction"},
	}})
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	p, err := prepareHistory(r, c, "fixture", t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	defer p.release()
	rows := historyRows(t, p.Rows)
	kinds := []string{}
	for _, row := range rows {
		kinds = append(kinds, str(row, "type"))
	}
	if strings.Join(kinds, "/") != "user/attachment/attachment/assistant/user" {
		t.Fatalf("rows = %v", kinds)
	}
	for i := 1; i < len(rows); i++ {
		if str(rows[i], "parentUuid") != str(rows[i-1], "uuid") {
			t.Fatal("history chain broken")
		}
	}
	// One record per client system message, keeping its text blocks.
	first, _ := json.Marshal(rows[1]["attachment"].(Object)["content"])
	second, _ := json.Marshal(rows[2]["attachment"].(Object)["content"])
	if string(first) != `["earlier instruction"]` || string(second) != `["second block a","second block b"]` {
		t.Fatalf("history system records = %s %s", first, second)
	}
	rendered := rows[2]["rendered"].([]any)
	if len(rendered) != 1 || str(rendered[0].(Object), "content") != "<system-reminder>\n"+systemContextPrefix+"second block a\nsecond block b\n</system-reminder>" {
		t.Fatalf("record rendering differs from the Mod's: %v", rendered)
	}
	last := rows[len(rows)-1]
	if str(last, "uuid") != p.InputUUID || str(last, "parentUuid") != p.Anchor || p.Anchor != str(rows[3], "uuid") {
		t.Fatal("pending input identity differs from resume boundary")
	}
	pendingRaw, _ := json.Marshal(r.pendingWireMessage())
	pendingObject, _ := decodeObject(pendingRaw)
	if digest(last["message"]) != digest(pendingObject) {
		t.Fatal("seeded pending input differs from submitted input")
	}
	written, err := os.ReadFile(p.Path)
	if err != nil || strings.Contains(string(written), "later instruction") {
		t.Fatal("pending system written into the resumed history")
	}
	if strings.Join(r.pendingSystems(), "|") != "later instruction" {
		t.Fatal("pending system lost")
	}
}

// A first turn has no history file; systems after it are the pending turn's.
func TestSystemOnlyFirstTurnStartsFresh(t *testing.T) {
	r := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "s"}}})
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	p, err := prepareHistory(r, c, "fixture", t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	defer p.release()
	if p.Path != "" || p.Mode != "rebuild" || len(p.Rows) != 1 {
		t.Fatalf("first turn prepared as %s with %d rows", p.Mode, len(p.Rows))
	}
}

// Client system messages are part of the cached prefix: the next turn resumes
// the native session, and a branch after an earlier assistant forks without the
// abandoned branch's systems.
func TestSystemHistoryResumesAndBranches(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	commit := func(r *Request, p *Prepared, answer string, extra ...json.RawMessage) {
		t.Helper()
		native := append(append([]json.RawMessage(nil), p.Rows...), extra...)
		final, _ := json.Marshal(Object{"type": "assistant", "uuid": uuid(), "parentUuid": "x", "message": Object{"id": "msg_" + answer, "role": "assistant", "content": []any{Object{"type": "text", "text": answer}}}})
		native = append(native, final)
		p.NativeRows = native
		p.NativeAnchor = str(historyRows(t, native[len(native)-1:])[0], "uuid")
		p.NativePath = c.dir + "/native-" + p.SessionID + ".jsonl"
		if err := writeNative(p.NativePath, native); err != nil {
			t.Fatal(err)
		}
		if err := p.commit(r, Object{"content": []Object{{"type": "text", "text": answer}}}, c, "fixture", "", "2.1.288", time.Now()); err != nil {
			t.Fatal(err)
		}
		p.release()
	}
	turn := func(messages ...any) (*Request, *Prepared) {
		t.Helper()
		r := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": messages})
		p, err := prepareHistory(r, c, "fixture", t.TempDir(), "2.1.288")
		if err != nil {
			t.Fatal(err)
		}
		return r, p
	}
	u1, s1 := Object{"role": "user", "content": "one"}, Object{"role": "system", "content": "sys one"}
	r, p := turn(u1, s1)
	pendingRecord, _ := systemRow([]string{"sys one"}, "", p.SessionID, "", "2.1.288")
	commit(r, p, "A1", pendingRecord)
	a1 := Object{"role": "assistant", "content": "A1"}
	r, p = turn(u1, s1, a1, Object{"role": "user", "content": "two"})
	if p.Mode != "prefix-hit" || p.Anchor != "" {
		t.Fatalf("second turn mode %s", p.Mode)
	}
	commit(r, p, "A2")
	// Same prefix with a different system text is a different history.
	_, other := turn(u1, Object{"role": "system", "content": "sys other"}, a1, Object{"role": "user", "content": "two"})
	if other.Mode != "rebuild" {
		t.Fatalf("changed system reused history: %s", other.Mode)
	}
	other.release()
	// Branch after A1: the A2 branch's state stays behind.
	r, p = turn(u1, s1, a1, Object{"role": "user", "content": "branch"}, Object{"role": "system", "content": "branch sys"})
	defer p.release()
	if p.Mode != "fork" || !p.Fork {
		t.Fatalf("branch mode %s", p.Mode)
	}
	written, _ := os.ReadFile(p.Path)
	if strings.Contains(string(written), "A2") || strings.Contains(string(written), "branch sys") || !strings.Contains(string(written), "sys one") {
		t.Fatalf("branch history = %s", written)
	}
}
