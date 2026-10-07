package engine

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// A killed CLI may have already appended an uncommitted user/assistant tail.
// Restarting the gateway must branch from the persisted committed checkpoint,
// never interpret that tail as successful client history or overwrite it.
func TestNativeInterruptedResumeUsesCommittedCheckpoint(t *testing.T) {
	c, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	r := parsed(t, basic())
	p, err := prepareHistory(r, c, "logical", t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	content := []Object{{"type": "text", "text": "committed answer"}}
	row, anchor := transcriptRow(Message{"assistant", content}, p.LastUUID, p.SessionID, p.Work, "2.1.288", r.Model)
	p.NativeRows = append(p.Rows, row)
	p.NativeAnchor = anchor
	p.NativePath = filepath.Join(c.dir, "native", p.SessionID+".jsonl")
	if err = os.MkdirAll(filepath.Dir(p.NativePath), 0700); err != nil {
		t.Fatal(err)
	}
	if err = writeNative(p.NativePath, p.NativeRows); err != nil {
		t.Fatal(err)
	}
	if err = p.commit(r, Object{"content": content}, c, "logical", "", "2.1.288", time.Now()); err != nil {
		t.Fatal(err)
	}
	r.Messages = append(r.Messages, Message{"assistant", content}, Message{"user", []Object{{"type": "text", "text": "continue"}}})
	resumed, err := prepareHistory(r, c, "logical", t.TempDir(), "2.1.288")
	if err != nil || resumed.Mode != "prefix-hit" {
		t.Fatalf("initial resume: %v, %v", resumed, err)
	}
	failedBytes := append(nativeBytes(p.NativeRows), []byte("{\"type\":\"user\",\"uuid\":\"uncommitted\"}\n")...)
	if err = os.WriteFile(p.NativePath, failedBytes, 0600); err != nil {
		t.Fatal(err)
	}
	resumed.release()
	c, err = newCache(c.dir, 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	fork, err := prepareHistory(r, c, "logical", t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	defer fork.release()
	if fork.Mode != "fork" || fork.SessionID == p.SessionID || fork.Anchor != anchor {
		t.Fatalf("failed transcript reused: %+v", fork)
	}
	for i, row := range p.NativeRows {
		if !bytes.Equal(fork.Rows[i], row) {
			t.Fatal("committed native prefix modified")
		}
	}
	if bytes.Contains(nativeBytes(fork.Rows), []byte("uncommitted")) {
		t.Fatal("uncommitted tail imported")
	}
	actual, err := os.ReadFile(p.NativePath)
	if err != nil || !bytes.Equal(actual, failedBytes) {
		t.Fatal("fork overwrote another native branch")
	}
}

func TestNativeExpiredActiveCheckpointSurvivesUntilRelease(t *testing.T) {
	c, err := newCache(t.TempDir(), 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	sid := uuid()
	path := filepath.Join(c.dir, "native", sid+".jsonl")
	if err = os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		t.Fatal(err)
	}
	if err = writeNative(path, []json.RawMessage{json.RawMessage(`{}`)}); err != nil {
		t.Fatal(err)
	}
	past := time.Now().Add(-2 * time.Hour)
	if err = os.Chtimes(path, past, past); err != nil {
		t.Fatal(err)
	}
	c.active[sid] = true
	s := &Snapshot{SessionID: sid, NativePath: path, Expires: past}
	c.entries["expired"] = s
	c.bytes = snapshotSize(s)
	c.prune()
	if _, err = os.Stat(path); err != nil {
		t.Fatal("active transcript removed when its checkpoint expired")
	}
	(&Prepared{SessionID: sid, cache: c}).release()
	c.prune()
	if _, err = os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("released orphan transcript not removed")
	}
}
