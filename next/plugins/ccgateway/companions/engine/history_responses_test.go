package engine

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func responseHistoryAnswer(id, text string) Object {
	return Object{"id": id, "type": "message", "role": "assistant", "model": "fixture", "content": []Object{{"type": "text", "text": text}}, "stop_reason": "end_turn", "usage": Object{"input_tokens": 1, "output_tokens": 2}, "safeguard_results": []any{Object{"fixture": "envelope_only"}}, "input_transformations": []any{Object{"type": "fixture", "large": json.Number("9007199254740993")}}}
}

func commitResponseFixture(t *testing.T, c *HistoryCache, scope string, r *Request, answer Object) *Prepared {
	t.Helper()
	p, err := prepareHistory(r, c, scope, t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	content := answer["content"].([]Object)
	row, anchor := transcriptRow(Message{Role: "assistant", Content: content}, p.LastUUID, p.SessionID, p.Work, "2.1.292", r.Model)
	p.NativeRows = append(append([]json.RawMessage(nil), p.Rows...), row)
	p.NativeAnchor = anchor
	if p.NativePath == "" {
		p.NativePath = filepath.Join(c.dir, "native", p.SessionID+".jsonl")
	}
	if err = os.MkdirAll(filepath.Dir(p.NativePath), 0700); err != nil {
		t.Fatal(err)
	}
	if err = writeNative(p.NativePath, p.NativeRows); err != nil {
		t.Fatal(err)
	}
	if err = p.commit(r, answer, c, scope, "", "2.1.292", time.Now()); err != nil {
		t.Fatal(err)
	}
	p.release()
	return p
}

func responseHistoryRequest(t *testing.T) *Request {
	return parsed(t, Object{"model": "fixture", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "first"}}})
}

func TestResponseHistorySurvivesRestartBranchAndScopeIsolation(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	r := responseHistoryRequest(t)
	first := responseHistoryAnswer("msg_first", "first-answer")
	commitResponseFixture(t, c, "scope-a", r, first)
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: first["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "second"}}})
	second := responseHistoryAnswer("msg_second", "second-answer")
	p := commitResponseFixture(t, c, "scope-a", r, second)
	if len(p.Responses) != 1 || p.Responses[0].MessageID != "msg_first" {
		t.Fatal("resume lost first envelope")
	}
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: second["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "third"}}})
	c, err = newCache(c.dir, 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	resumed, err := prepareHistory(r, c, "scope-a", t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	if resumed.Mode != "prefix-hit" || len(resumed.Responses) != 2 {
		t.Fatal("restart lost response chain", resumed.Mode, len(resumed.Responses))
	}
	if !bytes.Contains(resumed.Responses[0].Response, []byte("9007199254740993")) {
		t.Fatal("extension integer changed")
	}
	if bytes.Contains(nativeBytes(resumed.Rows), []byte("envelope_only")) {
		t.Fatal("envelope injected into replayable JSONL")
	}
	resumed.Responses[0].Response[0] = 'x'
	resumed.release()
	branch := responseHistoryRequest(t)
	branch.Messages = append(branch.Messages, Message{Role: "assistant", Content: first["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "alternate"}}})
	fork, err := prepareHistory(branch, c, "scope-a", t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	defer fork.release()
	if fork.Mode != "fork" || len(fork.Responses) != 1 || fork.Responses[0].MessageID != "msg_first" || !json.Valid(fork.Responses[0].Response) {
		t.Fatal("branch has future envelope or alias mutation")
	}
	other, err := prepareHistory(r, c, "scope-b", t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	defer other.release()
	if len(other.Responses) != 0 || other.Mode != "rebuild" {
		t.Fatal("response chain crossed request scope")
	}
}

func TestResponseHistoryRejectsIncompleteAndRefusedCommit(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	r := responseHistoryRequest(t)
	p, err := prepareHistory(r, c, "scope", t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	p.NativeRows = []json.RawMessage{json.RawMessage(`{}`)}
	p.NativeAnchor = "anchor"
	for _, reason := range []string{"", "refusal"} {
		answer := responseHistoryAnswer("msg_invalid", "answer")
		answer["stop_reason"] = reason
		if err = p.commit(r, answer, c, "scope", "", "2.1.292", time.Now()); err == nil {
			t.Fatal("uncommitted result stored", reason)
		}
	}
	if len(c.entries) != 0 {
		t.Fatal("invalid commit changed cache")
	}
}

func TestResponseHistoryOldSnapshotAndCapacityAccounting(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	r := responseHistoryRequest(t)
	answer := responseHistoryAnswer("msg_legacy", "answer")
	commitResponseFixture(t, c, "scope", r, answer)
	var key string
	for k := range c.entries {
		key = k
	}
	s := c.get(key)
	with := snapshotSize(s)
	s.Responses = nil
	without := snapshotSize(s)
	if with <= without {
		t.Fatal("response bytes escaped cache quota")
	}
	if err = c.put(key, s); err != nil {
		t.Fatal(err)
	}
	c, err = newCache(c.dir, 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	if saved := c.get(key); saved == nil || len(saved.Responses) != 0 {
		t.Fatal("legacy snapshot rejected")
	}
	// An invalid relationship is not silently attached to another prefix.
	s = c.get(key)
	raw, _ := json.Marshal(answer)
	s.Responses = []ResponseCheckpoint{{ClientHash: "wrong-prefix", NativeAnchor: "anchor", MessageID: "msg_legacy", Response: raw}}
	if err = c.put(key, s); err != nil {
		t.Fatal(err)
	}
	c, err = newCache(c.dir, 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	if c.get(key) != nil {
		t.Fatal("misassociated response chain loaded")
	}
}
