package strict

import (
	"encoding/base64"
	"encoding/json"
	"strings"
)

func (p *Plan) tools(in, out object) error {
	names := map[string]bool{}
	if v, ok := in["tools"]; ok {
		a, e := list(v, "tools")
		if e != nil {
			return e
		}
		tools := []any{}
		for i, x := range a {
			path := pos("tools", i)
			o, e := asObject(x, path)
			if e != nil {
				return e
			}
			if o["type"] != "function" {
				return fail(path+".type", "only client function tools are supported")
			}
			f := o
			if p.protocol == "openai.chat" {
				if e = keys(o, path, "type", "function"); e != nil {
					return e
				}
				f, e = asObject(o["function"], path+".function")
				if e != nil {
					return e
				}
			}
			allowed := []string{"name", "description", "parameters", "strict"}
			if p.protocol == "openai.responses" {
				allowed = append(allowed, "type")
			}
			if e = keys(f, path, allowed...); e != nil {
				return e
			}
			name, e := requiredString(f, "name", path)
			if e != nil {
				return e
			}
			if names[name] {
				return fail(path+".name", "duplicate tool name")
			}
			names[name] = true
			schema, e := asObject(f["parameters"], path+".parameters")
			if e != nil {
				return e
			}
			t := object{"name": name, "input_schema": schema}
			if d, ok := f["description"]; ok {
				if _, e = optionalString(f, "description", path); e != nil {
					return e
				}
				t["description"] = d
			}
			if s, ok := f["strict"]; ok {
				if _, e = boolean(s, path+".strict"); e != nil {
					return e
				}
				t["strict"] = s
			}
			tools = append(tools, t)
		}
		out["tools"] = tools
	}
	choice := object{}
	if v, ok := in["tool_choice"]; ok {
		if s, ok := v.(string); ok {
			switch s {
			case "auto", "none":
				choice["type"] = s
			case "required":
				choice["type"] = "any"
			default:
				return fail("tool_choice", "unsupported choice")
			}
		} else {
			o, e := asObject(v, "tool_choice")
			if e != nil {
				return e
			}
			if o["type"] != "function" {
				return fail("tool_choice.type", "only function selection supported")
			}
			f := o
			if p.protocol == "openai.chat" {
				if e = keys(o, "tool_choice", "type", "function"); e != nil {
					return e
				}
				f, e = asObject(o["function"], "tool_choice.function")
				if e != nil {
					return e
				}
				if e = keys(f, "tool_choice.function", "name"); e != nil {
					return e
				}
			} else {
				if e = keys(o, "tool_choice", "type", "name"); e != nil {
					return e
				}
			}
			name, e := requiredString(f, "name", "tool_choice")
			if e != nil {
				return e
			}
			if !names[name] {
				return fail("tool_choice.name", "tool is not declared")
			}
			choice = object{"type": "tool", "name": name}
		}
	}
	if v, ok := in["parallel_tool_calls"]; ok {
		b, e := boolean(v, "parallel_tool_calls")
		if e != nil {
			return e
		}
		if len(choice) == 0 {
			choice["type"] = "auto"
		}
		// With all calls disabled the parallel constraint is already satisfied;
		// Anthropic's none variant does not accept disable_parallel_tool_use.
		if choice["type"] != "none" {
			choice["disable_parallel_tool_use"] = !b
		}
	}
	if len(choice) > 0 {
		if len(names) == 0 && choice["type"] != "none" {
			return fail("tool_choice", "no declared tools")
		}
		out["tool_choice"] = choice
	}
	return nil
}

type conversation struct {
	messages []any
	system   any
	pending  map[string]bool
	used     map[string]bool
}

func newConversation() *conversation {
	return &conversation{messages: []any{}, pending: map[string]bool{}, used: map[string]bool{}}
}
func (c *conversation) add(role string, blocks []any, path string) error {
	if role != "user" && role != "assistant" {
		return fail(path+".role", "role cannot be represented")
	}
	if role == "assistant" && len(c.pending) > 0 {
		return fail(path, "unanswered tool calls before assistant turn")
	}
	results := map[string]bool{}
	calls := []string{}
	nonResult := false
	for _, x := range blocks {
		o := x.(object)
		if role == "user" {
			if o["type"] != "tool_result" {
				nonResult = true
			} else if nonResult {
				return fail(path, "tool results must precede ordinary user content; adapter does not reorder blocks")
			}
		}
		switch o["type"] {
		case "tool_use":
			id := o["id"].(string)
			if role != "assistant" || c.used[id] {
				return fail(path, "duplicate or non-assistant tool call")
			}
			c.used[id] = true
			calls = append(calls, id)
		case "tool_result":
			id := o["tool_use_id"].(string)
			if role != "user" || !c.pending[id] || results[id] {
				return fail(path, "orphan or duplicate tool result")
			}
			results[id] = true
		}
	}
	if role == "user" && len(c.pending) > 0 {
		for id := range c.pending {
			if !results[id] {
				return fail(path, "missing result for preceding tool call")
			}
		}
	}
	for id := range results {
		delete(c.pending, id)
	}
	for _, id := range calls {
		c.pending[id] = true
	}
	// Consecutive identical roles can be kept as separate Messages entries.
	c.messages = append(c.messages, object{"role": role, "content": blocks})
	return nil
}
func (c *conversation) finish(out object) error {
	if len(c.pending) > 0 {
		return fail("messages", "dangling tool calls cannot be silently removed")
	}
	if len(c.messages) == 0 {
		return fail("messages", "at least one conversation message required")
	}
	if c.messages[0].(object)["role"] != "user" {
		return fail("messages[0]", "Anthropic conversation must start with a user message")
	}
	out["messages"] = c.messages
	if c.system != nil {
		out["system"] = c.system
	}
	return nil
}
func (p *Plan) chatMessages(in, out object) error {
	a, e := list(in["messages"], "messages")
	if e != nil {
		return e
	}
	c := newConversation()
	// Parallel Chat tool results are separate messages: group only adjacent tool results into one user turn.
	for i := 0; i < len(a); i++ {
		path := pos("messages", i)
		m, e := asObject(a[i], path)
		if e != nil {
			return e
		}
		if e = keys(m, path, "role", "content", "tool_calls", "tool_call_id", "refusal"); e != nil {
			return e
		}
		role, e := requiredString(m, "role", path)
		if e != nil {
			return e
		}
		if v, ok := m["refusal"]; ok && v != nil {
			if role != "assistant" {
				return fail(path+".refusal", "only assistant refusal is valid")
			}
			if _, ok := v.(string); !ok {
				return fail(path+".refusal", "expected string")
			}
			if c, ok := m["content"]; ok && c != nil && c != "" {
				return fail(path, "mixed content/refusal history is ambiguous")
			}
			m["content"] = v
		}
		if role == "system" {
			if i != 0 || c.system != nil {
				return fail(path, "only one leading system message can be mapped without changing position")
			}
			if _, ok := m["tool_calls"]; ok {
				return fail(path, "system tools invalid")
			}
			if _, ok := m["tool_call_id"]; ok {
				return fail(path, "system tool result invalid")
			}
			b, e := textParts(m["content"], path+".content", false)
			if e != nil {
				return e
			}
			c.system = b
			continue
		}
		if role == "tool" {
			blocks := []any{}
			for {
				v, e := asObject(a[i], pos("messages", i))
				if e != nil {
					return e
				}
				if e = keys(v, pos("messages", i), "role", "content", "tool_call_id"); e != nil {
					return e
				}
				id, e := requiredString(v, "tool_call_id", path)
				if e != nil {
					return e
				}
				content, e := textParts(v["content"], path+".content", false)
				if e != nil {
					return e
				}
				blocks = append(blocks, object{"type": "tool_result", "tool_use_id": id, "content": content})
				if i+1 >= len(a) {
					break
				}
				next, ok := a[i+1].(object)
				if !ok || next["role"] != "tool" {
					break
				}
				i++
			}
			if e = c.add("user", blocks, path); e != nil {
				return e
			}
			continue
		}
		if role != "user" && role != "assistant" {
			return fail(path+".role", "developer/function roles require a separate verified semantic adapter")
		}
		if _, ok := m["tool_call_id"]; ok {
			return fail(path+".tool_call_id", "only tool result messages may have this field")
		}
		blocks := []any{}
		if m["content"] != nil {
			blocks, e = textParts(m["content"], path+".content", role == "user")
			if e != nil {
				return e
			}
		}
		if v, ok := m["tool_calls"]; ok {
			if role != "assistant" {
				return fail(path+".tool_calls", "only assistant can call tools")
			}
			calls, e := list(v, path+".tool_calls")
			if e != nil {
				return e
			}
			for j, x := range calls {
				q := pos(path+".tool_calls", j)
				call, e := asObject(x, q)
				if e != nil {
					return e
				}
				if e = keys(call, q, "id", "type", "function"); e != nil {
					return e
				}
				if call["type"] != "function" {
					return fail(q, "only function calls supported")
				}
				id, e := requiredString(call, "id", q)
				if e != nil {
					return e
				}
				f, e := asObject(call["function"], q+".function")
				if e != nil {
					return e
				}
				if e = keys(f, q+".function", "name", "arguments"); e != nil {
					return e
				}
				b, e := functionBlock(f, id, q)
				if e != nil {
					return e
				}
				blocks = append(blocks, b)
			}
		}
		if len(blocks) == 0 {
			return fail(path+".content", "empty message has no equivalent")
		}
		if e = c.add(role, blocks, path); e != nil {
			return e
		}
	}
	return c.finish(out)
}
func functionBlock(f object, id, path string) (object, error) {
	name, e := requiredString(f, "name", path)
	if e != nil {
		return nil, e
	}
	args, e := requiredString(f, "arguments", path)
	if e != nil {
		return nil, e
	}
	o, e := decodeObject([]byte(args), path+".arguments")
	if e != nil {
		return nil, e
	}
	return object{"type": "tool_use", "id": id, "name": name, "input": o}, nil
}
func textParts(value any, path string, images bool) ([]any, error) {
	if s, ok := value.(string); ok {
		return []any{object{"type": "text", "text": s}}, nil
	}
	a, e := list(value, path)
	if e != nil {
		return nil, e
	}
	out := []any{}
	for i, x := range a {
		q := pos(path, i)
		o, e := asObject(x, q)
		if e != nil {
			return nil, e
		}
		switch o["type"] {
		case "text", "input_text", "output_text":
			allowed := []string{"type", "text"}
			if o["type"] == "output_text" {
				allowed = append(allowed, "annotations")
			}
			if e = keys(o, q, allowed...); e != nil {
				return nil, e
			}
			if v, ok := o["annotations"]; ok {
				a, e := list(v, q+".annotations")
				if e != nil {
					return nil, e
				}
				if len(a) > 0 {
					return nil, fail(q+".annotations", "citation annotations need an explicit cross-provider adapter")
				}
			}
			s, e := optionalString(o, "text", q)
			if e != nil {
				return nil, e
			}
			if _, ok := o["text"]; !ok {
				return nil, fail(q+".text", "required")
			}
			out = append(out, object{"type": "text", "text": s})
		case "image_url", "input_image":
			if !images {
				return nil, fail(q, "image not supported at this position")
			}
			src, e := imageSource(o, q)
			if e != nil {
				return nil, e
			}
			out = append(out, object{"type": "image", "source": src})
		default:
			return nil, fail(q+".type", "content block has no verified equivalent")
		}
	}
	return out, nil
}
func imageSource(o object, path string) (object, error) {
	var url string
	if o["type"] == "image_url" {
		if e := keys(o, path, "type", "image_url"); e != nil {
			return nil, e
		}
		v, e := asObject(o["image_url"], path+".image_url")
		if e != nil {
			return nil, e
		}
		if e = keys(v, path, "url", "detail"); e != nil {
			return nil, e
		}
		if d, ok := v["detail"]; ok && d != "auto" {
			return nil, fail(path+".detail", "image detail cannot be mapped")
		}
		url, e = requiredString(v, "url", path)
		if e != nil {
			return nil, e
		}
	} else {
		if e := keys(o, path, "type", "image_url", "detail"); e != nil {
			return nil, e
		}
		if d, ok := o["detail"]; ok && d != "auto" {
			return nil, fail(path+".detail", "image detail cannot be mapped")
		}
		var e error
		url, e = requiredString(o, "image_url", path)
		if e != nil {
			return nil, e
		}
	}
	if strings.HasPrefix(url, "https://") || strings.HasPrefix(url, "http://") {
		return object{"type": "url", "url": url}, nil
	}
	meta, data, ok := strings.Cut(url, ",")
	if !ok || !strings.HasPrefix(meta, "data:") || !strings.HasSuffix(meta, ";base64") {
		return nil, fail(path, "unsupported image URL")
	}
	mime := strings.TrimSuffix(strings.TrimPrefix(meta, "data:"), ";base64")
	switch mime {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
	default:
		return nil, fail(path, "unsupported image media type")
	}
	if _, e := base64.StdEncoding.DecodeString(data); e != nil {
		return nil, fail(path, "invalid base64 image")
	}
	return object{"type": "base64", "media_type": mime, "data": data}, nil
}

// Raw arguments are decoded with UseNumber; no floating-point precision is lost.
var _ = json.Number("")
