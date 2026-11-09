package convert

import (
	"errors"
	"slices"
	"strings"
	"testing"

	"github.com/tidwall/gjson"
)

// canonConvert runs the request side of a built-in canonReq pair.
func canonConvert(t *testing.T, from, to, body string, opt Options) (gjson.Result, respOpts, []string, error) {
	t.Helper()
	i := slices.IndexFunc(canonPairs, func(p canonPair) bool { return p.from == from && p.to == to })
	if i < 0 {
		t.Fatalf("no canon pair %s -> %s", from, to)
	}
	var l losses
	out, ro, err := canonPairs[i].req([]byte(body), opt, &l)
	return gjson.ParseBytes(out), ro, lossStrings(l.sorted()), err
}

// mustConvert is canonConvert failing the test on error.
func mustConvert(t *testing.T, from, to, body string, opt Options) (gjson.Result, respOpts, []string) {
	t.Helper()
	j, ro, lost, err := canonConvert(t, from, to, body, opt)
	if err != nil {
		t.Fatalf("convert %s -> %s: %v", from, to, err)
	}
	return j, ro, lost
}

// expectJSON checks gjson paths of j ("#" counts, "!" prefix: absent).
func expectJSON(t *testing.T, j gjson.Result, want map[string]string) {
	t.Helper()
	for path, w := range want {
		if p, absent := strings.CutPrefix(path, "!"); absent {
			if j.Get(p).Exists() {
				t.Errorf("%s present: %s", p, j.Get(p).Raw)
			}
			continue
		}
		if got := j.Get(path); !got.Exists() || got.String() != w {
			t.Errorf("%s = %q, want %q\n%s", path, got.String(), w, j.Raw)
		}
	}
}

// lossStrings renders losses as "category:path" (hop 0).
func lossStrings(ls []Loss) []string {
	out := make([]string, len(ls))
	for i, l := range ls {
		out[i] = string(l.Category) + ":" + l.Path
	}
	return out
}

func expectLosses(t *testing.T, got []string, want ...string) {
	t.Helper()
	slices.Sort(want)
	sorted := slices.Clone(got)
	slices.Sort(sorted)
	if !slices.Equal(sorted, want) {
		t.Errorf("losses:\n got %q\nwant %q", sorted, want)
	}
}

const (
	pChat      = "openai.chat"
	pResponses = "openai.responses"
	pAnthropic = "anthropic.messages"
)

func TestBuiltinConvertersAreDistinctPairs(t *testing.T) {
	r := NewRegistry(builtinConverters()...)
	if n := len(r.Pairs()); n < len(canonPairs)+1 {
		t.Fatalf("pairs = %d", n)
	}
	for _, p := range canonPairs {
		c, ok := r.Resolve(p.from, p.to)
		if !ok || c.Grade() != p.grade {
			t.Errorf("%s -> %s not registered with grade %s", p.from, p.to, p.grade)
		}
	}
}

func TestChatToAnthropicMapping(t *testing.T) {
	j, ro, lost := mustConvert(t, pChat, pAnthropic, `{
		"model": "claude-x", "max_completion_tokens": 300, "temperature": 1.5, "top_p": 0.9, "stop": "END",
		"user": "u1", "service_tier": "default", "parallel_tool_calls": false, "stream": true,
		"stream_options": {"include_usage": true}, "seed": 7, "prompt_cache_key": "k",
		"response_format": {"type": "json_schema", "json_schema": {"name": "o", "strict": true, "schema": {"type": "object"}}},
		"tools": [
			{"type": "function", "function": {"name": "get", "description": "fetch", "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}, "strict": true}},
			{"type": "function", "function": {"name": "now"}},
			{"type": "custom", "custom": {"name": "shell", "format": {"type": "grammar", "grammar": {"syntax": "lark", "definition": "x"}}}}
		],
		"web_search_options": {"search_context_size": "low", "user_location": {"type": "approximate", "approximate": {"city": "Paris"}}},
		"tool_choice": "required",
		"messages": [
			{"role": "system", "content": "be brief"},
			{"role": "developer", "content": [{"type": "text", "text": "use tools"}]},
			{"role": "user", "content": [{"type": "text", "text": "look"},
				{"type": "image_url", "image_url": {"url": "https://x/i.png"}},
				{"type": "image_url", "image_url": {"url": "data:image/png;base64,AAAA", "detail": "low"}},
				{"type": "file", "file": {"file_data": "data:application/pdf;base64,JVBE", "filename": "a.pdf"}}]},
			{"role": "assistant", "content": "calling", "tool_calls": [
				{"id": "call.1", "type": "function", "function": {"name": "get", "arguments": "{\"q\":9007199254740993}"}},
				{"id": "call_2", "type": "custom", "custom": {"name": "shell", "input": "ls"}}]},
			{"role": "tool", "tool_call_id": "call_2", "content": "files"},
			{"role": "tool", "tool_call_id": "call.1", "content": [{"type": "text", "text": "a"}]},
			{"role": "system", "content": "late"},
			{"role": "user", "content": "thanks"}
		]}`, Options{})
	expectJSON(t, j, map[string]string{
		"model": "claude-x", "max_tokens": "300", "temperature": "1", "top_p": "0.9", "stop_sequences.0": "END",
		"metadata.user_id": "u1", "service_tier": "standard_only", "stream": "true",
		"output_config.format.type": "json_schema", "output_config.format.schema.type": "object",
		"system.#": "3", "system.0.text": "be brief", "system.1.text": "use tools", "system.2.text": "late",
		"tools.#": "4", "tools.0.name": "get", "tools.0.input_schema.properties.q.type": "string", "!tools.0.strict": "",
		"tools.1.input_schema.type": "object", "tools.2.input_schema.required.0": "input",
		"tools.3.type": "web_search_20250305", "tools.3.user_location.city": "Paris",
		"tool_choice.type": "any", "tool_choice.disable_parallel_tool_use": "true",
		"messages.#": "3", "messages.0.role": "user", "messages.0.content.#": "4",
		"messages.0.content.1.source.type": "url", "messages.0.content.2.source.media_type": "image/png",
		"messages.0.content.3.type": "document", "messages.0.content.3.title": "a.pdf",
		"messages.1.content.1.id":          anthropicToolID("call.1"),
		"messages.1.content.2.input.input": "ls",
		"messages.2.content.0.tool_use_id": anthropicToolID("call_2"), "messages.2.content.1.tool_use_id": anthropicToolID("call.1"),
		"messages.2.content.2.text": "thanks",
	})
	if !strings.Contains(j.Raw, "9007199254740993") {
		t.Errorf("integer precision lost: %s", j.Raw)
	}
	if !ro.includeUsage || !ro.customTools["shell"] || ro.model != "claude-x" {
		t.Errorf("respOpts = %+v", ro)
	}
	expectLosses(t, lost, "other:temperature", "other:seed", "other:prompt_cache_key", "image:messages[2].content[2].image_url.detail",
		"other:messages[6]", "other:tools[0].function.strict", "other:tools[2].custom.format", "other:web_search_options.search_context_size")
}

func TestChatToAnthropicThinkingAndMaxTokens(t *testing.T) {
	const user = `"messages":[{"role":"user","content":"hi"}]`
	byModel := func(model string) int {
		if model == "small" {
			return 1000
		}
		return 4096
	}
	for _, tc := range []struct {
		name, body string
		opt        Options
		max        int64
		budget     int64
		lost       []string
	}{
		{"default", `{"model":"m",` + user + `}`, Options{}, 8192, 0, nil},
		{"setting", `{"model":"m",` + user + `}`, Options{ClaudeDefaultMaxTokens: byModel}, 4096, 0, nil},
		{"raised to budget", `{"model":"m","reasoning_effort":"high",` + user + `}`, Options{}, 24577, 24576, nil},
		{"low keeps default", `{"model":"m","reasoning_effort":"low",` + user + `}`, Options{}, 8192, 2048, nil},
		{"floor", `{"model":"small","reasoning_effort":"minimal",` + user + `}`, Options{ClaudeDefaultMaxTokens: byModel}, 2049, 2048, nil},
		{"cut to client limit", `{"model":"m","max_tokens":2000,"reasoning_effort":"high",` + user + `}`, Options{}, 2000, 1999, nil},
		{"too small", `{"model":"m","max_tokens":1000,"reasoning_effort":"low",` + user + `}`, Options{}, 1000, 0, []string{"reasoning:reasoning_effort"}},
		{"none", `{"model":"m","reasoning_effort":"none",` + user + `}`, Options{}, 8192, 0, nil},
		{"unknown effort", `{"model":"m","reasoning_effort":"extreme",` + user + `}`, Options{}, 8192, 0, []string{"reasoning:reasoning_effort"}},
		{"sampling dropped", `{"model":"m","reasoning_effort":"medium","temperature":0.2,"top_p":0.5,` + user + `}`, Options{}, 8193, 8192,
			[]string{"other:temperature", "other:top_p"}},
		{"forced tool", `{"model":"m","reasoning_effort":"medium","tool_choice":"required","tools":[{"type":"function","function":{"name":"f"}}],` + user + `}`,
			Options{}, 8192, 0, []string{"reasoning:reasoning_effort"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			j, _, lost := mustConvert(t, pChat, pAnthropic, tc.body, tc.opt)
			if j.Get("max_tokens").Int() != tc.max || j.Get("thinking.budget_tokens").Int() != tc.budget {
				t.Errorf("max_tokens %d, budget %d: %s", j.Get("max_tokens").Int(), j.Get("thinking.budget_tokens").Int(), j.Raw)
			}
			if tc.budget > 0 && j.Get("thinking.type").String() != "enabled" {
				t.Errorf("thinking: %s", j.Raw)
			}
			expectLosses(t, lost, tc.lost...)
		})
	}
}

// Thinking is off while the last assistant message calls tools: converted
// history has no signed thinking block for it (CONVERT-MATRIX §3.2).
func TestChatToAnthropicThinkingToolLoop(t *testing.T) {
	loop := `{"model":"m","reasoning_effort":"high","tools":[{"type":"function","function":{"name":"f"}}],"messages":[
		{"role":"user","content":"go"},
		{"role":"assistant","content":null,"reasoning_content":"plan","tool_calls":[{"id":"c1","type":"function","function":{"name":"f","arguments":"{}"}}]},
		{"role":"tool","tool_call_id":"c1","content":"done"}%s]}`
	j, _, lost := mustConvert(t, pChat, pAnthropic, strings.Replace(loop, "%s", "", 1), Options{})
	if j.Get("thinking").Exists() || j.Get("max_tokens").Int() != 8192 {
		t.Errorf("thinking in a tool loop: %s", j.Raw)
	}
	expectLosses(t, lost, "reasoning:messages[1].reasoning_content", "reasoning:reasoning_effort")
	j, _, lost = mustConvert(t, pChat, pAnthropic, strings.Replace(loop, "%s",
		`,{"role":"assistant","content":"ok"},{"role":"user","content":"next"}`, 1), Options{})
	if j.Get("thinking.budget_tokens").Int() != 24576 {
		t.Errorf("thinking after the loop ended: %s", j.Raw)
	}
	expectLosses(t, lost, "reasoning:messages[1].reasoning_content")
}

// Anthropic needs alternating roles starting with user and every tool_use
// answered in the next message; what cannot be paired is a tool loss.
func TestChatToAnthropicConversationRepair(t *testing.T) {
	j, _, lost := mustConvert(t, pChat, pAnthropic, `{"model":"m","messages":[
		{"role":"assistant","content":"hello"},
		{"role":"user","content":"a"},{"role":"user","content":[{"type":"text","text":""},{"type":"text","text":"b"}]},
		{"role":"assistant","content":"","tool_calls":[
			{"id":"c1","type":"function","function":{"name":"f","arguments":"not json"}},
			{"id":"c2","type":"function","function":{"name":"f","arguments":""}},
			{"id":"c3","type":"function","function":{"name":"f","arguments":"{}"}}]},
		{"role":"tool","tool_call_id":"c1","content":"r1"},
		{"role":"user","content":"interrupt"},
		{"role":"tool","tool_call_id":"c2","content":"r2"},
		{"role":"tool","tool_call_id":"zz","content":"orphan"},
		{"role":"assistant","content":null},
		{"role":"assistant","content":"x","tool_calls":[{"id":"c9","type":"function","function":{"name":"f","arguments":"{}"}}]}
	]}`, Options{})
	expectJSON(t, j, map[string]string{
		"messages.#": "6", "messages.0.role": "user", "messages.0.content.0.text": ".", "messages.5.content.0.text": "x",
		"messages.1.role": "assistant", "messages.1.content.0.text": "hello",
		"messages.2.content.#": "2", "messages.2.content.1.text": "b",
		"messages.3.content.#": "2", "messages.3.content.0.input": "{}", "messages.3.content.1.id": "c2",
		"messages.4.role": "user", "messages.4.content.0.tool_use_id": "c1", "messages.4.content.1.tool_use_id": "c2",
		"messages.4.content.2.text": "interrupt",
	})
	expectLosses(t, lost, "other:messages[0]", "tool:messages[3].tool_calls[0].arguments",
		"tool:messages[3].tool_calls[2]", "tool:messages[7]", "tool:messages[9].tool_calls[0]")
}

func TestChatToAnthropicImpossible(t *testing.T) {
	for body, want := range map[string]string{
		`{"model":"m","n":2,"messages":[{"role":"user","content":"x"}]}`:                 "n",
		`{"model":"m","messages":[]}`:                                                    "messages",
		`{"model":"m","messages":[{"role":"system","content":"x"}]}`:                     "messages",
		`{"model":"m","audio":{"voice":"a"},"messages":[{"role":"user","content":"x"}]}`: "audio",
		`{"model":"m","messages":[{"role":"user","content":7}]}`:                         "messages[0].content",
		`{"model":"m","messages":[{"role":"wizard","content":"x"}]}`:                     "messages[0].role",
		`{"messages":[{"role":"user","content":"x"}]}`:                                   "model",
		`{"model":"m","messages":[{"role":"user","content":"x"}],"temperature":"hot"}`:   "temperature",
		`not json`: "request",
	} {
		_, _, _, err := canonConvert(t, pChat, pAnthropic, body, Options{})
		var re *RequestError
		var ce *conversionError
		if !errors.As(err, &re) || !errors.As(err, &ce) || ce.path != want {
			t.Errorf("%s: err = %v, want a request error at %s", body, err, want)
		}
	}
}

func TestResponsesToAnthropic(t *testing.T) {
	j, _, lost := mustConvert(t, pResponses, pAnthropic, `{
		"model": "m", "instructions": "sys", "store": true, "include": ["reasoning.encrypted_content"],
		"truncation": "auto", "reasoning": {"effort": "medium", "summary": "auto"},
		"text": {"format": {"type": "json_object"}, "verbosity": "low"},
		"tools": [{"type": "function", "name": "f", "parameters": {"type": "object"}, "strict": false},
			{"type": "custom", "name": "patch"}, {"type": "file_search", "vector_store_ids": ["v"]},
			{"type": "web_search", "filters": {"allowed_domains": ["a.com"]}}],
		"tool_choice": {"type": "allowed_tools", "mode": "auto", "tools": [{"type": "function", "name": "f"}]},
		"input": [
			{"role": "developer", "content": "dev"},
			{"type": "message", "role": "user", "content": [{"type": "input_text", "text": "hi"},
				{"type": "input_image", "file_id": "file_1"}]},
			{"type": "reasoning", "id": "rs", "summary": [], "encrypted_content": "gAAA"},
			{"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "a", "annotations": []},
				{"type": "refusal", "refusal": "no"}]},
			{"type": "function_call", "call_id": "c1", "name": "f", "arguments": "{\"a\":1}"},
			{"type": "custom_tool_call", "call_id": "c2", "name": "patch", "input": "diff"},
			{"type": "web_search_call", "id": "ws", "status": "completed"},
			{"type": "function_call_output", "call_id": "c1", "output": [{"type": "input_text", "text": "r"},
				{"type": "input_image", "image_url": "data:image/jpeg;base64,AA"}]},
			{"type": "custom_tool_call_output", "call_id": "c2", "output": "ok"}
		]}`, Options{})
	expectJSON(t, j, map[string]string{
		"system.0.text": "sys", "system.1.text": "dev", "max_tokens": "8192", "!thinking": "",
		"tools.#": "3", "tools.1.input_schema.properties.input.type": "string", "tools.2.allowed_domains.0": "a.com",
		"tool_choice.type": "auto",
		"messages.#":       "3", "messages.0.content.#": "1",
		"messages.1.content.#": "4", "messages.1.content.1.text": "no", "messages.1.content.2.input.a": "1",
		"messages.1.content.3.input.input":                 "diff",
		"messages.2.content.0.content.1.source.media_type": "image/jpeg", "messages.2.content.1.content.0.text": "ok",
	})
	// The input ends in a tool loop: thinking is off.
	expectLosses(t, lost, "other:include", "other:truncation", "other:text.format", "other:text.verbosity",
		"tool:tools[2]", "tool:tool_choice", "reasoning:reasoning.effort", "image:input[1].content[1]", "reasoning:input[2]", "tool:input[6]")
	for _, body := range []string{
		`{"model":"m","previous_response_id":"resp_1","input":"x"}`,
		`{"model":"m","background":true,"input":"x"}`,
		`{"model":"m","input":[{"type":"item_reference","id":"msg_1"}]}`,
		`{"model":"m","input":[]}`,
	} {
		if _, _, _, err := canonConvert(t, pResponses, pAnthropic, body, Options{}); err == nil {
			t.Errorf("%s converted", body)
		}
	}
}

func TestAnthropicToChat(t *testing.T) {
	j, ro, lost := mustConvert(t, pAnthropic, pChat, `{
		"model": "m", "max_tokens": 100, "stream": true, "top_k": 5, "stop_sequences": ["a", "b", "c", "d", "e"],
		"metadata": {"user_id": "u"}, "thinking": {"type": "enabled", "budget_tokens": 10000},
		"system": [{"type": "text", "text": "s1", "cache_control": {"type": "ephemeral"}}, {"type": "text", "text": "s2"}],
		"tools": [{"name": "f", "input_schema": {"type": "object"}, "cache_control": {"type": "ephemeral"}},
			{"type": "bash_20250124", "name": "bash"}, {"type": "web_search_20250305", "name": "web_search", "max_uses": 3,
			"user_location": {"type": "approximate", "city": "Oslo"}}],
		"tool_choice": {"type": "any", "disable_parallel_tool_use": true},
		"messages": [
			{"role": "user", "content": [{"type": "text", "text": "q", "cache_control": {"type": "ephemeral"}},
				{"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AA"}},
				{"type": "document", "source": {"type": "text", "media_type": "text/plain", "data": "doc"}}]},
			{"role": "assistant", "content": [{"type": "thinking", "thinking": "t", "signature": "sig"},
				{"type": "text", "text": "calling"}, {"type": "tool_use", "id": "toolu_1", "name": "f", "input": {"n": 9007199254740993}},
				{"type": "server_tool_use", "id": "srv", "name": "web_search", "input": {}}]},
			{"role": "user", "content": [{"type": "tool_result", "tool_use_id": "toolu_1", "is_error": true,
				"content": [{"type": "text", "text": "bad"}, {"type": "image", "source": {"type": "url", "url": "https://x/p.png"}}]},
				{"type": "text", "text": "and?"}]}
		]}`, Options{})
	expectJSON(t, j, map[string]string{
		"max_tokens": "100", "stream": "true", "stream_options.include_usage": "true", "stop.#": "4", "user": "u",
		"reasoning_effort": "high", "tools.#": "1", "tools.0.function.name": "f", "web_search_options.user_location.approximate.city": "Oslo",
		"tool_choice": "required", "parallel_tool_calls": "false",
		"messages.#": "6", "messages.0.role": "system", "messages.0.content": "s1\n\ns2",
		"messages.1.content.0.cache_control.type": "ephemeral", "messages.1.content.1.image_url.url": "data:image/png;base64,AA",
		"messages.1.content.2.text": "doc",
		"messages.2.content":        "calling", "messages.2.tool_calls.0.id": "toolu_1",
		"messages.3.role": "tool", "messages.3.content": "bad",
		"messages.4.role": "user", "messages.4.content.1.image_url.url": "https://x/p.png",
		"messages.5.content": "and?",
	})
	if !strings.Contains(j.Get("messages.2.tool_calls.0.function.arguments").String(), "9007199254740993") {
		t.Errorf("arguments: %s", j.Raw)
	}
	if ro.includeUsage {
		t.Error("include_usage is a chat client option")
	}
	expectLosses(t, lost, "other:top_k", "other:stop_sequences", "other:system[0].cache_control", "other:tools[0].cache_control",
		"tool:tools[1]", "other:tools[2].max_uses", "reasoning:messages[1].content[0]", "tool:messages[1].content[3]",
		"other:messages[2].content[0].is_error", "other:messages[2].content[0].content[1]")
}

func TestAnthropicToResponses(t *testing.T) {
	j, _, lost := mustConvert(t, pAnthropic, pResponses, `{
		"model": "m", "max_tokens": 8, "system": "sys", "stop_sequences": ["x"], "service_tier": "standard_only",
		"output_config": {"effort": "max", "format": {"type": "json_schema", "schema": {"type": "object"}}},
		"messages": [
			{"role": "user", "content": [{"type": "document", "title": "f.pdf", "source": {"type": "base64", "media_type": "application/pdf", "data": "JV"}}]},
			{"role": "assistant", "content": [{"type": "redacted_thinking", "data": "x"}, {"type": "tool_use", "id": "t1", "name": "f", "input": {}}]},
			{"role": "user", "content": [{"type": "tool_result", "tool_use_id": "t1", "content": "fine"}]}
		]}`, Options{})
	expectJSON(t, j, map[string]string{
		"store": "false", "max_output_tokens": "16", "instructions": "sys", "service_tier": "default",
		"reasoning.effort": "xhigh", "reasoning.summary": "auto", "text.format.type": "json_schema", "text.format.strict": "true",
		"input.#": "3", "input.0.content.0.type": "input_file", "input.0.content.0.file_data": "data:application/pdf;base64,JV",
		"input.0.content.0.filename": "f.pdf", "input.1.type": "function_call", "input.1.arguments": "{}",
		"input.2.type": "function_call_output", "input.2.output": "fine",
	})
	expectLosses(t, lost, "other:max_tokens", "other:stop_sequences", "reasoning:messages[1].content[0]")
}

func TestResponsesToChat(t *testing.T) {
	j, _, lost := mustConvert(t, pResponses, pChat, `{
		"model": "m", "instructions": "sys", "max_output_tokens": 50, "prompt_cache_key": "k", "prompt_cache_retention": "24h",
		"reasoning": {"effort": "low", "summary": "detailed"}, "top_logprobs": 2, "stream": true,
		"text": {"format": {"type": "json_schema", "name": "o", "schema": {"type": "object"}, "strict": true}},
		"tools": [{"type": "custom", "name": "patch", "format": {"type": "grammar", "syntax": "lark", "definition": "d"}},
			{"type": "web_search", "search_context_size": "high"}],
		"tool_choice": {"type": "custom", "name": "patch"},
		"input": [
			{"role": "user", "content": [{"type": "input_text", "text": "hi", "prompt_cache_breakpoint": {"mode": "explicit"}}]},
			{"type": "message", "role": "assistant", "content": [{"type": "output_text", "text": "a"}]},
			{"type": "function_call", "call_id": "c1", "name": "f", "arguments": "{}"},
			{"type": "custom_tool_call", "call_id": "c2", "name": "patch", "input": "x"},
			{"type": "function_call_output", "call_id": "c1", "output": "r1"},
			{"type": "custom_tool_call_output", "call_id": "c2", "output": [{"type": "input_text", "text": "r2"}, {"type": "input_image", "image_url": "https://i"}]},
			{"type": "reasoning", "summary": []},
			{"role": "developer", "content": "late"}
		]}`, Options{})
	expectJSON(t, j, map[string]string{
		"max_completion_tokens": "50", "prompt_cache_key": "k", "prompt_cache_retention": "24h", "reasoning_effort": "low",
		"logprobs": "true", "top_logprobs": "2", "stream_options.include_usage": "true",
		"response_format.type": "json_schema", "response_format.json_schema.name": "o",
		"tools.0.type": "custom", "tools.0.custom.format.grammar.syntax": "lark",
		"web_search_options.search_context_size": "high", "tool_choice.type": "custom", "tool_choice.custom.name": "patch",
		"messages.#": "7", "messages.0.content": "sys", "messages.1.content.0.prompt_cache_breakpoint.mode": "explicit",
		"messages.2.content": "a", "messages.2.tool_calls.#": "2", "messages.2.tool_calls.1.custom.input": "x",
		"messages.3.tool_call_id": "c1", "messages.4.content": "r2", "messages.5.role": "user",
		"messages.5.content.1.image_url.url": "https://i", "messages.6.role": "developer",
	})
	expectLosses(t, lost, "other:reasoning.summary", "reasoning:input[6]", "other:input[5].output[1]")
}
