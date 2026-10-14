package engine

import (
	"encoding/json"
	"reflect"
	"testing"
)

func contextTestRow(id, parent, kind, message string, content []Object, extra Object) json.RawMessage {
	row := Object{"uuid": id, "parentUuid": parent, "sessionId": "session", "type": kind}
	if kind == "user" || kind == "assistant" {
		row["message"] = Object{"role": kind, "content": content}
		if message != "" {
			row["message"].(Object)["id"] = message
		}
	}
	for k, v := range extra {
		row[k] = v
	}
	b, _ := json.Marshal(row)
	return b
}

func contextTestText(id, parent, kind, message string) json.RawMessage {
	return contextTestRow(id, parent, kind, message, []Object{{"type": "text", "text": id}}, nil)
}

func contextTestTool(id, parent, message, tool string) json.RawMessage {
	return contextTestRow(id, parent, "assistant", message, []Object{{"type": "tool_use", "id": tool, "name": "example", "input": Object{}}}, nil)
}

func contextTestResult(id, parent, tool string, extra Object) json.RawMessage {
	return contextTestRow(id, parent, "user", "", []Object{{"type": "tool_result", "tool_use_id": tool, "content": id}}, extra)
}

func assertNativeContext(t *testing.T, rows []json.RawMessage, leaf string, want []string) {
	t.Helper()
	for name, got := range map[string][]json.RawMessage{"chain": nativeChain(rows, leaf), "view": branchView(rows, leaf)} {
		var ids []string
		for _, raw := range got {
			id, _, _ := rowIdentity(raw)
			if id != "" {
				ids = append(ids, id)
			}
		}
		if !reflect.DeepEqual(ids, want) {
			t.Errorf("%s IDs = %v, want %v", name, ids, want)
		}
	}
}

func parallelContextRows() []json.RawMessage {
	// Native CLI 2.1.295 writes each assistant block separately. Parallel
	// results point at their own calls, not necessarily the previous record.
	return []json.RawMessage{
		contextTestText("u", "", "user", ""),
		contextTestText("text", "u", "assistant", "m1"),
		contextTestTool("call-a", "text", "m1", "ta"),
		contextTestTool("call-b", "call-a", "m1", "tb"),
		contextTestResult("result-b", "call-b", "tb", nil),
		contextTestResult("result-a", "call-a", "ta", nil),
		contextTestRow("context", "result-a", "attachment", "", nil, nil),
		contextTestText("final", "context", "assistant", "m2"),
	}
}

func TestNativeContextRetainsParallelToolBranches(t *testing.T) {
	rows := parallelContextRows()
	assertNativeContext(t, rows, "final", []string{"u", "text", "call-a", "call-b", "result-b", "result-a", "context", "final"})
	assertNativeContext(t, rows, "result-a", []string{"u", "text", "call-a", "call-b", "result-b", "result-a"})
	assertNativeContext(t, rows, "call-b", []string{"u", "text", "call-a", "call-b"})
	assertNativeContext(t, rows, "call-a", []string{"u", "text", "call-a"})
	assertNativeContext(t, rows, "missing", nil)
}

func TestNativeContextRetainsInterleavedResponseBlocks(t *testing.T) {
	rows := []json.RawMessage{
		contextTestText("u", "", "user", ""),
		contextTestTool("call-a", "u", "m1", "ta"),
		contextTestResult("result-a", "call-a", "ta", nil),
		contextTestTool("call-b", "result-a", "m1", "tb"),
		contextTestTool("call-c", "call-b", "m1", "tc"),
		contextTestResult("result-c", "call-c", "tc", nil),
		contextTestResult("result-b", "call-b", "tb", nil),
		contextTestText("final", "result-b", "assistant", "m2"),
	}
	assertNativeContext(t, rows, "final", []string{"u", "call-a", "result-a", "call-b", "call-c", "result-c", "result-b", "final"})
}

func TestNativeContextKeepsIndependentResponseBranchesIsolated(t *testing.T) {
	rows := parallelContextRows()
	rows = append(rows,
		contextTestText("fork-user", "u", "user", ""),
		// Even a reused message ID must not cross a new user prompt.
		contextTestTool("fork-call", "fork-user", "m1", "tf"),
		contextTestResult("fork-result", "fork-call", "tf", nil),
		contextTestText("fork-final", "fork-result", "assistant", "m3"),
	)
	assertNativeContext(t, rows, "final", []string{"u", "text", "call-a", "call-b", "result-b", "result-a", "context", "final"})
	assertNativeContext(t, rows, "fork-final", []string{"u", "fork-user", "fork-call", "fork-result", "fork-final"})
}

func TestNativeContextSeparatesReplayedToolResultBatches(t *testing.T) {
	for _, withPrompt := range []bool{false, true} {
		name := "without-prompt-id"
		if withPrompt {
			name = "with-prompt-id"
		}
		t.Run(name, func(t *testing.T) {
			rows := parallelContextRows()
			extra := Object{"sourceToolAssistantUUID": "call-b"}
			if withPrompt {
				extra["promptId"] = "second-request"
			}
			rows = append(rows, contextTestResult("second-b", "call-b", "tb", extra))
			extra = Object{"sourceToolAssistantUUID": "call-a"}
			if withPrompt {
				extra["promptId"] = "second-request"
			}
			rows = append(rows, contextTestResult("second-a", "call-a", "ta", extra), contextTestText("second-final", "second-a", "assistant", "m3"))
			assertNativeContext(t, rows, "second-final", []string{"u", "text", "call-a", "call-b", "second-b", "second-a", "second-final"})
			assertNativeContext(t, rows, "final", []string{"u", "text", "call-a", "call-b", "result-b", "result-a", "context", "final"})
		})
	}
}

func TestNativeContextDoesNotGuessAmbiguousOrForeignToolResults(t *testing.T) {
	for _, tc := range []struct {
		name  string
		extra Object
	}{
		{"different-prompt", Object{"promptId": "other"}},
		{"different-agent", Object{"agentId": "other"}},
		{"different-session", Object{"sessionId": "other"}},
		{"different-sidechain", Object{"isSidechain": true}},
		{"wrong-source", Object{"sourceToolAssistantUUID": "missing"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rows := parallelContextRows()
			rows[4] = contextTestResult("result-b", "call-b", "tb", tc.extra)
			rows[5] = contextTestResult("result-a", "call-a", "ta", Object{"promptId": "this"})
			assertNativeContext(t, rows, "final", nil)
		})
	}
	t.Run("ambiguous-result-without-metadata", func(t *testing.T) {
		rows := parallelContextRows()
		rows = append(rows[:5], append([]json.RawMessage{contextTestResult("other-b", "call-b", "tb", nil)}, rows[5:]...)...)
		assertNativeContext(t, rows, "final", nil)
		cache, err := newCache(t.TempDir(), 1<<20)
		if err != nil {
			t.Fatal(err)
		}
		if _, _, err := cache.mergeNative("session", rows, 0); err != nil {
			t.Fatal(err)
		}
		prepared := &Prepared{SessionID: "session"}
		if prepared.resumeFrom(&Snapshot{SessionID: "session", LastUUID: "final"}, nil, cache, 0) {
			t.Fatal("ambiguous native history must fall back to rebuilding client history")
		}
	})
}

func TestNativeContextUsesMixedUserContentAsResultAnchor(t *testing.T) {
	rows := parallelContextRows()
	rows[5] = contextTestRow("result-a", "call-a", "user", "", []Object{
		{"type": "tool_result", "tool_use_id": "ta", "content": "result-a"},
		{"type": "text", "text": "additional user instruction"},
	}, nil)
	assertNativeContext(t, rows, "final", []string{"u", "text", "call-a", "call-b", "result-b", "result-a", "context", "final"})
	// Text from a side branch has no proven relation to the selected input.
	// Only a pure tool-result sibling can be included automatically.
	rows[4] = contextTestRow("result-b", "call-b", "user", "", []Object{
		{"type": "tool_result", "tool_use_id": "tb", "content": "result-b"},
		{"type": "text", "text": "unselected instruction"},
	}, nil)
	assertNativeContext(t, rows, "final", nil)
}

func TestNativeContextSupportsCombinedSyntheticMessages(t *testing.T) {
	// A seeded client message has all calls in one row and can lack native
	// apiBlockIndex/promptId/sourceToolAssistantUUID metadata.
	rows := []json.RawMessage{
		contextTestText("u", "", "user", ""),
		contextTestRow("calls", "u", "assistant", "", []Object{
			{"type": "tool_use", "id": "ta", "name": "example", "input": Object{}},
			{"type": "tool_use", "id": "tb", "name": "example", "input": Object{}},
		}, nil),
		contextTestResult("result-b", "calls", "tb", nil),
		contextTestResult("result-a", "calls", "ta", nil),
		contextTestText("final", "result-a", "assistant", ""),
	}
	assertNativeContext(t, rows, "final", []string{"u", "calls", "result-b", "result-a", "final"})
}

func TestNativeContextUsesLastUUIDPayload(t *testing.T) {
	rows := parallelContextRows()
	latest := contextTestResult("result-b", "call-b", "tb", Object{"promptId": "updated"})
	rows = append(rows, latest)
	for name, chain := range map[string][]json.RawMessage{"chain": nativeChain(rows, "final"), "view": branchView(rows, "final")} {
		count := 0
		for _, row := range chain {
			id, _, _ := rowIdentity(row)
			if id == "result-b" {
				count++
				if string(row) != string(latest) {
					t.Fatalf("%s: duplicate UUID did not use the last payload", name)
				}
			}
		}
		if count != 1 {
			t.Fatalf("%s: result-b occurs %d times, want once", name, count)
		}
	}
}
