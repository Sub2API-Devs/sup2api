package convert

import (
	"encoding/json"
	"errors"
	"slices"
	"strings"
	"testing"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
)

func chatResponsesPrepared(t *testing.T, body string) (*chatResponses, string) {
	t.Helper()
	conv, out, err := Prepare(&chatResponses{}, []byte(body))
	if err != nil {
		t.Fatalf("prepare %s: %v", body, err)
	}
	return conv.(*chatResponses), string(out)
}

func TestChatResponsesRegistered(t *testing.T) {
	c, ok := Default().Lookup("openai.chat", "openai.responses")
	if !ok || c.From() != "openai.chat" || c.To() != "openai.responses" {
		t.Fatal("openai.chat -> openai.responses is not a built-in pair")
	}
}

func TestChatResponsesRequestMapping(t *testing.T) {
	_, out := chatResponsesPrepared(t, `{
		"model": "gpt-5", "stream": true, "stream_options": {"include_usage": true},
		"temperature": 0.5, "top_p": 0.9, "max_completion_tokens": 300, "max_tokens": 300,
		"n": 1, "logprobs": false, "presence_penalty": 0, "frequency_penalty": 0, "logit_bias": {}, "stop": null,
		"parallel_tool_calls": false, "service_tier": "priority", "user": "u1", "safety_identifier": "s1",
		"prompt_cache_key": "k1", "metadata": {"a": "b"}, "reasoning_effort": "high", "verbosity": "low",
		"response_format": {"type": "json_schema", "json_schema": {"name": "out", "description": "d", "schema": {"type": "object"}, "strict": true}},
		"tools": [
			{"type": "function", "function": {"name": "get", "description": "fetch", "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}}},
			{"type": "function", "function": {"name": "now", "strict": true}}
		],
		"tool_choice": {"type": "function", "function": {"name": "get"}},
		"messages": [
			{"role": "system", "content": "be brief"},
			{"role": "developer", "content": [{"type": "text", "text": "use tools"}]},
			{"role": "user", "content": [{"type": "text", "text": "look"}, {"type": "image_url", "image_url": {"url": "https://x/i.png"}},
				{"type": "image_url", "image_url": {"url": "data:image/png;base64,AA", "detail": "low"}},
				{"type": "file", "file": {"file_id": "file_1"}}]},
			{"role": "assistant", "content": "calling", "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "get", "arguments": "{\"q\":\"x\"}"}}]},
			{"role": "tool", "tool_call_id": "call_1", "content": "result"},
			{"role": "tool", "tool_call_id": "call_2", "content": [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}]},
			{"role": "assistant", "content": null, "tool_calls": [{"id": "call_3", "type": "function", "function": {"name": "now", "arguments": "{}"}}]},
			{"role": "system", "content": "late note"},
			{"role": "user", "content": "thanks"}
		]}`)
	j := gjson.Parse(out)
	for path, want := range map[string]string{
		"model": "gpt-5", "stream": "true", "store": "false", "temperature": "0.5", "top_p": "0.9",
		"max_output_tokens": "300", "parallel_tool_calls": "false", "service_tier": "priority", "user": "u1",
		"safety_identifier": "s1", "prompt_cache_key": "k1", "metadata.a": "b", "reasoning.effort": "high",
		"text.verbosity": "low", "text.format.type": "json_schema", "text.format.name": "out", "text.format.description": "d",
		"text.format.schema.type": "object", "text.format.strict": "true",
		"tools.0.type": "function", "tools.0.name": "get", "tools.0.description": "fetch", "tools.0.strict": "false",
		"tools.0.parameters.properties.q.type": "string",
		"tools.1.name":                         "now", "tools.1.strict": "true", "tools.1.parameters.type": "object",
		"tool_choice.type": "function", "tool_choice.name": "get",
		"instructions": "be brief\n\nuse tools",
		"input.#":      "8",
		"input.0.role": "user", "input.0.content.0.type": "input_text", "input.0.content.0.text": "look",
		"input.0.content.1.type": "input_image", "input.0.content.1.image_url": "https://x/i.png", "input.0.content.1.detail": "auto",
		"input.0.content.2.detail": "low", "input.0.content.3.type": "input_file", "input.0.content.3.file_id": "file_1",
		"input.1.type": "message", "input.1.role": "assistant", "input.1.content.0.type": "output_text", "input.1.content.0.text": "calling",
		"input.2.type": "function_call", "input.2.call_id": "call_1", "input.2.name": "get", "input.2.arguments": `{"q":"x"}`,
		"input.3.type": "function_call_output", "input.3.call_id": "call_1", "input.3.output": "result",
		"input.4.output.1.type": "input_text", "input.4.output.1.text": "b",
		"input.5.type": "function_call", "input.5.call_id": "call_3",
		"input.6.role": "system", "input.6.content.0.text": "late note",
		"input.7.role": "user", "input.7.content.0.text": "thanks",
	} {
		if got := j.Get(path).String(); got != want {
			t.Errorf("%s = %q, want %q", path, got, want)
		}
	}
	for _, absent := range []string{"messages", "stream_options", "max_tokens", "max_completion_tokens", "n", "logprobs",
		"presence_penalty", "frequency_penalty", "logit_bias", "stop", "response_format", "reasoning_effort", "verbosity"} {
		if j.Get(absent).Exists() {
			t.Errorf("%s left in the Responses request", absent)
		}
	}
}

func TestChatResponsesRequestDefaults(t *testing.T) {
	_, out := chatResponsesPrepared(t, `{"model":"m","messages":[{"role":"user","content":"hi"}],"store":true,"response_format":{"type":"json_object"},
		"tool_choice":"required","stream_options":{"include_obfuscation":false}}`)
	j := gjson.Parse(out)
	if j.Get("store").Raw != "true" || j.Get("text.format.type").String() != "json_object" || j.Get("tool_choice").String() != "required" ||
		j.Get("instructions").Exists() || j.Get("stream").Exists() || j.Get("max_output_tokens").Exists() ||
		j.Get("stream_options.include_obfuscation").Raw != "false" {
		t.Fatalf("defaults: %s", out)
	}
}

func TestChatResponsesRequestRejections(t *testing.T) {
	base := func(extra string) string {
		return `{"model":"m","messages":[{"role":"user","content":"hi"}]` + extra + `}`
	}
	for _, tc := range []struct{ body, path string }{
		{base(`,"n":2`), "n"},
		{base(`,"logprobs":true`), "logprobs"},
		{base(`,"top_logprobs":3`), "top_logprobs"},
		{base(`,"logit_bias":{"50256":-100}`), "logit_bias"},
		{base(`,"presence_penalty":0.5`), "presence_penalty"},
		{base(`,"frequency_penalty":-1`), "frequency_penalty"},
		{base(`,"stop":["\n"]`), "stop"},
		{base(`,"seed":7`), "seed"},
		{base(`,"functions":[{"name":"f"}]`), "functions"},
		{base(`,"function_call":"auto"`), "function_call"},
		{base(`,"audio":{"voice":"x"}`), "audio"},
		{base(`,"modalities":["text","audio"]`), "modalities"},
		{base(`,"prediction":{"type":"content","content":"x"}`), "prediction"},
		{base(`,"web_search_options":{}`), "web_search_options"},
		{base(`,"made_up":1`), "made_up"},
		{base(`,"max_tokens":10,"max_completion_tokens":20`), "max_tokens"},
		{base(`,"max_tokens":0`), "max_tokens"},
		{base(`,"stream_options":{"other":true}`), "stream_options.other"},
		{base(`,"tools":[{"type":"custom","custom":{"name":"c"}}]`), "tools[0].type"},
		{base(`,"tools":[{"type":"function","function":{"name":"f","extra":1}}]`), "tools[0].function.extra"},
		{base(`,"tool_choice":{"type":"allowed_tools","allowed_tools":{}}`), "tool_choice.type"},
		{base(`,"response_format":{"type":"grammar"}`), "response_format.type"},
		{`{"model":"m","messages":[]}`, "messages"},
		{`{"messages":[{"role":"user","content":"hi"}]}`, "model"},
		{`{"model":"m","messages":[{"role":"user","name":"bob","content":"hi"}]}`, "messages[0].name"},
		{`{"model":"m","messages":[{"role":"function","name":"f","content":"x"}]}`, "messages[0].name"},
		{`{"model":"m","messages":[{"role":"function","content":"x"}]}`, "messages[0].role"},
		{`{"model":"m","messages":[{"role":"user","content":[{"type":"input_audio","input_audio":{}}]}]}`, "messages[0].content[0].type"},
		{`{"model":"m","messages":[{"role":"user","content":[{"type":"image_url","image_url":{"url":"u","detail":"max"}}]}]}`, "messages[0].content[0].image_url.detail"},
		{`{"model":"m","messages":[{"role":"system","content":[{"type":"image_url","image_url":{"url":"u"}}]}]}`, "messages[0].content[0].type"},
		{`{"model":"m","messages":[{"role":"assistant","refusal":"no"}]}`, "messages[0].refusal"},
		{`{"model":"m","messages":[{"role":"assistant","content":"x","audio":{"id":"a"}}]}`, "messages[0].audio"},
		{`{"model":"m","messages":[{"role":"assistant"}]}`, "messages[0]"},
		{`{"model":"m","messages":[{"role":"tool","content":"x"}]}`, "messages[0].tool_call_id"},
	} {
		_, _, err := Prepare(&chatResponses{}, []byte(tc.body))
		var re *RequestError
		var ce *conversionError
		if !errors.As(err, &re) || !errors.As(err, &ce) || ce.path != tc.path {
			t.Errorf("%s: err = %v, want a request error at %s", tc.body, err, tc.path)
		}
	}
}

func TestChatResponsesJSON(t *testing.T) {
	c, _ := chatResponsesPrepared(t, `{"model":"m","messages":[{"role":"user","content":"hi"}]}`)
	out, err := c.Response([]byte(`{"id":"resp_1","object":"response","created_at":1700000000,"model":"gpt-5","status":"completed","service_tier":"default",
		"output":[{"type":"reasoning","id":"rs","summary":[]},
			{"type":"message","role":"assistant","content":[{"type":"output_text","text":"Hello ","annotations":[{"type":"url_citation","start_index":0,"end_index":5,"url":"https://a","title":"A"}]},{"type":"output_text","text":"world"}]},
			{"type":"function_call","call_id":"call_9","name":"get","arguments":"{}"}],
		"usage":{"input_tokens":12,"output_tokens":5,"total_tokens":17,"input_tokens_details":{"cached_tokens":3},"output_tokens_details":{"reasoning_tokens":2}}}`))
	if err != nil {
		t.Fatal(err)
	}
	j := gjson.ParseBytes(out)
	for path, want := range map[string]string{
		"id": "resp_1", "object": "chat.completion", "created": "1700000000", "model": "gpt-5", "service_tier": "default",
		"choices.0.index": "0", "choices.0.finish_reason": "tool_calls", "choices.0.message.role": "assistant",
		"choices.0.message.content": "Hello world", "choices.0.message.tool_calls.0.id": "call_9",
		"choices.0.message.tool_calls.0.type": "function", "choices.0.message.tool_calls.0.function.name": "get",
		"choices.0.message.tool_calls.0.function.arguments": "{}",
		"choices.0.message.annotations.0.type":              "url_citation", "choices.0.message.annotations.0.url_citation.url": "https://a",
		"choices.0.message.annotations.0.url_citation.end_index": "5",
		"usage.prompt_tokens": "12", "usage.completion_tokens": "5", "usage.total_tokens": "17",
		"usage.prompt_tokens_details.cached_tokens": "3", "usage.completion_tokens_details.reasoning_tokens": "2",
	} {
		if got := j.Get(path).String(); got != want {
			t.Errorf("%s = %q, want %q", path, got, want)
		}
	}
	if j.Get("choices.0.message.refusal").Type != gjson.Null {
		t.Errorf("refusal: %s", out)
	}

	for _, tc := range []struct{ body, finish string }{
		{`{"status":"completed","output":[{"type":"message","content":[{"type":"refusal","refusal":"no"}]}]}`, "stop"},
		{`{"status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"output":[]}`, "length"},
		{`{"status":"incomplete","incomplete_details":{"reason":"content_filter"},"output":[]}`, "content_filter"},
	} {
		out, err := c.Response([]byte(tc.body))
		if err != nil || gjson.GetBytes(out, "choices.0.finish_reason").String() != tc.finish {
			t.Errorf("%s: %s %v", tc.body, out, err)
		}
	}
	for _, bad := range []string{
		`{"status":"failed","output":[]}`,
		`{"status":"completed","output":[{"type":"web_search_call"}]}`,
		`{"status":"completed","output":[{"type":"message","content":[{"type":"output_audio"}]}]}`,
		`{"status":"incomplete","incomplete_details":{"reason":"other"}}`,
	} {
		if _, err := c.Response([]byte(bad)); err == nil {
			t.Errorf("%s converted", bad)
		}
	}
	if _, err := (&chatResponses{}).Response([]byte(`{}`)); !errors.Is(err, errUnprepared) {
		t.Errorf("unprepared converter: %v", err)
	}
}

func chatStreamRun(t *testing.T, c *chatResponses, events ...string) ([]string, error) {
	t.Helper()
	s := c.NewStream()
	var out []string
	for _, e := range events {
		name := gjson.Get(e, "type").String()
		evs, err := s.Event(Event{Name: name, Data: []byte(e)})
		if err != nil {
			return out, err
		}
		for _, ev := range evs {
			out = append(out, string(ev.Data))
		}
	}
	evs, err := s.Flush()
	for _, ev := range evs {
		out = append(out, string(ev.Data))
	}
	return out, err
}

func TestChatResponsesStream(t *testing.T) {
	c, _ := chatResponsesPrepared(t, `{"model":"m","stream":true,"stream_options":{"include_usage":true},"messages":[{"role":"user","content":"hi"}]}`)
	out, err := chatStreamRun(t, c,
		`{"type":"response.created","response":{"id":"resp_1","model":"gpt-5","created_at":1700000000,"status":"in_progress","output":[]}}`,
		`{"type":"response.in_progress","response":{}}`,
		`{"type":"response.output_item.added","output_index":0,"item":{"type":"reasoning","id":"rs"}}`,
		`{"type":"response.reasoning_summary_text.delta","output_index":0,"delta":"thinking"}`,
		`{"type":"response.output_item.added","output_index":1,"item":{"type":"message","role":"assistant","content":[]}}`,
		`{"type":"response.output_text.delta","output_index":1,"content_index":0,"delta":"Hel"}`,
		`{"type":"response.output_text.delta","output_index":1,"content_index":0,"delta":"lo"}`,
		`{"type":"response.output_text.done","output_index":1,"content_index":0,"text":"Hello"}`,
		`{"type":"response.output_item.added","output_index":2,"item":{"type":"function_call","call_id":"call_1","name":"get","arguments":""}}`,
		`{"type":"response.function_call_arguments.delta","output_index":2,"delta":"{\"q\":"}`,
		`{"type":"response.function_call_arguments.done","output_index":2,"arguments":"{\"q\":1}"}`,
		`{"type":"response.output_item.done","output_index":2,"item":{"type":"function_call","call_id":"call_1","name":"get","arguments":"{\"q\":1}"}}`,
		`{"type":"response.output_item.added","output_index":3,"item":{"type":"function_call","call_id":"call_2","name":"now","arguments":""}}`,
		`{"type":"response.output_item.done","output_index":3,"item":{"type":"function_call","call_id":"call_2","name":"now","arguments":"{}"}}`,
		`{"type":"codex.rate_limits","primary":{}}`,
		`{"type":"response.completed","response":{"id":"resp_1","model":"gpt-5","status":"completed","usage":{"input_tokens":12,"output_tokens":5,"total_tokens":17,"input_tokens_details":{"cached_tokens":3}}}}`,
	)
	if err != nil {
		t.Fatalf("stream: %v (%v)", err, out)
	}
	want := []string{
		`choices.0.delta.role=assistant`,
		`choices.0.delta.content=Hel`,
		`choices.0.delta.content=lo`,
		`choices.0.delta.tool_calls.0.id=call_1`,
		`choices.0.delta.tool_calls.0.function.arguments={"q":`,
		`choices.0.delta.tool_calls.0.function.arguments=1}`,
		`choices.0.delta.tool_calls.0.index=1`,
		`choices.0.delta.tool_calls.0.function.arguments={}`,
		`choices.0.finish_reason=tool_calls`,
		`usage.prompt_tokens=12`,
	}
	if len(out) != len(want)+1 || out[len(out)-1] != "[DONE]" {
		t.Fatalf("chunks:\n%s", strings.Join(out, "\n"))
	}
	for i, w := range want {
		k, v, _ := strings.Cut(w, "=")
		if got := gjson.Get(out[i], k).String(); got != v {
			t.Errorf("chunk %d %s = %q, want %q\n%s", i, k, got, v, out[i])
		}
		if gjson.Get(out[i], "id").String() != "resp_1" || gjson.Get(out[i], "object").String() != "chat.completion.chunk" ||
			gjson.Get(out[i], "model").String() != "gpt-5" {
			t.Errorf("chunk %d identity: %s", i, out[i])
		}
	}
	if gjson.Get(out[9], "choices.#").Int() != 0 || gjson.Get(out[9], "usage.prompt_tokens_details.cached_tokens").Int() != 3 ||
		gjson.Get(out[1], "usage").Type != gjson.Null || !gjson.Get(out[1], "usage").Exists() {
		t.Errorf("usage chunks: %s / %s", out[9], out[1])
	}

	// Without include_usage: no usage chunk and no usage field; length.
	c, _ = chatResponsesPrepared(t, `{"model":"m","stream":true,"messages":[{"role":"user","content":"hi"}]}`)
	out, err = chatStreamRun(t, c,
		`{"type":"response.output_text.delta","output_index":0,"delta":"x"}`,
		`{"type":"response.incomplete","response":{"status":"incomplete","incomplete_details":{"reason":"max_output_tokens"},"usage":{"input_tokens":1,"output_tokens":1}}}`)
	if err != nil || len(out) != 4 || gjson.Get(out[2], "choices.0.finish_reason").String() != "length" || gjson.Get(out[2], "usage").Exists() {
		t.Fatalf("incomplete stream: %v %v", out, err)
	}

	// A failed response ends the stream with an error chunk; Flush reports it.
	out, err = chatStreamRun(t, c,
		`{"type":"response.output_text.delta","output_index":0,"delta":"x"}`,
		`{"type":"response.failed","response":{"status":"failed","error":{"code":"server_error","message":"boom"}}}`)
	if err == nil || len(out) != 3 || gjson.Get(out[2], "error.message").String() != "boom" {
		t.Fatalf("failed stream: %v %v", out, err)
	}
	// So does a truncated stream.
	if _, err = chatStreamRun(t, c, `{"type":"response.output_text.delta","output_index":0,"delta":"x"}`); err == nil {
		t.Fatal("truncated stream flushed cleanly")
	}
	// Output items without a chat equivalent are refused.
	if _, err = chatStreamRun(t, c, `{"type":"response.output_item.added","output_index":0,"item":{"type":"web_search_call"}}`); err == nil {
		t.Fatal("web_search_call converted")
	}
	// Final arguments must extend the streamed ones.
	_, err = chatStreamRun(t, c,
		`{"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"c","name":"f","arguments":""}}`,
		`{"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\"a\""}`,
		`{"type":"response.function_call_arguments.done","output_index":0,"arguments":"{\"b\":1}"}`)
	if err == nil {
		t.Fatal("diverging arguments accepted")
	}
}

// The request conversion keeps JSON numbers exactly as sent.
func TestChatResponsesNumbersVerbatim(t *testing.T) {
	_, out := chatResponsesPrepared(t, `{"model":"m","temperature":0.30000000000000004,"messages":[{"role":"user","content":"hi"}]}`)
	var v map[string]json.RawMessage
	_ = json.Unmarshal([]byte(out), &v)
	if string(v["temperature"]) != "0.30000000000000004" {
		t.Fatalf("temperature = %s", v["temperature"])
	}
}

// sdk/manifest/check keeps its own list of same-platform pairs for the
// hostCompat floor (CONTRACTS §83.4); it must name every built-in one.
func TestSamePlatformPairsKnownToManifestCheck(t *testing.T) {
	for _, pair := range Default().Pairs() {
		from, _, _ := strings.Cut(pair[0], ".")
		to, _, _ := strings.Cut(pair[1], ".")
		if from != to {
			continue
		}
		if !slices.Contains(check.SamePlatformConversions, pair) {
			t.Errorf("%s -> %s missing from check.SamePlatformConversions", pair[0], pair[1])
		}
	}
}
