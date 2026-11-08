package convert

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
)

// chatResponses serves an openai.chat client with an openai.responses
// upstream (CONTRACTS §83.2). Like the other built-in pairs it is strict: a
// request field is mapped only when the Responses API has an exact
// equivalent, a field whose value would change the answer and has none is
// rejected (400 unsupported_conversion), and an explicit value equal to the
// Chat Completions default (n: 1, logprobs: false, a zero penalty, ...) is
// accepted because leaving it out means the same.
//
// The registry entry is stateless; Prepare returns a per-request copy that
// remembers what the response conversion needs (stream_options.include_usage).
type chatResponses struct {
	includeUsage bool
	prepared     bool
}

func (c *chatResponses) From() string { return "openai.chat" }
func (c *chatResponses) To() string   { return "openai.responses" }

func (c *chatResponses) Prepare(body []byte) (Converter, []byte, error) {
	p := &chatResponses{prepared: true}
	out, err := p.request(body)
	if err != nil {
		return nil, nil, &RequestError{Cause: err}
	}
	return p, out, nil
}

func (c *chatResponses) Request(body []byte) ([]byte, error) {
	_, out, err := c.Prepare(body)
	return out, err
}

// ---------------------------------------------------------------- helpers

type jobject = map[string]any

// conversionError names the offending request or response path.
type conversionError struct{ path, reason string }

func (e *conversionError) Error() string {
	return "unsupported_conversion: " + e.path + ": " + e.reason
}

func cfail(path, reason string) error { return &conversionError{path, reason} }

func decodeJObject(raw []byte, path string) (jobject, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	if err := dec.Decode(&v); err != nil {
		return nil, cfail(path, "invalid JSON")
	}
	if dec.Decode(new(any)) != io.EOF {
		return nil, cfail(path, "multiple JSON values")
	}
	o, ok := v.(map[string]any)
	if !ok || o == nil {
		return nil, cfail(path, "expected object")
	}
	return o, nil
}

func jobj(v any, path string) (jobject, error) {
	o, ok := v.(map[string]any)
	if !ok || o == nil {
		return nil, cfail(path, "expected object")
	}
	return o, nil
}

func jlist(v any, path string) ([]any, error) {
	a, ok := v.([]any)
	if !ok {
		return nil, cfail(path, "expected array")
	}
	return a, nil
}

func jstr(v any, path string) (string, error) {
	s, ok := v.(string)
	if !ok {
		return "", cfail(path, "expected string")
	}
	return s, nil
}

func jnonempty(v any, path string) (string, error) {
	s, err := jstr(v, path)
	if err == nil && s == "" {
		err = cfail(path, "expected nonempty string")
	}
	return s, err
}

func jbool(v any, path string) (bool, error) {
	b, ok := v.(bool)
	if !ok {
		return false, cfail(path, "expected boolean")
	}
	return b, nil
}

func jnumber(v any, path string) (json.Number, error) {
	n, ok := v.(json.Number)
	if !ok {
		return "", cfail(path, "expected number")
	}
	return n, nil
}

func jint(v any, path string, min, max int64) (int64, error) {
	n, ok := v.(json.Number)
	if !ok {
		return 0, cfail(path, "expected integer")
	}
	i, err := strconv.ParseInt(string(n), 10, 64)
	if err != nil || i < min || i > max {
		return 0, cfail(path, "integer out of range")
	}
	return i, nil
}

// onlyKeys rejects any key of o that is not listed.
func onlyKeys(o jobject, path string, names ...string) error {
	for k := range o {
		ok := false
		for _, n := range names {
			ok = ok || k == n
		}
		if !ok {
			return cfail(path+"."+k, "field has no verified equivalent")
		}
	}
	return nil
}

func jpos(path string, i int) string { return fmt.Sprintf("%s[%d]", path, i) }

// isZero reports a JSON number equal to zero.
func isZero(v any) bool {
	n, ok := v.(json.Number)
	if !ok {
		return false
	}
	f, err := strconv.ParseFloat(string(n), 64)
	return err == nil && f == 0
}

// ---------------------------------------------------------------- request

// chatRejected are Chat Completions fields without a Responses equivalent,
// with the default value that may still be sent explicitly (nil: none).
var chatRejected = map[string]struct {
	reason  string
	neutral func(any) bool
}{
	"n":                  {"only one completion has an equivalent", func(v any) bool { i, err := jint(v, "", 1, 1); return err == nil && i == 1 }},
	"logprobs":           {"token log probabilities are not converted", func(v any) bool { return v == false }},
	"top_logprobs":       {"token log probabilities are not converted", isZero},
	"logit_bias":         {"Responses has no logit bias", func(v any) bool { o, ok := v.(map[string]any); return ok && len(o) == 0 }},
	"presence_penalty":   {"Responses has no presence penalty", isZero},
	"frequency_penalty":  {"Responses has no frequency penalty", isZero},
	"stop":               {"Responses has no stop sequences", nil},
	"seed":               {"Responses has no seed", nil},
	"functions":          {"legacy function calling is not converted; use tools", nil},
	"function_call":      {"legacy function calling is not converted; use tool_choice", nil},
	"audio":              {"audio output is not converted", nil},
	"prediction":         {"predicted outputs have no Responses equivalent", nil},
	"web_search_options": {"web search is a different tool in Responses and is not converted", nil},
	"modalities": {"only text output is converted", func(v any) bool {
		a, ok := v.([]any)
		return ok && len(a) == 1 && a[0] == "text"
	}},
}

// chatPassThrough are fields with the same name, type and meaning in both
// APIs; the value is checked for its JSON type only.
var chatPassThrough = map[string]string{
	"temperature":            "number",
	"top_p":                  "number",
	"parallel_tool_calls":    "boolean",
	"service_tier":           "string",
	"user":                   "string",
	"safety_identifier":      "string",
	"prompt_cache_key":       "string",
	"prompt_cache_retention": "string",
	"metadata":               "object",
	"store":                  "boolean",
	"stream":                 "boolean",
}

func (p *chatResponses) request(raw []byte) ([]byte, error) {
	in, err := decodeJObject(raw, "request")
	if err != nil {
		return nil, err
	}
	// An explicit null means "not set" for every optional field.
	for k, v := range in {
		if v == nil {
			delete(in, k)
		}
	}
	out := jobject{}
	for k, v := range in {
		switch k {
		case "model", "messages", "max_tokens", "max_completion_tokens", "stream_options", "tools", "tool_choice",
			"response_format", "reasoning_effort", "verbosity":
			continue
		}
		if r, ok := chatRejected[k]; ok {
			if r.neutral != nil && r.neutral(v) {
				continue
			}
			return nil, cfail(k, r.reason)
		}
		typ, ok := chatPassThrough[k]
		if !ok {
			return nil, cfail(k, "field has no verified equivalent")
		}
		switch typ {
		case "number":
			_, err = jnumber(v, k)
		case "boolean":
			_, err = jbool(v, k)
		case "string":
			_, err = jstr(v, k)
		case "object":
			_, err = jobj(v, k)
		}
		if err != nil {
			return nil, err
		}
		out[k] = v
	}
	// Chat Completions does not store by default; Responses does.
	if _, ok := out["store"]; !ok {
		out["store"] = false
	}
	if out["model"], err = jnonempty(in["model"], "model"); err != nil {
		return nil, err
	}
	if err = p.maxTokens(in, out); err != nil {
		return nil, err
	}
	if err = p.streamOptions(in, out); err != nil {
		return nil, err
	}
	if err = chatTools(in, out); err != nil {
		return nil, err
	}
	if err = chatTextControls(in, out); err != nil {
		return nil, err
	}
	if v, ok := in["reasoning_effort"]; ok {
		effort, err := jnonempty(v, "reasoning_effort")
		if err != nil {
			return nil, err
		}
		out["reasoning"] = jobject{"effort": effort}
	}
	if err = chatMessages(in, out); err != nil {
		return nil, err
	}
	return json.Marshal(out)
}

// maxTokens maps max_completion_tokens (or its deprecated alias max_tokens)
// to max_output_tokens; two different values are rejected, not picked.
func (p *chatResponses) maxTokens(in, out jobject) error {
	a, hasA := in["max_completion_tokens"]
	b, hasB := in["max_tokens"]
	if hasA && hasB {
		x, _ := json.Marshal(a)
		y, _ := json.Marshal(b)
		if !bytes.Equal(x, y) {
			return cfail("max_tokens", "conflicts with max_completion_tokens")
		}
	}
	key, v := "max_completion_tokens", a
	if !hasA {
		key, v = "max_tokens", b
	}
	if !hasA && !hasB {
		return nil
	}
	n, err := jint(v, key, 1, 2147483647)
	if err != nil {
		return err
	}
	out["max_output_tokens"] = n
	return nil
}

func (p *chatResponses) streamOptions(in, out jobject) error {
	v, ok := in["stream_options"]
	if !ok {
		return nil
	}
	o, err := jobj(v, "stream_options")
	if err != nil {
		return err
	}
	if err = onlyKeys(o, "stream_options", "include_usage", "include_obfuscation"); err != nil {
		return err
	}
	if x, ok := o["include_usage"]; ok {
		if p.includeUsage, err = jbool(x, "stream_options.include_usage"); err != nil {
			return err
		}
	}
	if x, ok := o["include_obfuscation"]; ok {
		b, err := jbool(x, "stream_options.include_obfuscation")
		if err != nil {
			return err
		}
		out["stream_options"] = jobject{"include_obfuscation": b}
	}
	return nil
}

// chatTools maps function tools and tool_choice. Chat function tools are not
// strict unless they say so; Responses function tools are strict by
// default, so strict is always written.
func chatTools(in, out jobject) error {
	if v, ok := in["tools"]; ok {
		tools, err := jlist(v, "tools")
		if err != nil {
			return err
		}
		mapped := make([]any, 0, len(tools))
		for i, t := range tools {
			path := jpos("tools", i)
			tool, err := jobj(t, path)
			if err != nil {
				return err
			}
			if tool["type"] != "function" {
				return cfail(path+".type", "only function tools are converted")
			}
			if err = onlyKeys(tool, path, "type", "function"); err != nil {
				return err
			}
			fn, err := jobj(tool["function"], path+".function")
			if err != nil {
				return err
			}
			if err = onlyKeys(fn, path+".function", "name", "description", "parameters", "strict"); err != nil {
				return err
			}
			name, err := jnonempty(fn["name"], path+".function.name")
			if err != nil {
				return err
			}
			o := jobject{"type": "function", "name": name, "strict": false}
			if d, ok := fn["description"]; ok && d != nil {
				if o["description"], err = jstr(d, path+".function.description"); err != nil {
					return err
				}
			}
			// Omitted parameters mean a function without parameters.
			o["parameters"] = jobject{"type": "object", "properties": jobject{}}
			if ps, ok := fn["parameters"]; ok && ps != nil {
				if o["parameters"], err = jobj(ps, path+".function.parameters"); err != nil {
					return err
				}
			}
			if s, ok := fn["strict"]; ok && s != nil {
				if o["strict"], err = jbool(s, path+".function.strict"); err != nil {
					return err
				}
			}
			mapped = append(mapped, o)
		}
		out["tools"] = mapped
	}
	if v, ok := in["tool_choice"]; ok {
		if s, isStr := v.(string); isStr {
			switch s {
			case "none", "auto", "required":
				out["tool_choice"] = s
				return nil
			}
			return cfail("tool_choice", "expected none, auto, required or a function")
		}
		o, err := jobj(v, "tool_choice")
		if err != nil {
			return err
		}
		if o["type"] != "function" {
			return cfail("tool_choice.type", "only a named function choice is converted")
		}
		if err = onlyKeys(o, "tool_choice", "type", "function"); err != nil {
			return err
		}
		fn, err := jobj(o["function"], "tool_choice.function")
		if err != nil {
			return err
		}
		if err = onlyKeys(fn, "tool_choice.function", "name"); err != nil {
			return err
		}
		name, err := jnonempty(fn["name"], "tool_choice.function.name")
		if err != nil {
			return err
		}
		out["tool_choice"] = jobject{"type": "function", "name": name}
	}
	return nil
}

// chatTextControls maps response_format to text.format and verbosity to
// text.verbosity.
func chatTextControls(in, out jobject) error {
	text := jobject{}
	if v, ok := in["verbosity"]; ok {
		s, err := jnonempty(v, "verbosity")
		if err != nil {
			return err
		}
		text["verbosity"] = s
	}
	if v, ok := in["response_format"]; ok {
		rf, err := jobj(v, "response_format")
		if err != nil {
			return err
		}
		switch rf["type"] {
		case "text", "json_object":
			if err = onlyKeys(rf, "response_format", "type"); err != nil {
				return err
			}
			text["format"] = jobject{"type": rf["type"]}
		case "json_schema":
			if err = onlyKeys(rf, "response_format", "type", "json_schema"); err != nil {
				return err
			}
			js, err := jobj(rf["json_schema"], "response_format.json_schema")
			if err != nil {
				return err
			}
			if err = onlyKeys(js, "response_format.json_schema", "name", "description", "schema", "strict"); err != nil {
				return err
			}
			f := jobject{"type": "json_schema"}
			if f["name"], err = jnonempty(js["name"], "response_format.json_schema.name"); err != nil {
				return err
			}
			if d, ok := js["description"]; ok && d != nil {
				if f["description"], err = jstr(d, "response_format.json_schema.description"); err != nil {
					return err
				}
			}
			if s, ok := js["schema"]; ok && s != nil {
				if f["schema"], err = jobj(s, "response_format.json_schema.schema"); err != nil {
					return err
				}
			}
			if s, ok := js["strict"]; ok && s != nil {
				if f["strict"], err = jbool(s, "response_format.json_schema.strict"); err != nil {
					return err
				}
			}
			text["format"] = f
		default:
			return cfail("response_format.type", "expected text, json_object or json_schema")
		}
	}
	if len(text) > 0 {
		out["text"] = text
	}
	return nil
}

// chatMessages maps messages to instructions and input. The system and
// developer messages before the first other message become instructions
// (joined by a blank line); later ones stay input messages of their role.
func chatMessages(in, out jobject) error {
	msgs, err := jlist(in["messages"], "messages")
	if err != nil {
		return err
	}
	if len(msgs) == 0 {
		return cfail("messages", "at least one message is required")
	}
	input := []any{}
	var instructions []string
	leading := true
	for i, m := range msgs {
		path := jpos("messages", i)
		msg, err := jobj(m, path)
		if err != nil {
			return err
		}
		for k, v := range msg {
			if v == nil {
				delete(msg, k)
			}
		}
		role, err := jnonempty(msg["role"], path+".role")
		if err != nil {
			return err
		}
		if _, ok := msg["name"]; ok {
			return cfail(path+".name", "participant names have no Responses equivalent")
		}
		switch role {
		case "system", "developer":
			if err = onlyKeys(msg, path, "role", "content"); err != nil {
				return err
			}
			parts, err := chatTextParts(msg["content"], path+".content")
			if err != nil {
				return err
			}
			if leading {
				var b strings.Builder
				for _, p := range parts {
					b.WriteString(p)
				}
				instructions = append(instructions, b.String())
				continue
			}
			input = append(input, jobject{"type": "message", "role": role, "content": inputText(parts)})
		case "user":
			leading = false
			if err = onlyKeys(msg, path, "role", "content"); err != nil {
				return err
			}
			content, err := chatUserContent(msg["content"], path+".content")
			if err != nil {
				return err
			}
			input = append(input, jobject{"type": "message", "role": "user", "content": content})
		case "assistant":
			leading = false
			items, err := chatAssistant(msg, path)
			if err != nil {
				return err
			}
			input = append(input, items...)
		case "tool":
			leading = false
			if err = onlyKeys(msg, path, "role", "content", "tool_call_id"); err != nil {
				return err
			}
			id, err := jnonempty(msg["tool_call_id"], path+".tool_call_id")
			if err != nil {
				return err
			}
			item := jobject{"type": "function_call_output", "call_id": id}
			if s, ok := msg["content"].(string); ok {
				item["output"] = s
			} else {
				parts, err := chatTextParts(msg["content"], path+".content")
				if err != nil {
					return err
				}
				item["output"] = inputText(parts)
			}
			input = append(input, item)
		default:
			return cfail(path+".role", "role "+strconv.Quote(role)+" is not converted")
		}
	}
	if len(instructions) > 0 {
		out["instructions"] = strings.Join(instructions, "\n\n")
	}
	out["input"] = input
	return nil
}

func inputText(parts []string) []any {
	out := make([]any, 0, len(parts))
	for _, p := range parts {
		out = append(out, jobject{"type": "input_text", "text": p})
	}
	return out
}

// chatTextParts reads a content that is a string or an array of text parts.
func chatTextParts(v any, path string) ([]string, error) {
	if s, ok := v.(string); ok {
		return []string{s}, nil
	}
	parts, err := jlist(v, path)
	if err != nil {
		return nil, cfail(path, "expected string or text parts")
	}
	out := make([]string, 0, len(parts))
	for i, p := range parts {
		pp := jpos(path, i)
		o, err := jobj(p, pp)
		if err != nil {
			return nil, err
		}
		if o["type"] != "text" {
			return nil, cfail(pp+".type", "only text parts are allowed here")
		}
		if err = onlyKeys(o, pp, "type", "text"); err != nil {
			return nil, err
		}
		s, err := jstr(o["text"], pp+".text")
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

// chatUserContent maps user content: text, images and files.
func chatUserContent(v any, path string) ([]any, error) {
	if s, ok := v.(string); ok {
		return inputText([]string{s}), nil
	}
	parts, err := jlist(v, path)
	if err != nil {
		return nil, cfail(path, "expected string or content parts")
	}
	out := make([]any, 0, len(parts))
	for i, p := range parts {
		pp := jpos(path, i)
		o, err := jobj(p, pp)
		if err != nil {
			return nil, err
		}
		switch o["type"] {
		case "text":
			if err = onlyKeys(o, pp, "type", "text"); err != nil {
				return nil, err
			}
			s, err := jstr(o["text"], pp+".text")
			if err != nil {
				return nil, err
			}
			out = append(out, jobject{"type": "input_text", "text": s})
		case "image_url":
			if err = onlyKeys(o, pp, "type", "image_url"); err != nil {
				return nil, err
			}
			img, err := jobj(o["image_url"], pp+".image_url")
			if err != nil {
				return nil, err
			}
			if err = onlyKeys(img, pp+".image_url", "url", "detail"); err != nil {
				return nil, err
			}
			u, err := jnonempty(img["url"], pp+".image_url.url")
			if err != nil {
				return nil, err
			}
			// Chat's default detail is auto; Responses requires it.
			detail := "auto"
			if d, ok := img["detail"]; ok && d != nil {
				if detail, err = jstr(d, pp+".image_url.detail"); err != nil {
					return nil, err
				}
				if detail != "auto" && detail != "low" && detail != "high" {
					return nil, cfail(pp+".image_url.detail", "expected auto, low or high")
				}
			}
			out = append(out, jobject{"type": "input_image", "image_url": u, "detail": detail})
		case "file":
			if err = onlyKeys(o, pp, "type", "file"); err != nil {
				return nil, err
			}
			f, err := jobj(o["file"], pp+".file")
			if err != nil {
				return nil, err
			}
			if err = onlyKeys(f, pp+".file", "file_id", "file_data", "filename"); err != nil {
				return nil, err
			}
			item := jobject{"type": "input_file"}
			for _, k := range []string{"file_id", "file_data", "filename"} {
				if x, ok := f[k]; ok && x != nil {
					if item[k], err = jstr(x, pp+".file."+k); err != nil {
						return nil, err
					}
				}
			}
			if item["file_id"] == nil && item["file_data"] == nil {
				return nil, cfail(pp+".file", "file_id or file_data is required")
			}
			out = append(out, item)
		default:
			return nil, cfail(pp+".type", "content part type is not converted")
		}
	}
	return out, nil
}

// chatAssistant maps an assistant message: its text, then its tool calls.
func chatAssistant(msg jobject, path string) ([]any, error) {
	if err := onlyKeys(msg, path, "role", "content", "tool_calls", "refusal"); err != nil {
		return nil, err
	}
	if r, ok := msg["refusal"]; ok {
		s, err := jstr(r, path+".refusal")
		if err != nil {
			return nil, err
		}
		if s != "" {
			return nil, cfail(path+".refusal", "assistant refusals are not converted")
		}
	}
	var items []any
	if c, ok := msg["content"]; ok {
		parts, err := chatTextParts(c, path+".content")
		if err != nil {
			return nil, err
		}
		var content []any
		for _, p := range parts {
			if p != "" {
				content = append(content, jobject{"type": "output_text", "text": p, "annotations": []any{}})
			}
		}
		if len(content) > 0 {
			items = append(items, jobject{"type": "message", "role": "assistant", "content": content})
		}
	}
	if tc, ok := msg["tool_calls"]; ok {
		calls, err := jlist(tc, path+".tool_calls")
		if err != nil {
			return nil, err
		}
		for i, c := range calls {
			cp := jpos(path+".tool_calls", i)
			call, err := jobj(c, cp)
			if err != nil {
				return nil, err
			}
			if call["type"] != "function" {
				return nil, cfail(cp+".type", "only function calls are converted")
			}
			if err = onlyKeys(call, cp, "id", "type", "function"); err != nil {
				return nil, err
			}
			id, err := jnonempty(call["id"], cp+".id")
			if err != nil {
				return nil, err
			}
			fn, err := jobj(call["function"], cp+".function")
			if err != nil {
				return nil, err
			}
			if err = onlyKeys(fn, cp+".function", "name", "arguments"); err != nil {
				return nil, err
			}
			name, err := jnonempty(fn["name"], cp+".function.name")
			if err != nil {
				return nil, err
			}
			args, err := jstr(fn["arguments"], cp+".function.arguments")
			if err != nil {
				return nil, err
			}
			items = append(items, jobject{"type": "function_call", "call_id": id, "name": name, "arguments": args})
		}
	}
	if len(items) == 0 {
		return nil, cfail(path, "assistant message needs content or tool_calls")
	}
	return items, nil
}

// ---------------------------------------------------------------- response

func (c *chatResponses) Response(body []byte) ([]byte, error) {
	if !c.prepared {
		return nil, errUnprepared
	}
	r, err := decodeJObject(body, "response")
	if err != nil {
		return nil, err
	}
	msg, finish, err := chatMessageFromResponse(r)
	if err != nil {
		return nil, err
	}
	id, _ := r["id"].(string)
	model, _ := r["model"].(string)
	out := jobject{"id": id, "object": "chat.completion", "created": responseCreated(r), "model": model,
		"choices": []any{jobject{"index": 0, "message": msg, "finish_reason": finish, "logprobs": nil}}}
	if u, ok := r["usage"]; ok && u != nil {
		usage, err := chatUsage(u)
		if err != nil {
			return nil, err
		}
		out["usage"] = usage
	}
	if st, ok := r["service_tier"].(string); ok {
		out["service_tier"] = st
	}
	return json.Marshal(out)
}

func responseCreated(r jobject) int64 {
	if n, ok := r["created_at"].(json.Number); ok {
		if i, err := n.Int64(); err == nil {
			return i
		}
	}
	return time.Now().Unix()
}

// chatMessageFromResponse builds the chat message and finish_reason of a
// completed or incomplete response.
func chatMessageFromResponse(r jobject) (jobject, string, error) {
	output := []any{}
	if v, ok := r["output"]; ok && v != nil {
		var err error
		if output, err = jlist(v, "response.output"); err != nil {
			return nil, "", err
		}
	}
	var text, refusal strings.Builder
	hasText, hasRefusal := false, false
	annotations := []any{}
	toolCalls := []any{}
	for i, it := range output {
		path := jpos("response.output", i)
		item, err := jobj(it, path)
		if err != nil {
			return nil, "", err
		}
		switch item["type"] {
		case "message":
			parts, err := jlist(item["content"], path+".content")
			if err != nil {
				return nil, "", err
			}
			for j, p := range parts {
				pp := jpos(path+".content", j)
				part, err := jobj(p, pp)
				if err != nil {
					return nil, "", err
				}
				switch part["type"] {
				case "output_text":
					s, err := jstr(part["text"], pp+".text")
					if err != nil {
						return nil, "", err
					}
					base := len([]rune(text.String()))
					if as, ok := part["annotations"].([]any); ok {
						if len(as) > 0 && base > 0 {
							return nil, "", cfail(pp+".annotations", "annotations of a second text part are not converted")
						}
						for k, a := range as {
							mapped, err := chatAnnotation(a, jpos(pp+".annotations", k), base)
							if err != nil {
								return nil, "", err
							}
							annotations = append(annotations, mapped)
						}
					}
					text.WriteString(s)
					hasText = true
				case "refusal":
					s, err := jstr(part["refusal"], pp+".refusal")
					if err != nil {
						return nil, "", err
					}
					refusal.WriteString(s)
					hasRefusal = true
				default:
					return nil, "", cfail(pp+".type", "message part has no chat equivalent")
				}
			}
		case "function_call":
			id, err := jnonempty(item["call_id"], path+".call_id")
			if err != nil {
				return nil, "", err
			}
			name, err := jnonempty(item["name"], path+".name")
			if err != nil {
				return nil, "", err
			}
			args, err := jstr(item["arguments"], path+".arguments")
			if err != nil {
				return nil, "", err
			}
			toolCalls = append(toolCalls, jobject{"id": id, "type": "function", "function": jobject{"name": name, "arguments": args}})
		case "reasoning":
			// Chat Completions does not return reasoning either.
		default:
			return nil, "", cfail(path+".type", "output item has no chat equivalent")
		}
	}
	finish, err := chatFinish(r, len(toolCalls) > 0)
	if err != nil {
		return nil, "", err
	}
	msg := jobject{"role": "assistant", "content": nil, "refusal": nil}
	if hasText {
		msg["content"] = text.String()
	}
	if hasRefusal {
		msg["refusal"] = refusal.String()
	}
	if len(toolCalls) > 0 {
		msg["tool_calls"] = toolCalls
	}
	if len(annotations) > 0 {
		msg["annotations"] = annotations
	}
	return msg, finish, nil
}

// chatFinish maps the response status to a finish_reason.
func chatFinish(r jobject, tools bool) (string, error) {
	switch r["status"] {
	case "completed", nil:
		if tools {
			return "tool_calls", nil
		}
		return "stop", nil
	case "incomplete":
		reason := ""
		if d, ok := r["incomplete_details"].(map[string]any); ok {
			reason, _ = d["reason"].(string)
		}
		switch reason {
		case "max_output_tokens":
			return "length", nil
		case "content_filter":
			return "content_filter", nil
		}
		return "", cfail("response.incomplete_details.reason", "incomplete reason has no chat equivalent")
	}
	return "", cfail("response.status", "only completed or incomplete responses are converted")
}

// chatAnnotation maps a url_citation; character offsets move by base, the
// length of the text before this part.
func chatAnnotation(v any, path string, base int) (any, error) {
	a, err := jobj(v, path)
	if err != nil {
		return nil, err
	}
	if a["type"] != "url_citation" {
		return nil, cfail(path+".type", "annotation has no chat equivalent")
	}
	c := jobject{}
	for _, k := range []string{"url", "title"} {
		if x, ok := a[k]; ok {
			c[k] = x
		}
	}
	for _, k := range []string{"start_index", "end_index"} {
		n, err := jint(a[k], path+"."+k, 0, 1<<40)
		if err != nil {
			return nil, err
		}
		c[k] = n + int64(base)
	}
	return jobject{"type": "url_citation", "url_citation": c}, nil
}

// chatUsage maps Responses usage to Chat Completions usage.
func chatUsage(v any) (jobject, error) {
	u, err := jobj(v, "response.usage")
	if err != nil {
		return nil, err
	}
	in, err := jint(u["input_tokens"], "response.usage.input_tokens", 0, 1<<53)
	if err != nil {
		return nil, err
	}
	outTok, err := jint(u["output_tokens"], "response.usage.output_tokens", 0, 1<<53)
	if err != nil {
		return nil, err
	}
	total := in + outTok
	if t, ok := u["total_tokens"]; ok && t != nil {
		if total, err = jint(t, "response.usage.total_tokens", 0, 1<<53); err != nil {
			return nil, err
		}
	}
	out := jobject{"prompt_tokens": in, "completion_tokens": outTok, "total_tokens": total}
	if d, ok := u["input_tokens_details"].(map[string]any); ok {
		if c, ok := d["cached_tokens"]; ok && c != nil {
			n, err := jint(c, "response.usage.input_tokens_details.cached_tokens", 0, 1<<53)
			if err != nil {
				return nil, err
			}
			out["prompt_tokens_details"] = jobject{"cached_tokens": n}
		}
	}
	if d, ok := u["output_tokens_details"].(map[string]any); ok {
		if c, ok := d["reasoning_tokens"]; ok && c != nil {
			n, err := jint(c, "response.usage.output_tokens_details.reasoning_tokens", 0, 1<<53)
			if err != nil {
				return nil, err
			}
			out["completion_tokens_details"] = jobject{"reasoning_tokens": n}
		}
	}
	return out, nil
}

// ---------------------------------------------------------------- stream

func (c *chatResponses) NewStream() StreamConverter {
	return &chatResponsesStream{p: c, created: time.Now().Unix(), tools: map[int64]*chatStreamTool{}}
}

type chatStreamTool struct {
	index int
	args  strings.Builder
}

type chatResponsesStream struct {
	p                     *chatResponses
	id, model             string
	created               int64
	started, done, failed bool
	tools                 map[int64]*chatStreamTool
}

// chatStreamIgnored are Responses events with nothing to add to a chat
// stream: progress, reasoning (Chat Completions does not stream it) and
// "done" events whose content already went out as deltas.
var chatStreamIgnored = map[string]bool{
	"response.queued": true, "response.in_progress": true,
	"response.content_part.added": true, "response.content_part.done": true,
	"response.output_text.done": true, "response.refusal.done": true,
	"response.reasoning_summary_part.added": true, "response.reasoning_summary_part.done": true,
	"response.reasoning_summary_text.delta": true, "response.reasoning_summary_text.done": true,
	"response.reasoning_text.delta": true, "response.reasoning_text.done": true,
}

func (s *chatResponsesStream) Event(ev Event) ([]Event, error) {
	if !s.p.prepared {
		return nil, errUnprepared
	}
	d := bytes.TrimSpace(ev.Data)
	if len(d) == 0 || string(d) == "[DONE]" {
		return nil, nil
	}
	o, err := decodeJObject(d, "stream")
	if err != nil {
		return nil, err
	}
	typ, _ := o["type"].(string)
	if typ == "" {
		typ = ev.Name
	}
	if s.done || s.failed {
		return nil, nil
	}
	switch typ {
	case "response.created":
		s.meta(o["response"])
		return s.start(), nil
	case "response.output_item.added":
		return s.itemAdded(o)
	case "response.output_item.done":
		return s.itemDone(o)
	case "response.output_text.delta":
		delta, err := jstr(o["delta"], "stream.delta")
		if err != nil {
			return nil, err
		}
		return append(s.start(), s.chunk(jobject{"content": delta}, nil)...), nil
	case "response.refusal.delta":
		delta, err := jstr(o["delta"], "stream.delta")
		if err != nil {
			return nil, err
		}
		return append(s.start(), s.chunk(jobject{"refusal": delta}, nil)...), nil
	case "response.function_call_arguments.delta":
		t, err := s.tool(o)
		if err != nil {
			return nil, err
		}
		delta, err := jstr(o["delta"], "stream.delta")
		if err != nil {
			return nil, err
		}
		t.args.WriteString(delta)
		return s.toolDelta(t, jobject{"arguments": delta}), nil
	case "response.function_call_arguments.done":
		t, err := s.tool(o)
		if err != nil {
			return nil, err
		}
		args, err := jstr(o["arguments"], "stream.arguments")
		if err != nil {
			return nil, err
		}
		return s.finishArguments(t, args)
	case "response.completed", "response.incomplete":
		return s.complete(o["response"])
	case "response.failed":
		s.failed = true
		e := jobject{"message": "upstream response failed"}
		if r, ok := o["response"].(map[string]any); ok {
			if x, ok := r["error"].(map[string]any); ok {
				e = x
			}
		}
		return s.errorChunk(e), nil
	case "error":
		s.failed = true
		if x, ok := o["error"].(map[string]any); ok {
			return s.errorChunk(x), nil
		}
		e := jobject{}
		for _, k := range []string{"code", "message", "param"} {
			if v, ok := o[k]; ok {
				e[k] = v
			}
		}
		return s.errorChunk(e), nil
	}
	if strings.HasPrefix(typ, "response.output_text.annotation") {
		return nil, cfail("stream."+typ, "annotations are not converted in streams")
	}
	// Progress and reasoning events, and events of other families the
	// upstream may add (rate-limit notices and the like), carry no chat
	// content. Content-bearing output items are checked in itemAdded.
	return nil, nil
}

func (s *chatResponsesStream) Flush() ([]Event, error) {
	if s.failed || !s.done {
		return nil, cfail("stream", "upstream ended without response.completed")
	}
	return nil, nil
}

func (s *chatResponsesStream) meta(v any) {
	r, ok := v.(map[string]any)
	if !ok {
		return
	}
	if id, ok := r["id"].(string); ok && id != "" {
		s.id = id
	}
	if m, ok := r["model"].(string); ok && m != "" {
		s.model = m
	}
	if n, ok := r["created_at"].(json.Number); ok {
		if i, err := n.Int64(); err == nil {
			s.created = i
		}
	}
}

func (s *chatResponsesStream) chunk(delta jobject, finish any) []Event {
	o := jobject{"id": s.id, "object": "chat.completion.chunk", "created": s.created, "model": s.model,
		"choices": []any{jobject{"index": 0, "delta": delta, "finish_reason": finish, "logprobs": nil}}}
	if s.p.includeUsage {
		o["usage"] = nil
	}
	b, _ := json.Marshal(o)
	return []Event{{Data: b}}
}

// start emits the role chunk once, before any content.
func (s *chatResponsesStream) start() []Event {
	if s.started {
		return nil
	}
	s.started = true
	return s.chunk(jobject{"role": "assistant", "content": "", "refusal": nil}, nil)
}

func (s *chatResponsesStream) itemAdded(o jobject) ([]Event, error) {
	item, err := jobj(o["item"], "stream.item")
	if err != nil {
		return nil, err
	}
	switch item["type"] {
	case "message", "reasoning":
		return nil, nil
	case "function_call":
	default:
		return nil, cfail("stream.item.type", "output item has no chat equivalent")
	}
	idx, err := jint(o["output_index"], "stream.output_index", 0, 1<<31)
	if err != nil {
		return nil, err
	}
	if _, dup := s.tools[idx]; dup {
		return nil, cfail("stream.output_index", "function call added twice")
	}
	id, err := jnonempty(item["call_id"], "stream.item.call_id")
	if err != nil {
		return nil, err
	}
	name, err := jnonempty(item["name"], "stream.item.name")
	if err != nil {
		return nil, err
	}
	t := &chatStreamTool{index: len(s.tools)}
	s.tools[idx] = t
	args, _ := item["arguments"].(string)
	t.args.WriteString(args)
	out := s.start()
	return append(out, s.chunk(jobject{"tool_calls": []any{jobject{"index": t.index, "id": id, "type": "function",
		"function": jobject{"name": name, "arguments": args}}}}, nil)...), nil
}

func (s *chatResponsesStream) itemDone(o jobject) ([]Event, error) {
	item, err := jobj(o["item"], "stream.item")
	if err != nil {
		return nil, err
	}
	if item["type"] != "function_call" {
		return nil, nil
	}
	t, err := s.tool(o)
	if err != nil {
		return nil, err
	}
	args, err := jstr(item["arguments"], "stream.item.arguments")
	if err != nil {
		return nil, err
	}
	return s.finishArguments(t, args)
}

func (s *chatResponsesStream) tool(o jobject) (*chatStreamTool, error) {
	idx, err := jint(o["output_index"], "stream.output_index", 0, 1<<31)
	if err != nil {
		return nil, err
	}
	t, ok := s.tools[idx]
	if !ok {
		return nil, cfail("stream.output_index", "no function call at this output index")
	}
	return t, nil
}

func (s *chatResponsesStream) toolDelta(t *chatStreamTool, fn jobject) []Event {
	return s.chunk(jobject{"tool_calls": []any{jobject{"index": t.index, "function": fn}}}, nil)
}

// finishArguments sends what the final arguments add to the streamed ones.
func (s *chatResponsesStream) finishArguments(t *chatStreamTool, args string) ([]Event, error) {
	sent := t.args.String()
	if args == sent {
		return nil, nil
	}
	if !strings.HasPrefix(args, sent) {
		return nil, cfail("stream.arguments", "final arguments disagree with the streamed ones")
	}
	rest := args[len(sent):]
	t.args.WriteString(rest)
	return s.toolDelta(t, jobject{"arguments": rest}), nil
}

func (s *chatResponsesStream) complete(v any) ([]Event, error) {
	r, err := jobj(v, "stream.response")
	if err != nil {
		return nil, err
	}
	s.meta(r)
	finish, err := chatFinish(r, len(s.tools) > 0)
	if err != nil {
		return nil, err
	}
	out := s.start()
	out = append(out, s.chunk(jobject{}, finish)...)
	if s.p.includeUsage {
		if u, ok := r["usage"]; ok && u != nil {
			usage, err := chatUsage(u)
			if err != nil {
				return nil, err
			}
			b, _ := json.Marshal(jobject{"id": s.id, "object": "chat.completion.chunk", "created": s.created, "model": s.model,
				"choices": []any{}, "usage": usage})
			out = append(out, Event{Data: b})
		}
	}
	s.done = true
	return append(out, Event{Data: []byte("[DONE]")}), nil
}

func (s *chatResponsesStream) errorChunk(e map[string]any) []Event {
	b, _ := json.Marshal(jobject{"error": e})
	return []Event{{Data: b}}
}
