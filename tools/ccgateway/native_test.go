package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestNativeParallelHandoffCleanup(t *testing.T) {
	raw := []string{
		`{"type":"user","uuid":"old","parentUuid":null,"message":{"role":"user","content":"original context"}}`,
		`{"type":"assistant","uuid":"a","parentUuid":"old","message":{"id":"reply","content":[{"type":"tool_use","id":"one"}]}}`,
		`{"type":"user","uuid":"denied","parentUuid":"a","message":{"content":[{"type":"tool_result","tool_use_id":"one","content":"internal denial"}]}}`,
		`{"type":"assistant","uuid":"b","parentUuid":"denied","message":{"id":"reply","content":[{"type":"tool_use","id":"two"}]}}`,
	}
	rows := make([]json.RawMessage, len(raw))
	for i, s := range raw {
		rows[i] = json.RawMessage(s)
	}
	cleaned := cleanToolHandoffs(rows, "reply")
	if len(cleaned) != 3 || string(cleaned[0]) != raw[0] || string(cleaned[1]) != raw[1] {
		t.Fatal("native prefix changed")
	}
	var last Object
	_ = json.Unmarshal(cleaned[2], &last)
	if str(last, "parentUuid") != "a" || str(last, "uuid") != "b" {
		t.Fatal("parallel assistant chain not reconnected")
	}
	untouched := cleanToolHandoffs(rows, "another-response")
	if len(untouched) != 4 {
		t.Fatal("changed a previous turn's tool results")
	}
}

func TestNativeOrphanRetention(t *testing.T) {
	c, err := newCache(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	root := filepath.Join(c.dir, "native")
	if err = os.MkdirAll(root, 0700); err != nil {
		t.Fatal(err)
	}
	old, active, fresh := uuid(), uuid(), uuid()
	for _, id := range []string{old, active, fresh} {
		p := filepath.Join(root, id+".jsonl")
		if err = os.WriteFile(p, []byte("{}\n"), 0600); err != nil {
			t.Fatal(err)
		}
		if id != fresh {
			past := time.Now().Add(-2 * time.Hour)
			if err = os.Chtimes(p, past, past); err != nil {
				t.Fatal(err)
			}
		}
	}
	c.active[active] = true
	c.prune()
	if _, err = os.Stat(filepath.Join(root, old+".jsonl")); !os.IsNotExist(err) {
		t.Fatal("orphan retained")
	}
	for _, id := range []string{active, fresh} {
		if _, err = os.Stat(filepath.Join(root, id+".jsonl")); err != nil {
			t.Fatal("active or in-flight native file removed")
		}
	}
}

func TestNativeHandoffPreservesMixedContent(t *testing.T) {
	rows := []json.RawMessage{
		json.RawMessage(`{"type":"assistant","uuid":"a","message":{"id":"reply","content":[{"type":"tool_use","id":"one"}]}}`),
		json.RawMessage(`{"type":"user","uuid":"mixed","parentUuid":"a","message":{"content":[{"type":"text","text":"keep context"},{"type":"tool_result","tool_use_id":"one","content":"internal denial"},{"type":"tool_result","tool_use_id":"earlier","content":"real result"}]}}`),
		json.RawMessage(`{"type":"assistant","uuid":"b","parentUuid":"mixed","message":{"id":"reply","content":[{"type":"tool_use","id":"two"}]}}`),
	}
	cleaned := cleanToolHandoffs(rows, "reply")
	if len(cleaned) != 3 || string(cleaned[0]) != string(rows[0]) || string(cleaned[2]) != string(rows[2]) {
		t.Fatal("unrelated rows or parent links changed")
	}
	var row Object
	if err := json.Unmarshal(cleaned[1], &row); err != nil {
		t.Fatal(err)
	}
	msg := row["message"].(map[string]any)
	blocks := msg["content"].([]any)
	if len(blocks) != 2 || str(blocks[0].(map[string]any), "text") != "keep context" || str(blocks[1].(map[string]any), "tool_use_id") != "earlier" {
		t.Fatalf("unrelated content lost: %s", cleaned[1])
	}
}
