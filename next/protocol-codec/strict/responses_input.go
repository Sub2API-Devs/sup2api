package strict

import (
	"encoding/base64"
	"encoding/json"
	"strings"
)

const opaquePrefix = "sup2api-anthropic-thinking-v1:"

type thinkingEnvelope struct {
	Provider string          `json:"provider"`
	Model    string          `json:"model"`
	Block    json.RawMessage `json:"block"`
}

func encodeThinking(model string, block object) (string, error) {
	b, e := json.Marshal(block)
	if e != nil {
		return "", e
	}
	v, e := json.Marshal(thinkingEnvelope{"anthropic", model, b})
	return opaquePrefix + base64.RawStdEncoding.EncodeToString(v), e
}
func decodeThinking(s, path string) (object, error) {
	if !strings.HasPrefix(s, opaquePrefix) {
		return nil, fail(path, "unrecognized opaque reasoning envelope format")
	}
	b, e := base64.RawStdEncoding.DecodeString(strings.TrimPrefix(s, opaquePrefix))
	if e != nil {
		return nil, fail(path, "invalid opaque encoding")
	}
	o, e := decodeObject(b, path)
	if e != nil {
		return nil, e
	}
	if e = keys(o, path, "provider", "model", "block"); e != nil {
		return nil, e
	}
	if o["provider"] != "anthropic" {
		return nil, fail(path, "reasoning provider mismatch")
	}
	if _, e = requiredString(o, "model", path); e != nil {
		return nil, e
	}
	// This is transport encoding, not authentication. The upstream validates
	// signatures against the actual mapped model and prefix; aliases are not models.
	block, e := asObject(o["block"], path+".block")
	if e != nil {
		return nil, e
	}
	if e = validateThinking(block, path+".block"); e != nil {
		return nil, e
	}
	return block, nil
}
func validateThinking(b object, path string) error {
	switch b["type"] {
	case "thinking":
		if e := keys(b, path, "type", "thinking", "signature"); e != nil {
			return e
		}
		if _, e := optionalString(b, "thinking", path); e != nil {
			return e
		}
		if _, ok := b["thinking"]; !ok {
			return fail(path+".thinking", "required")
		}
		if _, e := requiredString(b, "signature", path); e != nil {
			return e
		}
	case "redacted_thinking":
		if e := keys(b, path, "type", "data"); e != nil {
			return e
		}
		if _, e := requiredString(b, "data", path); e != nil {
			return e
		}
	default:
		return fail(path, "expected signed thinking block")
	}
	return nil
}
func (p *Plan) responsesInput(in, out object) error {
	c := newConversation()
	if v, ok := in["instructions"]; ok {
		s, ok := v.(string)
		if !ok {
			return fail("instructions", "expected string")
		}
		c.system = []any{object{"type": "text", "text": s}}
	}
	if s, ok := in["input"].(string); ok {
		if e := c.add("user", []any{object{"type": "text", "text": s}}, "input"); e != nil {
			return e
		}
		return c.finish(out)
	}
	a, e := list(in["input"], "input")
	if e != nil {
		return e
	}
	role := ""
	blocks := []any{}
	flush := func(path string) error {
		if role == "" {
			return nil
		}
		e := c.add(role, blocks, path)
		role = ""
		blocks = nil
		return e
	}
	appendRole := func(next string, b []any, path string) error {
		if role != "" && role != next {
			if e := flush(path); e != nil {
				return e
			}
		}
		role = next
		blocks = append(blocks, b...)
		return nil
	}
	for i, x := range a {
		path := pos("input", i)
		item, e := asObject(x, path)
		if e != nil {
			return e
		}
		typ, _ := item["type"].(string)
		if typ == "" {
			if _, exists := item["type"]; exists {
				return fail(path+".type", "expected string")
			}
			typ = "message"
		}
		switch typ {
		case "message":
			if e = keys(item, path, "type", "role", "content", "id", "status"); e != nil {
				return e
			}
			r, e := requiredString(item, "role", path)
			if e != nil {
				return e
			}
			if e = validateItemIdentity(item, path); e != nil {
				return e
			}
			if r == "system" {
				if i != 0 || c.system != nil {
					return fail(path, "system position/conflict cannot be preserved")
				}
				b, e := textParts(item["content"], path+".content", false)
				if e != nil {
					return e
				}
				c.system = b
				continue
			}
			if r != "user" && r != "assistant" {
				return fail(path+".role", "role has no verified equivalent")
			}
			content := item["content"]
			if r == "assistant" {
				var err error
				content, err = restoreRefusalParts(content, path+".content")
				if err != nil {
					return err
				}
			}
			b, e := textParts(content, path+".content", r == "user")
			if e != nil {
				return e
			}
			if e = appendRole(r, b, path); e != nil {
				return e
			}
		case "function_call":
			if e = keys(item, path, "type", "id", "status", "call_id", "name", "arguments"); e != nil {
				return e
			}
			if e = validateItemIdentity(item, path); e != nil {
				return e
			}
			id, e := requiredString(item, "call_id", path)
			if e != nil {
				return e
			}
			b, e := functionBlock(item, id, path)
			if e != nil {
				return e
			}
			if e = appendRole("assistant", []any{b}, path); e != nil {
				return e
			}
		case "function_call_output":
			if e = keys(item, path, "type", "id", "status", "call_id", "output"); e != nil {
				return e
			}
			if e = validateItemIdentity(item, path); e != nil {
				return e
			}
			id, e := requiredString(item, "call_id", path)
			if e != nil {
				return e
			}
			b, e := textParts(item["output"], path+".output", false)
			if e != nil {
				return e
			}
			if e = appendRole("user", []any{object{"type": "tool_result", "tool_use_id": id, "content": b}}, path); e != nil {
				return e
			}
		case "reasoning":
			if e = keys(item, path, "type", "id", "status", "summary", "encrypted_content"); e != nil {
				return e
			}
			if e = validateItemIdentity(item, path); e != nil {
				return e
			}
			s, e := requiredString(item, "encrypted_content", path)
			if e != nil {
				return e
			}
			b, e := decodeThinking(s, path+".encrypted_content")
			if e != nil {
				return e
			}
			if v, ok := item["summary"]; ok {
				parts, e := list(v, path+".summary")
				if e != nil {
					return e
				}
				if len(parts) > 1 {
					return fail(path+".summary", "summary does not match opaque block")
				}
				if len(parts) == 1 {
					o, e := asObject(parts[0], path+".summary[0]")
					if e != nil {
						return e
					}
					if e = keys(o, path+".summary[0]", "type", "text"); e != nil {
						return e
					}
					if o["type"] != "summary_text" || o["text"] != b["thinking"] {
						return fail(path+".summary", "summary differs from bound reasoning")
					}
				}
			}
			if e = appendRole("assistant", []any{b}, path); e != nil {
				return e
			}
		default:
			return fail(path+".type", "input item has no verified equivalent")
		}
	}
	if e = flush("input"); e != nil {
		return e
	}
	return c.finish(out)
}

func restoreRefusalParts(value any, path string) (any, error) {
	a, ok := value.([]any)
	if !ok {
		return value, nil
	}
	out := append([]any(nil), a...)
	for i, x := range out {
		o, ok := x.(object)
		if !ok || o["type"] != "refusal" {
			continue
		}
		if e := keys(o, pos(path, i), "type", "refusal"); e != nil {
			return nil, e
		}
		v, ok := o["refusal"].(string)
		if !ok {
			return nil, fail(pos(path, i), "refusal must be string")
		}
		out[i] = object{"type": "output_text", "text": v}
	}
	return out, nil
}
func validateItemIdentity(o object, path string) error {
	if _, e := optionalString(o, "id", path); e != nil {
		return e
	}
	if v, ok := o["status"]; ok && v != "completed" {
		return fail(path+".status", "only completed history items may be replayed")
	}
	return nil
}
