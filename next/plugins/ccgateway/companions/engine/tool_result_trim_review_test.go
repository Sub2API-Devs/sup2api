package engine

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
)

func TestReviewToolResultTrimBoundaries(t *testing.T) {
	suffix := "\n\n<system-reminder>\ntrusted\n</system-reminder>"
	for _, tail := range []string{"\t", "\r\n", " \t\r\n", "\v", "\f", "\u00a0", "\u1680", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004", "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200a", "\u2028", "\u2029", "\u202f", "\u205f", "\u3000", "\ufeff", "\u0085", "\u180e", "\u200b"} {
		original := "payload" + tail
		trusted := map[string]bool{suffix: true}
		got, ok := toolResultContextSuffix(original, "payload"+suffix, trusted)
		jsWhitespace := tail != "\u0085" && tail != "\u180e" && tail != "\u200b"
		if ok != jsWhitespace || ok && got != suffix {
			t.Errorf("tail %q recognition %v", tail, ok)
		}
		if _, ok := toolResultContextSuffix(original, original+suffix, trusted); !ok {
			t.Errorf("exact prefix changed for %q", tail)
		}
		if _, ok := toolResultContextSuffix(original, "payload"+suffix, map[string]bool{}); ok {
			t.Error("unregistered suffix accepted")
		}
		if jsWhitespace {
			r := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "unicode", "content": original}}}}}
			b := Object{"type": "tool_result", "tool_use_id": "unicode", "content": "payload" + suffix}
			body := Object{"messages": []any{Object{"role": "user", "content": []any{b}}}}
			restore, err := normalizeToolResultContexts(r, body, &modControl{sessionContexts: map[string]bool{"trusted": true}})
			if err != nil {
				t.Fatal(err)
			}
			if err := restore(body); err != nil {
				t.Fatal(err)
			}
			if b["content"] != original+suffix {
				t.Errorf("Unicode tail bytes not restored: %q", tail)
			}
		}
	}
	for _, actual := range []string{"payload changed" + suffix, "payload" + suffix + "extra", "payload" + suffix + suffix, "payload", "payload\n\n<system-reminder>\nfake\n</system-reminder>"} {
		if _, ok := toolResultContextSuffix("payload\t", actual, map[string]bool{suffix: true}); ok {
			t.Fatal("non-equivalent change admitted")
		}
	}
	req := &Request{Messages: []Message{{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "id", "content": "payload \t\r\n"}}}}}
	b := Object{"type": "tool_result", "tool_use_id": "id", "content": "payload" + suffix}
	body := Object{"messages": []any{Object{"role": "user", "content": []any{b}}}}
	restore, err := normalizeToolResultContexts(req, body, &modControl{sessionContexts: map[string]bool{"trusted": true}})
	if err != nil {
		t.Fatal(err)
	}
	if b["content"] != "payload \t\r\n" {
		t.Fatal("client tail absent in alignment")
	}
	if err := restore(body); err != nil {
		t.Fatal(err)
	}
	if b["content"] != "payload \t\r\n"+suffix {
		t.Fatal("client trailing bytes lost")
	}
}

func TestReviewParallelResultsRejectInvalidPairing(t *testing.T) {
	for _, mode := range []string{"missing", "duplicate", "wrong-id", "user-without-results", "text-before-results"} {
		calls := []any{}
		results := []any{}
		for i := 0; i < 5; i++ {
			id := fmt.Sprintf("call_%d", i)
			calls = append(calls, Object{"type": "tool_use", "id": id, "name": "fixture", "input": Object{}})
			results = append(results, Object{"type": "tool_result", "tool_use_id": id, "content": "fixture"})
		}
		switch mode {
		case "missing":
			results = results[:4]
		case "duplicate":
			results[4] = results[0]
		case "wrong-id":
			results[4].(Object)["tool_use_id"] = "unknown"
		case "text-before-results":
			results = append([]any{Object{"type": "text", "text": "early"}}, results...)
		}
		body := basic()
		body["tools"] = []any{Object{"name": "fixture", "input_schema": Object{"type": "object"}}}
		messages := []any{Object{"role": "user", "content": "start"}, Object{"role": "assistant", "content": calls}}
		if mode == "user-without-results" {
			messages = append(messages, Object{"role": "user", "content": "premature"})
		}
		body["messages"] = append(messages, Object{"role": "user", "content": results})
		raw, _ := json.Marshal(body)
		if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
			t.Fatal("invalid batch accepted", mode)
		}
	}
}
