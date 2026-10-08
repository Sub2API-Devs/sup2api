package engine

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
)

func reviewInputEvents(initial any, parts []any, name string) []Object {
	events := []Object{
		{"type": "message_start", "message": Object{"id": "msg_review_empty", "type": "message", "role": "assistant", "model": "fixture", "content": []any{}, "usage": Object{}}},
		{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "review_call", "name": name, "input": initial}},
	}
	for _, part := range parts {
		events = append(events, Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": part}})
	}
	return append(events, Object{"type": "content_block_stop", "index": 0}, Object{"type": "message_delta", "delta": Object{"stop_reason": "tool_use"}, "usage": Object{"output_tokens": 1}}, Object{"type": "message_stop"})
}

func TestReviewEmptyInputReducersAgree(t *testing.T) {
	for _, tc := range []struct {
		name    string
		initial any
		parts   []any
		want    any
		valid   bool
	}{
		{"multiple-empty", Object{}, []any{"", "", ""}, Object{}, true},
		{"initial-preserved", Object{"n": json.Number("9007199254740993")}, []any{"", ""}, Object{"n": json.Number("9007199254740993")}, true},
		{"empty-between-fragments", Object{}, []any{"", "", `{"n":`, "", "9007199254740993", "", "}", ""}, Object{"n": json.Number("9007199254740993")}, true},
		{"empty-does-not-hide-whitespace", Object{}, []any{"", " ", ""}, nil, false},
		{"empty-does-not-complete-json", Object{}, []any{"", `{"n":`, ""}, nil, false},
		{"numeric-delta", Object{}, []any{"", 0, ""}, nil, false},
		{"null-delta", Object{}, []any{"", nil}, nil, false},
		{"array-initial", []any{}, []any{""}, nil, false},
		{"null-initial", nil, []any{""}, nil, false},
		{"array-delta", Object{}, []any{"", "[]", ""}, nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := basic()
			body["tools"] = []any{Object{"name": "lookup", "input_schema": Object{"type": "object"}}}
			r := parsed(t, body)
			events := reviewInputEvents(tc.initial, tc.parts, r.wireName("lookup"))
			var encoded [][]byte
			for _, event := range events {
				encoded = append(encoded, mustMCPJSON(event))
			}
			a := &Accumulator{}
			var accErr error
			for _, raw := range encoded {
				event, _ := decodeObject(raw)
				if accErr = a.push(event, r); accErr != nil {
					break
				}
			}
			creditRaw, creditErr := credits.MessageFromEvents(encoded)
			if (accErr == nil) != tc.valid || (creditErr == nil) != tc.valid {
				t.Fatalf("valid=%v accumulator=%v credit=%v", tc.valid, accErr, creditErr)
			}
			if !tc.valid {
				return
			}
			if digest(a.Blocks[0]["input"]) != digest(tc.want) {
				t.Fatal("accumulator changed input")
			}
			credit, _ := decodeObject(creditRaw)
			if digest(credit["content"].([]any)[0].(Object)["input"]) != digest(tc.want) {
				t.Fatal("credit changed input")
			}
		})
	}
}

func TestReviewMCPEmptyDeltasDoNotWeakenCredentialInspection(t *testing.T) {
	for _, tc := range []struct {
		name  string
		parts []any
		valid bool
	}{
		{"multiple-empty", []any{"", ""}, true},
		{"complete-then-empty", []any{`{"ok":1}`, "", ""}, true},
		{"split-complete", []any{"", `{"ok":`, "", "1}", ""}, true},
		{"whitespace", []any{"", " ", ""}, false},
		{"truncated", []any{"", "{", ""}, false},
		{"non-string", []any{nil}, false},
		{"split-secret", []any{"", `{"x":"fixture-`, "", `secret-one"}`, ""}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			guard := newMCPResponseGuard(&MCPConnectorPlan{credentials: map[string]mcpCredential{"one": {url: "https://one.example.test/mcp", token: "fixture-secret-one"}}})
			var err error
			for _, event := range reviewInputEvents(Object{}, tc.parts, "lookup") {
				if err = guard.checkJSON(mustMCPJSON(event)); err != nil {
					break
				}
			}
			if (err == nil) != tc.valid {
				t.Fatalf("valid=%v err=%v", tc.valid, err)
			}
		})
	}
}
