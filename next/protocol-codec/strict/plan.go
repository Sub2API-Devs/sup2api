// Package strict provides loss-aware OpenAI-to-Anthropic protocol adapters.
// It is independent of routing, authentication, persistence, and billing.
package strict

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"strconv"
)

type object = map[string]any

type Error struct{ Path, Reason string }

func (e *Error) Error() string       { return "unsupported_conversion: " + e.Path + ": " + e.Reason }
func fail(path, reason string) error { return &Error{path, reason} }

type Plan struct {
	protocol, model string
	includeUsage    bool
}
type Event struct {
	Name string
	Data []byte
}

func Prepare(protocol string, raw []byte) (*Plan, []byte, error) {
	if protocol != "openai.chat" && protocol != "openai.responses" {
		return nil, nil, fail("protocol", "expected openai.chat or openai.responses")
	}
	root, err := decodeObject(raw, "request")
	if err != nil {
		return nil, nil, err
	}
	p := &Plan{protocol: protocol}
	p.model, err = requiredString(root, "model", "request")
	if err != nil {
		return nil, nil, err
	}
	out := object{"model": p.model}
	if err = p.controls(root, out); err != nil {
		return nil, nil, err
	}
	if err = p.tools(root, out); err != nil {
		return nil, nil, err
	}
	if protocol == "openai.chat" {
		err = p.chatMessages(root, out)
	} else {
		err = p.responsesInput(root, out)
	}
	if err != nil {
		return nil, nil, err
	}
	wire, err := json.Marshal(out)
	return p, wire, err
}

func decodeObject(raw []byte, path string) (object, error) {
	if err := checkJSONKeys(raw, path); err != nil {
		return nil, err
	}
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var value any
	if err := dec.Decode(&value); err != nil {
		return nil, fail(path, "invalid JSON")
	}
	var trailing any
	if dec.Decode(&trailing) != io.EOF {
		return nil, fail(path, "multiple JSON values")
	}
	return asObject(value, path)
}

// JSON object duplicates otherwise disappear before field validation. Reject
// them recursively, including tool schemas and opaque envelopes.
func checkJSONKeys(raw []byte, path string) error {
	d := json.NewDecoder(bytes.NewReader(raw))
	d.UseNumber()
	var read func(string, int) error
	read = func(p string, depth int) error {
		if depth > 128 {
			return fail(p, "JSON nesting exceeds 128")
		}
		t, err := d.Token()
		if err != nil {
			return fail(p, "invalid JSON")
		}
		delim, ok := t.(json.Delim)
		if !ok {
			return nil
		}
		switch delim {
		case '{':
			seen := map[string]bool{}
			for d.More() {
				k, err := d.Token()
				if err != nil {
					return fail(p, "invalid JSON")
				}
				name, ok := k.(string)
				if !ok {
					return fail(p, "invalid object key")
				}
				if seen[name] {
					return fail(p+"."+name, "duplicate JSON field")
				}
				seen[name] = true
				if err = read(p+"."+name, depth+1); err != nil {
					return err
				}
			}
		case '[':
			for i := 0; d.More(); i++ {
				if err := read(pos(p, i), depth+1); err != nil {
					return err
				}
			}
		default:
			return fail(p, "invalid JSON delimiter")
		}
		if _, err = d.Token(); err != nil {
			return fail(p, "invalid JSON")
		}
		return nil
	}
	if err := read(path, 0); err != nil {
		return err
	}
	if _, err := d.Token(); err != io.EOF {
		return fail(path, "multiple JSON values")
	}
	return nil
}
func asObject(value any, path string) (object, error) {
	v, ok := value.(map[string]any)
	if !ok || v == nil {
		return nil, fail(path, "expected object")
	}
	return v, nil
}
func keys(v object, path string, names ...string) error {
	allowed := map[string]bool{}
	for _, s := range names {
		allowed[s] = true
	}
	for k := range v {
		if !allowed[k] {
			return fail(path+"."+k, "field has no verified equivalent")
		}
	}
	return nil
}
func requiredString(v object, key, path string) (string, error) {
	s, ok := v[key].(string)
	if !ok || s == "" {
		return "", fail(path+"."+key, "expected nonempty string")
	}
	return s, nil
}
func optionalString(v object, key, path string) (string, error) {
	x, ok := v[key]
	if !ok {
		return "", nil
	}
	s, ok := x.(string)
	if !ok {
		return "", fail(path+"."+key, "expected string")
	}
	return s, nil
}
func boolean(value any, path string) (bool, error) {
	v, ok := value.(bool)
	if !ok {
		return false, fail(path, "expected boolean")
	}
	return v, nil
}
func integer(value any, path string, min, max int64) (int64, error) {
	v, ok := value.(json.Number)
	if !ok {
		return 0, fail(path, "expected integer")
	}
	n, err := strconv.ParseInt(string(v), 10, 64)
	if err != nil || n < min || n > max {
		return 0, fail(path, "integer out of range")
	}
	return n, nil
}
func list(value any, path string) ([]any, error) {
	a, ok := value.([]any)
	if !ok {
		return nil, fail(path, "expected array")
	}
	return a, nil
}
func same(a, b any) bool            { x, _ := json.Marshal(a); y, _ := json.Marshal(b); return bytes.Equal(x, y) }
func pos(path string, i int) string { return fmt.Sprintf("%s[%d]", path, i) }
func (p *Plan) controls(in, out object) error {
	names := []string{"model", "stream", "temperature", "top_p", "tools", "tool_choice", "parallel_tool_calls"}
	if p.protocol == "openai.chat" {
		names = append(names, "messages", "max_tokens", "max_completion_tokens", "stop", "response_format", "stream_options", "n")
	} else {
		names = append(names, "input", "instructions", "max_output_tokens", "text", "store", "include")
	}
	if err := keys(in, "request", names...); err != nil {
		return err
	}
	if v, ok := in["stream"]; ok {
		b, e := boolean(v, "stream")
		if e != nil {
			return e
		}
		out["stream"] = b
	}
	maxKey := "max_output_tokens"
	if p.protocol == "openai.chat" {
		maxKey = "max_completion_tokens"
		if _, ok := in[maxKey]; !ok {
			maxKey = "max_tokens"
		}
		if a, ok := in["max_tokens"]; ok {
			if b, yes := in["max_completion_tokens"]; yes && !same(a, b) {
				return fail("max_tokens", "conflicts with max_completion_tokens")
			}
		}
	}
	n, err := integer(in[maxKey], maxKey, 1, 2147483647)
	if err != nil {
		return fail(maxKey, "explicit positive token limit required; no implicit conversion default")
	}
	out["max_tokens"] = n
	for _, k := range []string{"temperature", "top_p"} {
		if v, ok := in[k]; ok {
			j, ok := v.(json.Number)
			if !ok {
				return fail(k, "expected number")
			}
			f, e := strconv.ParseFloat(string(j), 64)
			if e != nil || f < 0 || f > 1 {
				return fail(k, "value cannot be represented by Anthropic [0,1]")
			}
			out[k] = v
		}
	}
	if v, ok := in["n"]; ok {
		if _, e := integer(v, "n", 1, 1); e != nil {
			return fail("n", "only one completion has an equivalent")
		}
	}
	if v, ok := in["store"]; ok {
		b, e := boolean(v, "store")
		if e != nil {
			return e
		}
		if b {
			return fail("store", "response storage not implemented by this adapter")
		}
	}
	if v, ok := in["include"]; ok {
		a, e := list(v, "include")
		if e != nil {
			return e
		}
		for _, x := range a {
			if x != "reasoning.encrypted_content" {
				return fail("include", "only reasoning.encrypted_content is available")
			}
		}
	}
	if v, ok := in["stop"]; ok {
		a := []any{}
		if s, yes := v.(string); yes {
			a = append(a, s)
		} else {
			var e error
			a, e = list(v, "stop")
			if e != nil {
				return e
			}
		}
		for _, x := range a {
			if _, ok := x.(string); !ok {
				return fail("stop", "expected strings")
			}
		}
		out["stop_sequences"] = a
	}
	if v, ok := in["stream_options"]; ok {
		o, e := asObject(v, "stream_options")
		if e != nil {
			return e
		}
		if e = keys(o, "stream_options", "include_usage"); e != nil {
			return e
		}
		if x, yes := o["include_usage"]; yes {
			p.includeUsage, e = boolean(x, "stream_options.include_usage")
			if e != nil {
				return e
			}
		}
	}
	return outputFormat(in, out, p.protocol)
}
func outputFormat(in, out object, protocol string) error {
	v, has := in["response_format"]
	path := "response_format"
	if protocol == "openai.responses" {
		if t, yes := in["text"]; yes {
			o, e := asObject(t, "text")
			if e != nil {
				return e
			}
			if e = keys(o, "text", "format"); e != nil {
				return e
			}
			v, has = o["format"]
			path = "text.format"
		}
	}
	if !has {
		return nil
	}
	o, e := asObject(v, path)
	if e != nil {
		return e
	}
	typ, e := requiredString(o, "type", path)
	if e != nil {
		return e
	}
	if typ == "text" {
		return keys(o, path, "type")
	}
	if typ != "json_schema" {
		return fail(path+".type", "only text or constrained json_schema has an equivalent")
	}
	schemaObj := o
	if protocol == "openai.chat" {
		if e = keys(o, path, "type", "json_schema"); e != nil {
			return e
		}
		schemaObj, e = asObject(o["json_schema"], path+".json_schema")
		if e != nil {
			return e
		}
	}
	allowed := []string{"name", "description", "schema", "strict"}
	if protocol == "openai.responses" {
		allowed = append(allowed, "type")
	}
	if e = keys(schemaObj, path, allowed...); e != nil {
		return e
	}
	if _, e = requiredString(schemaObj, "name", path); e != nil {
		return e
	}
	description, e := optionalString(schemaObj, "description", path)
	if e != nil {
		return e
	}
	if description != "" {
		return fail(path+".description", "format-level description has no lossless target field; place it explicitly in the schema")
	}
	if _, ok := schemaObj["strict"]; !ok {
		return fail(path+".strict", "explicit strict:true required for constrained decoding")
	}
	if v, ok := schemaObj["strict"]; ok {
		b, e := boolean(v, path+".strict")
		if e != nil {
			return e
		}
		if !b {
			return fail(path+".strict", "nonconstrained schema semantics cannot be mapped to constrained decoding")
		}
	}
	schema, e := asObject(schemaObj["schema"], path+".schema")
	if e != nil {
		return e
	}
	out["output_config"] = object{"format": object{"type": "json_schema", "schema": schema}}
	return nil
}
