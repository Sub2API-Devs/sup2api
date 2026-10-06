package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestSystemPositionValidation(t *testing.T) {
	for _, messages := range [][]any{
		{Object{"role": "system", "content": "first"}, Object{"role": "user", "content": "question"}},
		{Object{"role": "user", "content": "question"}, Object{"role": "system", "content": "instruction"}, Object{"role": "user", "content": "next"}},
		{Object{"role": "user", "content": "question"}, Object{"role": "assistant", "content": "answer"}, Object{"role": "system", "content": "instruction"}, Object{"role": "user", "content": "next"}},
	} {
		v := basic()
		v["messages"] = messages
		body, _ := json.Marshal(v)
		if _, err := parseRequest(body); err == nil || !strings.Contains(err.Error(), "system must follow user") {
			t.Fatalf("invalid system position accepted: %v", err)
		}
	}
	v := basic()
	v["messages"] = []any{Object{"role": "user", "content": "question"}, Object{"role": "system", "content": "instruction one"}, Object{"role": "system", "content": "instruction two"}, Object{"role": "assistant", "content": "answer"}, Object{"role": "user", "content": "next"}, Object{"role": "system", "content": "last"}}
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
