package strict

import (
	"errors"
	"strings"
	"testing"
)

// failError asserts that err is a *strict.Error and returns it, so a test can
// pin the path/reason pair, which is the adapter's outward contract: the worker
// forwards it verbatim to the client.
func failError(t *testing.T, err error) *Error {
	t.Helper()
	var e *Error
	if !errors.As(err, &e) {
		t.Fatalf("error %v is not a *strict.Error", err)
	}
	return e
}

func assertFail(t *testing.T, err error, path, reason string) {
	t.Helper()
	e := failError(t, err)
	if e.Path != path || e.Reason != reason {
		t.Fatalf("error = (%q, %q), want (%q, %q)", e.Path, e.Reason, path, reason)
	}
	if want := "unsupported_conversion: " + path + ": " + reason; e.Error() != want {
		t.Fatalf("Error() = %q, want %q", e.Error(), want)
	}
}

// The end-of-input flush reports the bare "input" path, not the index of the
// item that opened the dangling turn: the flush happens after the loop, so no
// single item ended it. Changing it to input[N] silently changes client-visible
// error text.
func TestStrictFlushAtEndOfInputReportsBareInputPath(t *testing.T) {
	// The trailing assistant run carries a duplicated call id: the run is only
	// validated when it is flushed after the loop.
	_, _, err := Prepare("openai.responses", []byte(`{"model":"x","max_output_tokens":20,"input":[
		{"type":"function_call","call_id":"call_1","name":"f","arguments":"{}"},
		{"type":"function_call","call_id":"call_1","name":"f","arguments":"{}"}
	]}`))
	assertFail(t, err, "input", "duplicate or non-assistant tool call")

	// The trailing user run leaves the preceding call unanswered: reported at
	// the flush, not at the item, so the path is "input".
	_, _, err = Prepare("openai.responses", []byte(`{"model":"x","max_output_tokens":20,"input":[
		{"type":"function_call","call_id":"call_1","name":"f","arguments":"{}"},
		{"type":"message","role":"user","content":[{"type":"input_text","text":"next"}]}
	]}`))
	assertFail(t, err, "input", "missing result for preceding tool call")
}

// The token-limit error text is part of the contract: it tells the client why no
// implicit default was applied. The path is the wire field the caller must fix.
func TestStrictMissingTokenLimitErrorContract(t *testing.T) {
	const reason = "explicit positive token limit required; no implicit conversion default"

	_, _, err := Prepare("openai.chat", []byte(`{"model":"x","messages":[{"role":"user","content":"hi"}]}`))
	assertFail(t, err, "max_tokens", reason)

	_, _, err = Prepare("openai.responses", []byte(`{"model":"x","input":"hi"}`))
	assertFail(t, err, "max_output_tokens", reason)

	// Zero is not a valid limit either, and reports the same contract.
	_, _, err = Prepare("openai.chat", []byte(`{"model":"x","max_tokens":0,"messages":[{"role":"user","content":"hi"}]}`))
	assertFail(t, err, "max_tokens", reason)

	_, _, err = Prepare("openai.responses", []byte(`{"model":"x","max_output_tokens":0,"input":"hi"}`))
	assertFail(t, err, "max_output_tokens", reason)

	// Disagreement between the two Chat names is its own error and path.
	_, _, err = Prepare("openai.chat", []byte(`{"model":"x","max_tokens":10,"max_completion_tokens":11,"messages":[{"role":"user","content":"hi"}]}`))
	assertFail(t, err, "max_tokens", "conflicts with max_completion_tokens")
}

// tools:[] must survive as an explicit empty list on the wire. Dropping it turns
// "this request declares no tools" into "this request says nothing about tools",
// which upstreams treat as "tools from a previous turn still apply".
func TestStrictEmptyToolsListStaysOnWire(t *testing.T) {
	_, wire, err := Prepare("openai.chat", []byte(`{"model":"x","max_tokens":12,"tools":[],"messages":[{"role":"user","content":"hi"}]}`))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(wire), `"tools":[]`) {
		t.Fatalf("wire lost the empty tools list: %s", wire)
	}

	_, wire, err = Prepare("openai.responses", []byte(`{"model":"x","max_output_tokens":12,"tools":[],"input":"hi"}`))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(wire), `"tools":[]`) {
		t.Fatalf("wire lost the empty tools list: %s", wire)
	}
}

// Only adjacent tool-result messages form one user turn. A real user message
// after a tool result must stay its own message; folding it in would either fail
// validation or merge two semantically different turns.
func TestStrictToolRunAdjacency(t *testing.T) {
	_, wire, err := Prepare("openai.chat", []byte(`{"model":"x","max_tokens":12,"messages":[
		{"role":"user","content":"call two"},
		{"role":"assistant","content":null,"tool_calls":[
			{"type":"function","id":"id1","function":{"name":"f","arguments":"{}"}},
			{"type":"function","id":"id2","function":{"name":"f","arguments":"{}"}}]},
		{"role":"tool","tool_call_id":"id1","content":"a"},
		{"role":"tool","tool_call_id":"id2","content":"b"},
		{"role":"user","content":"next"}
	]}`))
	if err != nil {
		t.Fatal(err)
	}
	out := obj(t, wire)
	ms := out["messages"].([]any)
	if len(ms) != 4 {
		t.Fatalf("messages = %d, want 4: %s", len(ms), wire)
	}
	if results := ms[2].(object)["content"].([]any); len(results) != 2 {
		t.Fatalf("parallel tool results must share one user turn: %s", wire)
	}
	last := ms[3].(object)
	if last["role"] != "user" {
		t.Fatalf("last message role = %v", last["role"])
	}
	if b, ok := last["content"].([]any); !ok || len(b) != 1 || b[0].(object)["text"] != "next" {
		t.Fatalf("trailing user message was merged into the tool run: %s", wire)
	}
}

// The chat path keeps its own empty-message error path; the check is pinned so a
// refactor of chatMessageBlocks cannot silently change which path is reported.
func TestStrictChatEmptyMessagePath(t *testing.T) {
	_, _, err := Prepare("openai.chat", []byte(`{"model":"x","max_tokens":12,"messages":[{"role":"user"}]}`))
	assertFail(t, err, "messages[0].content", "empty message has no equivalent")
}
