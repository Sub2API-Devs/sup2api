package main

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestModerationSimulation(t *testing.T) {
	_, srv := newTestServer(t)
	auth := map[string]string{"Authorization": "Bearer sk-mod-1"}
	tool := `"tools":[{"type":"function","function":{"name":"submit_verdict","parameters":{"type":"object"}}}],"tool_choice":"required","stream":false`
	chat := func(messages string) map[string]any {
		t.Helper()
		resp := post(t, srv, "/v1/chat/completions", auth, `{"model":"mod-x",`+tool+`,"messages":`+messages+`}`)
		if resp.StatusCode != 200 {
			t.Fatalf("status %d", resp.StatusCode)
		}
		return decode(t, resp)
	}
	msg := func(m map[string]any) map[string]any {
		return get(m, "choices").([]any)[0].(map[string]any)["message"].(map[string]any)
	}
	finish := func(m map[string]any) string {
		return get(m, "choices").([]any)[0].(map[string]any)["finish_reason"].(string)
	}
	args := func(t *testing.T, m map[string]any) map[string]any {
		t.Helper()
		tc := msg(m)["tool_calls"].([]any)
		call := tc[0].(map[string]any)
		if call["type"] != "function" || !strings.HasPrefix(call["id"].(string), "call_") || get(call, "function", "name") != "submit_verdict" ||
			finish(m) != "tool_calls" || msg(m)["content"] != nil {
			t.Fatalf("tool call %v", m)
		}
		if num(get(m, "usage", "prompt_tokens")) <= 0 || num(get(m, "usage", "completion_tokens")) <= 0 || num(get(m, "usage", "total_tokens")) <= 0 {
			t.Fatalf("usage %v", m["usage"])
		}
		var out map[string]any
		if err := json.Unmarshal([]byte(get(call, "function", "arguments").(string)), &out); err != nil {
			t.Fatal(err)
		}
		return out
	}
	sys := `{"role":"system","content":"judge"}`

	a := args(t, chat(`[`+sys+`,{"role":"user","content":"please MOD-BLOCK this"}]`))
	if a["verdict"] != "block" || a["severity"] != "high" || a["reason"] != "mock: illegal" || len(a["categories"].([]any)) != 1 || a["categories"].([]any)[0] != "illegal" {
		t.Fatalf("block %v", a)
	}
	// Text parts joined; the last user message counts.
	a = args(t, chat(`[{"role":"user","content":"MOD-BLOCK old"},{"role":"assistant","content":"x"},{"role":"user","content":[{"type":"text","text":"a"},{"type":"text","text":"MOD-FLAG"}]}]`))
	if a["verdict"] != "flag" || a["severity"] != "low" || a["categories"].([]any)[0] != "other" {
		t.Fatalf("flag %v", a)
	}
	a = args(t, chat(`[`+sys+`,{"role":"user","content":"hello"}]`))
	if a["verdict"] != "pass" || a["severity"] != "none" || a["reason"] != "mock: ok" || len(a["categories"].([]any)) != 0 {
		t.Fatalf("pass %v", a)
	}

	// MOD-NOTOOL: plain text first, a verdict once the agent follows up.
	m := chat(`[` + sys + `,{"role":"user","content":"MOD-NOTOOL"}]`)
	if finish(m) != "stop" || msg(m)["tool_calls"] != nil || msg(m)["content"] == "" || msg(m)["content"] == nil {
		t.Fatalf("notool %v", m)
	}
	a = args(t, chat(`[`+sys+`,{"role":"user","content":"MOD-NOTOOL"},{"role":"assistant","content":"fine"},{"role":"user","content":"MOD-NOTOOL again, call the tool"}]`))
	if a["verdict"] != "pass" {
		t.Fatalf("notool follow-up %v", a)
	}

	// MOD-BADARGS: invalid arguments until a tool message answers them.
	a = args(t, chat(`[`+sys+`,{"role":"user","content":"MOD-BADARGS"}]`))
	if a["verdict"] != "maybe" || len(a) != 1 {
		t.Fatalf("badargs %v", a)
	}
	a = args(t, chat(`[`+sys+`,{"role":"user","content":"MOD-BADARGS"},{"role":"assistant","content":null,"tool_calls":[{"id":"call_1","type":"function","function":{"name":"submit_verdict","arguments":"{\"verdict\":\"maybe\"}"}}]},{"role":"tool","tool_call_id":"call_1","content":"invalid"}]`))
	if a["verdict"] != "pass" {
		t.Fatalf("badargs retry %v", a)
	}

	// Injected errors still apply first.
	resp := post(t, srv, "/v1/chat/completions", map[string]string{"Authorization": "Bearer sk-mod-status-500"}, `{"model":"mod-x",`+tool+`,"messages":[{"role":"user","content":"MOD-BLOCK"}]}`)
	if resp.StatusCode != 500 {
		t.Fatalf("injected status %d", resp.StatusCode)
	}

	// Requests without the tool are unchanged.
	m = decode(t, post(t, srv, "/v1/chat/completions", auth, `{"model":"mod-x","messages":[{"role":"user","content":"MOD-BLOCK"}],"tools":[{"type":"function","function":{"name":"other"}}]}`))
	if msg(m)["content"] != "Hello from mock-upstream." || msg(m)["tool_calls"] != nil || finish(m) != "stop" {
		t.Fatalf("plain chat %v", m)
	}
}
