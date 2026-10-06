package main

import (
	"encoding/json"
	"testing"
)

// Expected texts were returned by the Messages API (claude-opus-5-5) for the
// same arrays on 2026-10-06; positions are those of the client's array.
func TestSystemErrorsMatchMessagesAPI(t *testing.T) {
	u := func(s string) Object { return Object{"role": "user", "content": s} }
	a := func(s string) Object { return Object{"role": "assistant", "content": s} }
	s := func(c any) Object { return Object{"role": "system", "content": c} }
	toolUse := Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_1", "name": "w", "input": Object{}}}}
	toolResult := Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_1", "content": "r"}}}
	for _, c := range []struct {
		name     string
		messages []any
		want     string
	}{
		{"after assistant", []any{u("Hi"), a("Hello"), s("x"), u("ok")}, "messages.2: role 'system' must follow a 'user' message or an 'assistant' message ending in a server tool result; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"group after assistant", []any{u("Hi"), a("Hello"), s("one"), s("two"), u("ok")}, "messages.2: role 'system' must follow a 'user' message or an 'assistant' message ending in a server tool result; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"group before user", []any{u("Hi"), s("one"), s("two"), u("ok")}, "messages.2: role 'system' must precede an 'assistant' message or end the array; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"merged user turns", []any{u("Hi"), u("there"), a("Hello"), s("one"), u("ok")}, "messages.3: role 'system' must follow a 'user' message or an 'assistant' message ending in a server tool result; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"first", []any{s("one"), s("two"), u("ok")}, "messages.0: use the top-level 'system' parameter for the initial system prompt; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"between tool use and result", []any{u("Hi"), toolUse, s("x"), toolResult}, "messages.2: role 'system' must follow a 'user' message or an 'assistant' message ending in a server tool result; the directive-only form (content: [] with output_config) is accepted at any position"},
		{"empty array", []any{u("Hi"), s([]any{})}, "messages.1: system content must contain at least one block"},
		{"empty string", []any{u("Hi"), s("")}, "messages.1: system content must contain at least one block"},
		{"empty text block", []any{u("Hi"), s([]any{Object{"type": "text", "text": ""}})}, "messages: text content blocks must be non-empty"},
		{"image block", []any{u("Hi"), s([]any{Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": "iVBORw0KGgo="}}})}, "messages.1: role 'system' supports text, tool_addition, and tool_removal blocks only"},
	} {
		v := basic()
		v["messages"] = c.messages
		body, _ := json.Marshal(v)
		if _, err := parseRequest(body); err == nil || err.Error() != c.want {
			t.Errorf("%s: got %v\nwant %s", c.name, err, c.want)
		}
	}
	v := basic()
	v["messages"] = []any{u("question"), s("instruction one"), s("instruction two"), a("answer"), u("next"), s("last")}
	r := parsed(t, v)
	systems := 0
	for _, m := range r.Messages {
		if m.Role == "system" {
			systems++
		}
	}
	if systems != 3 {
		t.Fatal("valid grouped systems lost")
	}
}
