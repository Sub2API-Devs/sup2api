package strict

import (
	"encoding/json"
	"fmt"
	codec "github.com/Sub2API-Devs/sup2api/next/protocol-codec"
	"time"
)

func (p *Plan) JSON(raw []byte) ([]byte, error) {
	m, e := decodeObject(raw, "response")
	if e != nil {
		return nil, e
	}
	out, e := p.response(m, time.Now().Unix())
	if e != nil {
		return nil, e
	}
	return json.Marshal(out)
}
func (p *Plan) response(m object, created int64) (object, error) {
	if m["type"] == "error" {
		return nil, fail("response.error", "upstream returned an error envelope")
	}
	if m["type"] != "message" || m["role"] != "assistant" {
		return nil, fail("response", "expected assistant message")
	}
	id, e := requiredString(m, "id", "response")
	if e != nil {
		return nil, e
	}
	model, e := requiredString(m, "model", "response")
	if e != nil {
		return nil, e
	}
	blocks, e := list(m["content"], "response.content")
	if e != nil {
		return nil, e
	}
	reason, e := requiredString(m, "stop_reason", "response")
	if e != nil {
		return nil, e
	}
	switch reason {
	case "end_turn", "stop_sequence", "tool_use", "max_tokens", "refusal":
	default:
		return nil, fail("response.stop_reason", "unsupported terminal reason")
	}
	if seq, ok := m["stop_sequence"]; ok && seq != nil {
		if _, ok := seq.(string); !ok {
			return nil, fail("response.stop_sequence", "expected string or null")
		}
	}
	usage, e := validatedUsage(m["usage"])
	if e != nil {
		return nil, e
	}
	wire, _ := json.Marshal(object{"id": id, "model": model, "type": "message", "role": "assistant", "content": []any{}, "stop_reason": reason, "usage": usage})
	var typed codec.AnthropicResponse
	if e = json.Unmarshal(wire, &typed); e != nil {
		return nil, e
	}
	// Reuse the shared token accounting and public DTO conversion. Per-block conversion avoids legacy text regrouping.
	base := codec.AnthropicToResponsesResponse(&typed)
	base.CreatedAt = created
	base.Output = nil
	outItems := []any{}
	used := map[string]bool{}
	for i, x := range blocks {
		b, e := asObject(x, pos("response.content", i))
		if e != nil {
			return nil, e
		}
		if e = validateOutputBlock(b, pos("response.content", i)); e != nil {
			return nil, e
		}
		if b["type"] == "tool_use" {
			tid := b["id"].(string)
			if used[tid] {
				return nil, fail("response.content", "duplicate tool ID")
			}
			used[tid] = true
		}
		item, e := p.outputItem(b, model, id, i, reason)
		if e != nil {
			return nil, e
		}
		outItems = append(outItems, item)
	}
	if reason == "tool_use" && len(used) == 0 {
		return nil, fail("response.stop_reason", "tool_use has no tool call")
	}
	encoded, _ := json.Marshal(base)
	result, _ := decodeObject(encoded, "response")
	result["output"] = outItems
	result["provider_details"] = providerDetails(m)
	if reason == "refusal" {
		result["status"] = "completed"
		delete(result, "incomplete_details")
	}
	if p.protocol == "openai.responses" {
		return result, nil
	}
	// The shared Responses -> Chat mapper is safe for the admitted text/function subset.
	var res codec.ResponsesResponse
	encoded, _ = json.Marshal(result)
	if e = json.Unmarshal(encoded, &res); e != nil {
		return nil, e
	}
	chat := codec.ResponsesToChatCompletions(&res, model)
	chat.ID = id
	chat.Created = created
	encoded, _ = json.Marshal(chat)
	out, _ := decodeObject(encoded, "chat")
	out["provider_details"] = providerDetails(m)
	if reason == "refusal" {
		choices := out["choices"].([]any)
		choice := choices[0].(object)
		msg := choice["message"].(object)
		refusal := ""
		for _, x := range blocks {
			b := x.(object)
			if b["type"] == "text" {
				refusal += b["text"].(string)
			}
		}
		msg["refusal"] = refusal
		msg["content"] = nil
		choice["finish_reason"] = "stop"
	}
	return out, nil
}
func validatedUsage(v any) (object, error) {
	u, e := asObject(v, "response.usage")
	if e != nil {
		return nil, e
	}
	for _, k := range []string{"input_tokens", "output_tokens"} {
		if _, e = integer(u[k], "response.usage."+k, 0, 1e12); e != nil {
			return nil, e
		}
	}
	for _, k := range []string{"cache_read_input_tokens", "cache_creation_input_tokens"} {
		if v, ok := u[k]; ok && v != nil {
			if _, e = integer(v, "response.usage."+k, 0, 1e12); e != nil {
				return nil, e
			}
		}
	}
	if v, ok := u["cache_creation"]; ok && v != nil {
		o, e := asObject(v, "response.usage.cache_creation")
		if e != nil {
			return nil, e
		}
		for _, k := range []string{"ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"} {
			v, ok := o[k]
			if !ok || v == nil {
				continue
			}
			if _, e = integer(v, "response.usage.cache_creation."+k, 0, 1e12); e != nil {
				return nil, e
			}
		}
	}
	return u, nil
}

// Additive vendor metadata preserves true upstream facts without assigning
// semantically different OpenAI fields or treating new response facts as errors.
func providerDetails(m object) object {
	details := object{}
	for k, v := range m {
		switch k {
		case "id", "type", "role", "content":
			continue
		}
		details[k] = v
	}
	return object{"anthropic": details}
}
func validateOutputBlock(b object, path string) error {
	switch b["type"] {
	case "text":
		if e := keys(b, path, "type", "text"); e != nil {
			return e
		}
		if _, ok := b["text"].(string); !ok {
			return fail(path+".text", "expected string")
		}
	case "tool_use":
		if e := keys(b, path, "type", "id", "name", "input"); e != nil {
			return e
		}
		if _, e := requiredString(b, "id", path); e != nil {
			return e
		}
		if _, e := requiredString(b, "name", path); e != nil {
			return e
		}
		if _, e := asObject(b["input"], path+".input"); e != nil {
			return e
		}
	case "thinking", "redacted_thinking":
		return validateThinking(b, path)
	default:
		return fail(path+".type", "output block has no verified equivalent")
	}
	return nil
}
func (p *Plan) outputItem(b object, model, id string, index int, reason string) (object, error) {
	itemID := fmt.Sprintf("%s_item_%d", id, index)
	if b["type"] == "thinking" || b["type"] == "redacted_thinking" {
		if p.protocol == "openai.chat" {
			return nil, fail("response.content", "Chat has no negotiated signed-thinking envelope; use Responses")
		}
		encrypted, e := encodeThinking(model, b)
		if e != nil {
			return nil, e
		}
		summary := []any{}
		if t, ok := b["thinking"].(string); ok && t != "" {
			summary = append(summary, object{"type": "summary_text", "text": t})
		}
		return object{"type": "reasoning", "id": itemID, "summary": summary, "encrypted_content": encrypted}, nil
	}
	if b["type"] == "text" && reason == "refusal" {
		return object{"type": "message", "id": itemID, "role": "assistant", "status": "completed", "content": []any{object{"type": "refusal", "refusal": b["text"]}}}, nil
	}
	raw, _ := json.Marshal(object{"id": id, "model": model, "content": []any{b}, "stop_reason": "end_turn"})
	var response codec.AnthropicResponse
	if e := json.Unmarshal(raw, &response); e != nil {
		return nil, e
	}
	converted := codec.AnthropicToResponsesResponse(&response)
	if len(converted.Output) != 1 {
		return nil, fail("response.content", "unexpected shared codec shape")
	}
	raw, _ = json.Marshal(converted.Output[0])
	item, e := decodeObject(raw, "output")
	if e != nil {
		return nil, e
	}
	item["id"] = itemID
	// IDs are correlation tokens, not a place to normalize provider prefixes.
	if b["type"] == "tool_use" {
		item["call_id"] = b["id"]
		args, err := json.Marshal(b["input"])
		if err != nil {
			return nil, err
		}
		item["arguments"] = string(args)
	}
	if b["type"] == "text" {
		item["content"] = []any{object{"type": "output_text", "text": b["text"], "annotations": []any{}}}
	}
	return item, nil
}
