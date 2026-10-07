package engine

import (
	"encoding/json"
	"testing"
	"time"
)

func promptRow(system any, withTools bool) json.RawMessage {
	a := Object{"type": "prompt_snapshot", "systemPrompt": system}
	if withTools {
		a["tools"] = []any{}
	}
	b, _ := json.Marshal(Object{"type": "attachment", "attachment": a})
	return b
}

func TestPromptSnapshotDecision(t *testing.T) {
	now := time.Now()
	a, b := []string{"A", "second block"}, []string{"B", "second block"}
	fresh := &PromptEvidence{SystemDigest: digest(a), Expires: now.Add(5 * time.Minute)}
	expired := &PromptEvidence{SystemDigest: digest(a), Expires: now}
	for _, tt := range []struct {
		name     string
		rows     []json.RawMessage
		evidence *PromptEvidence
		system   []string
		want     bool
	}{
		{"first_request", nil, nil, a, false},
		{"missing_snapshot_recent_request", nil, fresh, a, true},
		{"missing_snapshot_changed_request", nil, fresh, b, false},
		{"missing_snapshot_expired_request", nil, expired, a, false},
		{"file_authoritative_after_ttl", []json.RawMessage{promptRow(a, false)}, expired, a, true},
		{"changed_file_not_overridden_by_recent_request", []json.RawMessage{promptRow(b, false)}, fresh, a, false},
		{"multiple_matching_snapshots", []json.RawMessage{promptRow(a, false), promptRow(a, false)}, nil, a, true},
		{"conflicting_snapshots", []json.RawMessage{promptRow(a, false), promptRow(b, false)}, fresh, a, false},
		{"tool_schema_snapshot", []json.RawMessage{promptRow(a, true)}, fresh, a, false},
		{"malformed_system", []json.RawMessage{promptRow("A", false)}, fresh, a, false},
		{"null_system", []json.RawMessage{promptRow(nil, false)}, fresh, a, false},
		{"empty_string", []json.RawMessage{promptRow([]string{""}, false)}, nil, []string{""}, true},
		{"empty_array_distinct", []json.RawMessage{promptRow([]string{}, false)}, nil, []string{""}, false},
		{"block_boundaries", []json.RawMessage{promptRow([]string{"A\nsecond block"}, false)}, nil, a, false},
		{"invalid_json", []json.RawMessage{json.RawMessage(`{`)}, fresh, a, false},
		{"built_in_message_not_compared", []json.RawMessage{json.RawMessage(`{"type":"user","message":{"content":"CLI injected environment"}}`), promptRow(a, false)}, nil, a, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			if got := choosePromptSnapshot(tt.rows, tt.evidence, tt.system, now); got != tt.want {
				t.Fatalf("snapshot enabled=%v, want %v", got, tt.want)
			}
		})
	}
}

func TestPromptEvidenceTTLAndCheckpointIsolation(t *testing.T) {
	for _, ttl := range []string{"5m", "1h"} {
		t.Run(ttl, func(t *testing.T) {
			body := basic()
			body["system"] = "SYSTEM_A"
			body["cache_control"] = Object{"type": "ephemeral", "ttl": ttl}
			r := parsed(t, body)
			cache, err := newCache(t.TempDir(), 8<<20)
			if err != nil {
				t.Fatal(err)
			}
			p, err := prepareHistory(r, cache, "scope", t.TempDir(), "2.1.288")
			if err != nil {
				t.Fatal(err)
			}
			if p.SnapshotEnabled {
				t.Fatal("first request reused unknown snapshot")
			}
			answer := []Object{{"type": "text", "text": "answer"}}
			row, anchor := transcriptRow(Message{Role: "assistant", Content: answer}, p.LastUUID, p.SessionID, p.Work, "2.1.288", r.Model)
			p.NativeRows, p.NativeAnchor = append(p.Rows, row), anchor
			start := time.Now()
			if err := p.commit(r, Object{"id": "msg_prompt_snapshot", "role": "assistant", "stop_reason": "end_turn", "content": answer}, cache, "scope", "", "2.1.288", start); err != nil {
				t.Fatal(err)
			}
			hash := digest([]any{p.Hashes[len(p.Hashes)-1], Message{Role: "assistant", Content: answer}})
			key := cacheKey("scope", "", hash)
			saved := cache.get(key)
			duration, _ := time.ParseDuration(ttl)
			if saved.PromptEvidence == nil || saved.PromptEvidence.Expires.Before(start.Add(duration)) || saved.PromptEvidence.Expires.After(time.Now().Add(duration)) {
				t.Fatal("prompt evidence did not use request TTL")
			}
			if saved.Expires.Sub(start) != 24*time.Hour {
				t.Fatal("prompt TTL shortened native history")
			}
			// Persistence is per committed checkpoint, so restart and a separate
			// branch cannot borrow the most recent request's system prompt.
			cache, err = newCache(cache.dir, 8<<20)
			if err != nil {
				t.Fatal(err)
			}
			r.Messages = append(r.Messages, Message{Role: "assistant", Content: answer}, Message{Role: "user", Content: []Object{{"type": "text", "text": "continue"}}})
			continued, err := prepareHistory(r, cache, "scope", t.TempDir(), "2.1.288")
			if err != nil {
				t.Fatal(err)
			}
			defer continued.release()
			if !continued.SnapshotEnabled {
				t.Fatal("fresh checkpoint evidence lost after restart")
			}
			r.System = []string{"SYSTEM_B"}
			branch, err := prepareHistory(r, cache, "scope", t.TempDir(), "2.1.288")
			if err != nil {
				t.Fatal(err)
			}
			defer branch.release()
			if branch.SnapshotEnabled {
				t.Fatal("changed system borrowed another branch's evidence")
			}
			r.System = []string{"SYSTEM_A"}
			expired := cache.get(key)
			expired.PromptEvidence = &PromptEvidence{SystemDigest: digest(r.System), Expires: time.Now().Add(-time.Second)}
			if err := cache.put(key, expired); err != nil {
				t.Fatal(err)
			}
			after, err := prepareHistory(r, cache, "scope", t.TempDir(), "2.1.288")
			if err != nil {
				t.Fatal(err)
			}
			defer after.release()
			if after.SnapshotEnabled || after.Mode == "rebuild" {
				t.Fatal("expired prompt evidence must disable snapshot without losing history")
			}
		})
	}
}
