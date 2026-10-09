package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
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
	p, err := prepareHistory(r, c, testBranch("fixture"), t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
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

// A first turn has no client history; systems after it are the pending turn's.
// A session's first turn resumes a private copy holding only a local meta
// root (never --session-id, which the CLI refuses while another request of the
// same session writes it); a new session (no session ID) starts fresh.
func TestSystemOnlyFirstTurnStartsFresh(t *testing.T) {
	r := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "s"}}})
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	p, err := prepareHistory(r, c, testBranch("fixture"), t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	if p.Mode != "rebuild" || len(p.Rows) != 1 || filepath.Base(p.Path) != p.SessionID+".jsonl" || p.Anchor != "" {
		t.Fatalf("first turn prepared as %s with %d rows at %q", p.Mode, len(p.Rows), p.Path)
	}
	written, err := readNativeFile(p.Path)
	if err != nil || len(written) != 1 {
		t.Fatal("first turn private copy must hold only its root", err, len(written))
	}
	root := historyRows(t, written)[0]
	if str(root, "type") != "system" || root["isMeta"] != true || str(root, "sessionId") != p.SessionID || strings.Contains(string(written[0]), "\"s\"") {
		t.Fatalf("unexpected root record %s", written[0])
	}
	fresh, err := prepareHistory(r, c, sessionBranch{}, t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	if fresh.Path != "" || fresh.Mode != "rebuild" || len(fresh.Rows) != 1 || fresh.SessionID == p.SessionID {
		t.Fatalf("new session prepared as %s at %q", fresh.Mode, fresh.Path)
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
	// commit stands in for the CLI: records after the resumed node, then the
	// answer, each the child of the previous.
	commit := func(r *Request, p *Prepared, answer string, extra ...json.RawMessage) string {
		t.Helper()
		native := append(append([]json.RawMessage(nil), p.Rows...), extra...)
		parent := p.LastUUID
		if len(extra) > 0 {
			parent, _, _ = rowIdentity(extra[len(extra)-1])
		}
		final, _ := json.Marshal(Object{"type": "assistant", "uuid": uuid(), "parentUuid": parent, "sessionId": p.SessionID, "message": Object{"id": "msg_" + answer, "role": "assistant", "content": []any{Object{"type": "text", "text": answer}}}})
		native = append(native, final)
		p.NativeRows = native
		p.NativeAll = native
		p.NativeAnchor = str(historyRows(t, native[len(native)-1:])[0], "uuid")
		p.NativePath = c.dir + "/native-" + p.SessionID + ".jsonl"
		if err := writeNative(p.NativePath, native); err != nil {
			t.Fatal(err)
		}
		if err := p.commit(r, Object{"id": "msg_" + answer, "role": "assistant", "stop_reason": "end_turn", "content": []Object{{"type": "text", "text": answer}}}, c, "fixture", "", "2.1.288", time.Now()); err != nil {
			t.Fatal(err)
		}
		return p.NativeAnchor
	}
	turn := func(messages ...any) (*Request, *Prepared) {
		t.Helper()
		r := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": messages})
		p, err := prepareHistory(r, c, testBranch("fixture"), t.TempDir(), "2.1.288")
		if err != nil {
			t.Fatal(err)
		}
		return r, p
	}
	u1, s1 := Object{"role": "user", "content": "one"}, Object{"role": "system", "content": "sys one"}
	r, p := turn(u1, s1)
	pendingRecord, _ := systemRow([]string{"sys one"}, p.LastUUID, p.SessionID, "", "2.1.288")
	anchorA1 := commit(r, p, "A1", pendingRecord)
	a1 := Object{"role": "assistant", "content": "A1"}
	r, p = turn(u1, s1, a1, Object{"role": "user", "content": "two"})
	if p.Mode != "prefix-hit" || p.Anchor != anchorA1 {
		t.Fatalf("second turn mode %s", p.Mode)
	}
	commit(r, p, "A2")
	// Same prefix with a different system text is a different history.
	_, other := turn(u1, Object{"role": "system", "content": "sys other"}, a1, Object{"role": "user", "content": "two"})
	if other.Mode != "rebuild" {
		t.Fatalf("changed system reused history: %s", other.Mode)
	}
	// Branch after A1: the A2 branch's state stays behind. The private copy
	// holds only the resumed conversation; the CLI loads one per file.
	r, p = turn(u1, s1, a1, Object{"role": "user", "content": "branch"}, Object{"role": "system", "content": "branch sys"})
	if p.Mode != "fork" || p.Anchor != anchorA1 {
		t.Fatalf("branch mode %s", p.Mode)
	}
	chain := string(nativeBytes(p.Rows))
	if strings.Contains(chain, "A2") || strings.Contains(chain, "branch sys") || !strings.Contains(chain, "sys one") {
		t.Fatalf("branch history = %s", chain)
	}
	written, _ := os.ReadFile(p.Path)
	if strings.Contains(string(written), "A2") || strings.Contains(string(written), "branch sys") || !strings.Contains(string(written), "sys one") {
		t.Fatalf("private copy = %s", written)
	}
	if canonical, _ := os.ReadFile(c.canonicalPath(p.SessionID)); !strings.Contains(string(canonical), "A2") {
		t.Fatal("canonical file lost the other branch")
	}
}
