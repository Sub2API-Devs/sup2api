package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestReviewCompactionLongHistoryIsOpaqueAndPositionBound(t *testing.T) {
	messages := []any{Object{"role": "assistant", "content": []any{Object{"type": "compaction", "content": "immutable summary", "signature": "opaque-signature", "encrypted_content": "opaque-payload"}}}}
	for i := 0; i < 40; i++ {
		messages = append(messages, Object{"role": "user", "content": fmt.Sprintf("question-%d", i)}, Object{"role": "assistant", "content": fmt.Sprintf("answer-%d", i)})
	}
	messages = append(messages, Object{"role": "user", "content": "next"})
	body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": messages}
	raw, _ := json.Marshal(body)
	headers := http.Header{"Anthropic-Beta": []string{signedCompactionBeta}}
	req, err := parsePolicyRequest(raw, headers)
	if err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"exact", "changed-signature", "changed-summary", "prepended-system"} {
		wire, _ := decodeObject(raw)
		ms := wire["messages"].([]any)
		first := ms[0].(Object)["content"].([]any)[0].(Object)
		switch kind {
		case "changed-signature":
			first["signature"] = "different"
		case "changed-summary":
			first["content"] = "different"
		case "prepended-system":
			wire["messages"] = append([]any{Object{"role": "system", "content": "inner default"}}, ms...)
		}
		err = req.verifyCompactionHistory(wire)
		if (err == nil) != (kind == "exact") {
			t.Fatalf("kind=%s error=%v", kind, err)
		}
	}
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("signed history without beta accepted")
	}
	cache, err := newCache(t.TempDir(), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	prepared, err := prepareHistory(req, cache, testBranch("review-scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	answer := Object{"id": "msg_review_compaction", "role": "assistant", "stop_reason": "end_turn", "content": []Object{{"type": "text", "text": "continued"}}, "context_management": Object{"applied_edits": []any{}}}
	if err := prepared.commitResponseOnly(req, answer, cache, "review-scope", time.Now()); err != nil {
		t.Fatal(err)
	}
	cache, err = newCache(cache.dir, cache.limit)
	if err != nil {
		t.Fatal(err)
	}
	req.Messages = append(req.Messages, Message{Role: "assistant", Content: answer["content"].([]Object)}, Message{Role: "user", Content: []Object{{"type": "text", "text": "after restart"}}})
	next, err := prepareHistory(req, cache, testBranch("review-scope"), t.TempDir(), "2.1.292")
	if err != nil {
		t.Fatal(err)
	}
	if next.Mode != "rebuild" {
		t.Fatal("response-only incorrectly resumed native", next.Mode)
	}
	count := 0
	for _, record := range next.Rows {
		row, _ := decodeObject(record)
		m, _ := row["message"].(Object)
		blocks, _ := historyContent(m["content"])
		for _, block := range blocks {
			if str(block, "type") == "compaction" {
				count++
				if str(block, "signature") != "opaque-signature" {
					t.Fatal("history signature changed")
				}
			}
		}
	}
	if count != 1 {
		t.Fatalf("compaction replay count=%d", count)
	}
}

func TestReviewContinuationNeverMovesExtraSafetyAttachment(t *testing.T) {
	req := &Request{Messages: []Message{{Role: "assistant", Content: []Object{{"type": "text", "text": "prefill"}}}}}
	req.configureContinuation()
	body := Object{"messages": []any{Object{"role": "assistant", "content": "prefill"}, Object{"role": "user", "content": []any{Object{"type": "text", "text": "<system-reminder>inner safety instructions</system-reminder>"}, Object{"type": "text", "text": req.continuation}}}}}
	before := digest(body)
	if req.removeContinuation(body) == nil {
		t.Fatal("safety attachment silently moved or dropped")
	}
	if digest(body) != before {
		t.Fatal("failed continuation mutated source")
	}
}

func TestReviewThinkingSignatureIsNotCompactionSignature(t *testing.T) {
	r := &Request{Messages: []Message{
		{Role: "assistant", Content: []Object{{"type": "thinking", "thinking": "opaque reasoning", "signature": "thinking-signature"}, {"type": "text", "text": "answer"}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "next"}}},
		{Role: "assistant", Content: []Object{{"type": "compaction", "content": "threshold summary"}}},
		{Role: "user", Content: []Object{{"type": "text", "text": "continue"}}},
	}}
	var messages []any
	for _, m := range r.Messages {
		raw, _ := json.Marshal(Object{"role": m.Role, "content": m.Content})
		o, _ := decodeObject(raw)
		messages = append(messages, o)
	}
	if err := r.verifyCompactionHistory(Object{"messages": messages}); err != nil {
		t.Fatal("thinking signature incorrectly invokes signed-compaction positioning", err)
	}
}

func TestNativeCheckpointProbeSkipsIdleButRetriesPartialWrites(t *testing.T) {
	path := filepath.Join(t.TempDir(), "native.jsonl")
	probe := nativeCheckpointProbe{}
	if probe.changed(path) {
		t.Fatal("missing file considered ready")
	}
	if err := os.WriteFile(path, []byte(`{"type":"assistant"`), 0600); err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) || probe.changed(path) {
		t.Fatal("idle transcript reread")
	}
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		t.Fatal(err)
	}
	_, err = f.WriteString("}\n")
	f.Close()
	if err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) || probe.changed(path) {
		t.Fatal("completed partial write not retried")
	}
	stamp := time.Now().Add(time.Second)
	if err := os.Chtimes(path, stamp, stamp); err != nil {
		t.Fatal(err)
	}
	if !probe.changed(path) {
		t.Fatal("same-size write metadata change not retried")
	}
}
