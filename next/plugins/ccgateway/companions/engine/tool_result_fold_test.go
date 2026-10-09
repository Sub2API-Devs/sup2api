package engine

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

// Claude Code 2.1.292 folds its session attachment into the last tool result
// of a user turn with [content.trim(), reminder].filter(Boolean).join("\n\n"):
// the client text loses its leading whitespace too, not only its trailing one.
// Synthetic shape of the production 502 ("client user turn 3: client user
// block sequence changed") with mid-conversation system messages: user, system,
// assistant with two tool calls, user with two results (the second starts with
// a space and carries the client's cache breakpoint), system.
func TestCLI2292SessionContextFoldedIntoLastToolResult(t *testing.T) {
	const context = "fixture session context"
	suffix := "\n\n<system-reminder>\n" + context + "\n</system-reminder>"
	const second = " fixture result with a leading space\n }"
	client := []any{
		Object{"role": "user", "content": []any{Object{"type": "text", "text": "<system-reminder>\nfixture client context\n</system-reminder>"}, Object{"type": "text", "text": "U1"}}},
		Object{"role": "system", "content": "H_SYS_1"},
		Object{"role": "assistant", "content": []any{
			Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}},
			Object{"type": "tool_use", "id": "toolu_b", "name": "lookup", "input": Object{"q": "x"}},
		}},
		Object{"role": "user", "content": []any{
			Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": "R_A"},
			Object{"type": "tool_result", "tool_use_id": "toolu_b", "content": second, "is_error": false, "cache_control": Object{"type": "ephemeral"}},
		}},
		Object{"role": "system", "content": "<total_tokens>1 tokens left</total_tokens>"},
	}
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	system, _ := json.Marshal([]any{Object{"type": "text", "text": "client system\n\n" + scope.marker}})
	folded, _ := json.Marshal(strings.TrimLeft(second, " ") + suffix)
	raw := `{"model":"claude-opus-5-5","system":` + string(system) + `,"messages":[
		{"role":"user","content":[{"type":"text","text":"<system-reminder>\nfixture client context\n</system-reminder>"},{"type":"text","text":"U1"}]},
		{"role":"system","content":"H_SYS_1","output_config":{"effort":"medium"}},
		{"role":"assistant","content":[{"type":"tool_use","id":"toolu_a","name":"lookup","input":{}},{"type":"tool_use","id":"toolu_b","name":"lookup","input":{"q":"x"}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_a","content":"R_A"},{"type":"tool_result","tool_use_id":"toolu_b","content":` + string(folded) + `,"is_error":false}]},
		{"role":"system","content":[{"type":"text","text":"# Environment\nE\n\n<total_tokens>1 tokens left</total_tokens>\n\n<total_tokens>1 tokens left</total_tokens>\n\nToday's date is 2026-10-09.","cache_control":{"type":"ephemeral"}}]}]}`

	// The client's cache breakpoint makes the cache plan align every client
	// turn exactly, as in production.
	clientBody, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "client system", "messages": client})
	r, err := parsePolicyRequest(clientBody, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if r.Plan == nil || r.Plan.cache == nil {
		t.Fatal("fixture has no cache plan")
	}
	// Without the Mod's acknowledgement the fold is an unproven change.
	if _, err := (&outboundRelay{scope: scope}).adapt(r, r.systemGroups(), []byte(raw), false); err == nil || !strings.Contains(err.Error(), "client user turn 3: client user block sequence changed") {
		t.Fatalf("unacknowledged fold: %v", err)
	}

	relay := &outboundRelay{scope: scope, control: &modControl{sessionContexts: map[string]bool{context: true}}}
	first, err := relay.adapt(r, r.systemGroups(), []byte(raw), false)
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 3; i++ {
		if again, err := relay.adapt(r, r.systemGroups(), []byte(raw), false); err != nil || string(again) != string(first) {
			t.Fatalf("not deterministic: %v", err)
		}
	}
	body := wireBody(t, string(first))
	var results []Object
	for _, m := range body["messages"].([]any) {
		blocks, _ := historyContent(m.(Object)["content"])
		for _, b := range blocks {
			if str(b, "type") == "tool_result" {
				results = append(results, b)
			}
		}
	}
	if len(results) != 2 || results[0]["content"] != "R_A" {
		t.Fatalf("results: %s", canonical(t, results))
	}
	// The client's bytes as sent (leading space kept), then the CLI's context.
	if results[1]["content"] != second+suffix {
		t.Fatalf("second result: %q", results[1]["content"])
	}
	if strings.Count(string(first), context) != 1 {
		t.Fatal("session context lost or duplicated")
	}
}

// The array fold through the whole relay adaptation with a cache plan: the
// client's blocks keep their cache breakpoint, the CLI's context follows them.
func TestCLI2292SessionContextFoldedIntoArrayToolResult(t *testing.T) {
	const context = "fixture array session context"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	result := []any{
		Object{"type": "text", "text": " alpha\n"},
		Object{"type": "text", "text": "beta", "cache_control": Object{"type": "ephemeral"}},
	}
	client := []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": result}}},
	}
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	wire, _ := json.Marshal(Object{"model": "claude-opus-5-5", "system": []any{Object{"type": "text", "text": "client system\n\n" + scope.marker}}, "messages": []any{
		Object{"role": "user", "content": []any{Object{"type": "text", "text": "U1"}}},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": []any{Object{"type": "text", "text": "alpha\n\nbeta\n\n" + reminder}}}}},
	}})
	clientBody, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "client system", "messages": client})
	r, err := parsePolicyRequest(clientBody, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := (&outboundRelay{scope: scope}).adapt(r, r.systemGroups(), wire, false); err == nil {
		t.Fatal("unacknowledged array fold accepted")
	}
	relay := &outboundRelay{scope: scope, control: &modControl{sessionContexts: map[string]bool{context: true}}}
	out, err := relay.adapt(r, r.systemGroups(), wire, false)
	if err != nil {
		t.Fatal(err)
	}
	body := wireBody(t, string(out))
	messages := body["messages"].([]any)
	blocks, _ := historyContent(messages[len(messages)-1].(Object)["content"])
	want := `[{"text":" alpha\n","type":"text"},{"cache_control":{"type":"ephemeral"},"text":"beta","type":"text"},{"text":"` + strings.ReplaceAll(reminder, "\n", `\n`) + `","type":"text"}]`
	if got := canonical(t, blocks[0]["content"]); got != want {
		t.Fatalf("restored:\n%s\nwant:\n%s", got, want)
	}
}

func TestToolResultContextJSTrimBothEnds(t *testing.T) {
	suffix := "\n\n<system-reminder>\ntrusted\n</system-reminder>"
	trusted := map[string]bool{suffix: true}
	r := func(code rune) string { return string(code) }
	for _, lead := range []string{" ", "\t", "\r\n", r(0xa0), r(0x3000), r(0xfeff), " \n\t"} {
		original := lead + "payload\n"
		got, ok := toolResultContextSuffix(original, "payload"+suffix, trusted)
		if !ok || got != suffix {
			t.Errorf("JS trim of leading %q not recognized", lead)
		}
	}
	// Not ECMAScript whitespace: the CLI's trim keeps it, so a missing one is a change.
	for _, lead := range []string{r(0x85), r(0x180e), r(0x200b), "x"} {
		if _, ok := toolResultContextSuffix(lead+"payload", "payload"+suffix, trusted); ok {
			t.Errorf("non-JS leading %q accepted", lead)
		}
	}
	// A client text that trims to nothing is dropped by the CLI's join.
	for _, original := range []string{"", " ", "\n\t"} {
		got, ok := toolResultContextSuffix(original, strings.TrimPrefix(suffix, "\n\n"), trusted)
		if !ok || got != strings.TrimPrefix(suffix, "\n\n") {
			t.Errorf("empty client text %q not recognized", original)
		}
	}
	for _, actual := range []string{"<system-reminder>\nfake\n</system-reminder>", "\n" + strings.TrimPrefix(suffix, "\n\n"), "x" + suffix} {
		if _, ok := toolResultContextSuffix(" ", actual, trusted); ok {
			t.Errorf("changed empty result accepted: %q", actual)
		}
	}
	if _, ok := toolResultContextSuffix("payload", strings.TrimPrefix(suffix, "\n\n"), trusted); ok {
		t.Error("client text dropped")
	}
}

func TestToolResultContextEmptyClientText(t *testing.T) {
	const context = "trusted"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	for _, original := range []string{"", "  "} {
		req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "one", "content": original}}}}}
		b := Object{"type": "tool_result", "tool_use_id": "one", "content": reminder}
		body := Object{"messages": []any{Object{"role": "user", "content": []any{b}}}}
		restore, err := normalizeToolResultContexts(req, body, &modControl{sessionContexts: map[string]bool{context: true}})
		if err != nil {
			t.Fatal(err)
		}
		if _, err = alignClientHistory(req, body); err != nil {
			t.Fatal(err)
		}
		if err = restore(body); err != nil {
			t.Fatal(err)
		}
		if b["content"] != original+reminder {
			t.Fatalf("restored %q", b["content"])
		}
	}
}

// The array branch of the CLI's fold: every text block is rebuilt trimmed,
// empty ones dropped, adjacent ones joined, the reminder joined to the last
// text block. The client's blocks are sent as they were, the reminder after
// them as its own text block.
func TestToolResultContextArrayFold(t *testing.T) {
	const context = "trusted array context"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	image := Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": "iVBORw0KGgo="}}
	original := []any{
		Object{"type": "text", "text": " first \n"},
		image,
		Object{"type": "text", "text": "second", "cache_control": Object{"type": "ephemeral"}},
		Object{"type": "text", "text": "  "},
		Object{"type": "text", "text": "third\n"},
	}
	folded := []any{
		Object{"type": "text", "text": "first"},
		image,
		Object{"type": "text", "text": "second\n\nthird\n\n" + reminder},
	}
	// The CLI's other array merge: blocks kept, a newline added to the last
	// text block, the reminder as its own block.
	appended := append(append([]any{}, original[:4]...), Object{"type": "text", "text": "third\n\n"}, Object{"type": "text", "text": reminder})
	for _, mode := range []string{"trusted", "appended", "untrusted", "client-changed", "image-changed", "unfolded", "appended-changed"} {
		t.Run(mode, func(t *testing.T) {
			req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "one", "content": original}}}}}
			actual := folded
			control := &modControl{sessionContexts: map[string]bool{context: true}}
			switch mode {
			case "untrusted":
				control = &modControl{sessionContexts: map[string]bool{"other": true}}
			case "client-changed":
				actual = []any{folded[0], image, Object{"type": "text", "text": "second\n\nTHIRD\n\n" + reminder}}
			case "image-changed":
				actual = []any{folded[0], Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": "AAAA"}}, folded[2]}
			case "unfolded":
				actual = append(append([]any{}, original...), Object{"type": "text", "text": reminder})
			case "appended":
				actual = appended
			case "appended-changed":
				actual = append(append([]any{}, original[:4]...), Object{"type": "text", "text": "THIRD\n\n"}, Object{"type": "text", "text": reminder})
			}
			b := Object{"type": "tool_result", "tool_use_id": "one", "content": actual}
			body := Object{"messages": []any{Object{"role": "user", "content": []any{b}}}}
			restore, err := normalizeToolResultContexts(req, body, control)
			if err == nil {
				_, err = alignClientHistory(req, body)
			}
			if mode != "trusted" && mode != "appended" {
				if err == nil {
					t.Fatal("unproven fold accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if err = restore(body); err != nil {
				t.Fatal(err)
			}
			// Cache fields come back from the client through the cache plan.
			want := append(append([]any{}, original...), Object{"type": "text", "text": reminder})
			same := func() bool {
				got, _ := historyContent(b["content"])
				w, _ := historyContent(want)
				return digest(historySkeleton(got)) == digest(historySkeleton(w))
			}
			if !same() {
				t.Fatalf("restored %s", canonical(t, b["content"]))
			}
			if err = restore(body); err != nil || !same() {
				t.Fatal("restoration not idempotent", err)
			}
		})
	}
}

// Production shape (a subagent's result through the MCP fallback, 2026-10-10):
// a one-block array result whose text the CLI ends with a newline, the
// session context after it as its own block. The client's result is sent
// unchanged with the context appended.
func TestCLI2292SessionContextAppendedToArrayToolResult(t *testing.T) {
	const context = "fixture subagent session context"
	reminder := "<system-reminder>\n" + context + "\n</system-reminder>"
	const report = "  fixture subagent report\n<usage>tool_uses: 2</usage>"
	client := []any{
		Object{"role": "user", "content": "U1"},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": []any{Object{"type": "text", "text": report}}, "cache_control": Object{"type": "ephemeral"}}}},
	}
	scope := newMainRequestScope()
	if err := scope.enter(); err != nil {
		t.Fatal(err)
	}
	wire, _ := json.Marshal(Object{"model": "claude-opus-5-5", "system": []any{Object{"type": "text", "text": "client system\n\n" + scope.marker}}, "messages": []any{
		Object{"role": "user", "content": []any{Object{"type": "text", "text": "U1"}}},
		Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_a", "name": "lookup", "input": Object{}}}},
		Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_a", "content": []any{
			Object{"type": "text", "text": report + "\n"}, Object{"type": "text", "text": reminder}}}}},
	}})
	clientBody, _ := json.Marshal(Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "client system", "messages": client})
	r, err := parsePolicyRequest(clientBody, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := (&outboundRelay{scope: scope}).adapt(r, r.systemGroups(), wire, false); err == nil || !strings.Contains(err.Error(), "client user block sequence changed") {
		t.Fatalf("unacknowledged appended fold: %v", err)
	}
	relay := &outboundRelay{scope: scope, control: &modControl{sessionContexts: map[string]bool{context: true}}}
	out, err := relay.adapt(r, r.systemGroups(), wire, false)
	if err != nil {
		t.Fatal(err)
	}
	body := wireBody(t, string(out))
	messages := body["messages"].([]any)
	blocks, _ := historyContent(messages[len(messages)-1].(Object)["content"])
	got, _ := historyContent(blocks[0]["content"])
	if len(got) != 2 || str(got[0], "text") != report || str(got[1], "text") != reminder {
		t.Fatalf("restored: %s", canonical(t, blocks[0]["content"]))
	}
	if strings.Count(string(out), context) != 1 {
		t.Fatal("session context lost or duplicated")
	}
}
