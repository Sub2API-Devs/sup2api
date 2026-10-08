package engine

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReviewToolResultContextExactAndAtomic(t *testing.T) {
	const text = "trusted fixture context"
	suffix := "\n\n<system-reminder>\n" + text + "\n</system-reminder>"
	original := "client keeps its own <system-reminder>text</system-reminder>" + suffix
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "a", "content": original}, {"type": "tool_result", "tool_use_id": "b", "content": "second"}}}}}
	makeBody := func(extra string) Object {
		return Object{"messages": []any{Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "a", "content": original + extra}, Object{"type": "tool_result", "tool_use_id": "b", "content": "second" + extra}}}}}
	}
	block := func(b Object, i int) Object { return b["messages"].([]any)[0].(Object)["content"].([]any)[i].(Object) }
	control := &modControl{sessionContexts: map[string]bool{text: true}}
	for _, other := range []*modControl{nil, {}, {sessionContexts: map[string]bool{"other": true}}} {
		b := makeBody(suffix)
		before := digest(b)
		restore, err := normalizeToolResultContexts(req, b, other)
		if err != nil {
			t.Fatal(err)
		}
		if err = restore(b); err != nil {
			t.Fatal(err)
		}
		if digest(b) != before {
			t.Fatal("unregistered context changed")
		}
	}
	for _, extra := range []string{suffix + "x", suffix + suffix, "x" + suffix} {
		b := makeBody(extra)
		before := digest(b)
		restore, err := normalizeToolResultContexts(req, b, control)
		if err != nil {
			t.Fatal(err)
		}
		if err = restore(b); err != nil {
			t.Fatal(err)
		}
		if digest(b) != before {
			t.Fatal("nonexact suffix changed")
		}
	}
	b := makeBody(suffix)
	restore, err := normalizeToolResultContexts(req, b, control)
	if err != nil {
		t.Fatal(err)
	}
	if block(b, 0)["content"] != original {
		t.Fatal("client context removed")
	}
	block(b, 1)["content"] = "tampered"
	if restore(b) == nil {
		t.Fatal("changed second result accepted")
	}
	if block(b, 0)["content"] != original {
		t.Fatal("partial restoration before error")
	}
	b = makeBody(suffix)
	block(b, 1)["is_error"] = true
	before := digest(b)
	if _, err := normalizeToolResultContexts(req, b, control); err == nil {
		t.Fatal("metadata mismatch accepted")
	}
	if digest(b) != before {
		t.Fatal("partial normalization before metadata error")
	}
	b = makeBody(suffix)
	restore, err = normalizeToolResultContexts(req, b, control)
	if err != nil {
		t.Fatal(err)
	}
	if err = restore(b); err != nil {
		t.Fatal(err)
	}
	if block(b, 0)["content"] != original+suffix {
		t.Fatal("original wire not restored")
	}
	if err = restore(b); err != nil {
		t.Fatal("not idempotent", err)
	}
}

func TestReviewSessionContextAcknowledgementAuthorityAndBounds(t *testing.T) {
	c := &modControl{path: "/fixture", token: "fixture-key", ready: true}
	send := func(token, text string) int {
		r := httptest.NewRequest("POST", "http://localhost/fixture", strings.NewReader(`{"event":"session_context","detail":{"text":"`+text+`"}}`))
		r.RemoteAddr = "127.0.0.1:1"
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		c.ServeHTTP(w, r)
		return w.Code
	}
	if send("wrong", "fixture") != 404 || len(c.sessionContexts) != 0 {
		t.Fatal("untrusted acknowledgement accepted")
	}
	if send(c.token, "") != 400 || send(c.token, strings.Repeat("x", (64<<10)+1)) != 400 {
		t.Fatal("invalid size accepted")
	}
	if send(c.token, "fixture") != 200 {
		t.Fatal("logging-disabled acknowledgement failed")
	}
	if !c.sessionContexts["fixture"] {
		t.Fatal("not recorded")
	}
	for i := 0; i < 32; i++ {
		c.sessionContexts[strings.Repeat("a", i+1)] = true
	}
	if send(c.token, "new") != 400 || send(c.token, "fixture") != 200 {
		t.Fatal("bound/dedup violated")
	}
}
