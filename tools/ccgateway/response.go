package main

import (
	"encoding/json"
	"fmt"
)

type Accumulator struct {
	Message       Object
	Blocks        []Object
	Inputs        map[int]string
	Closed        map[int]bool
	Stopped       bool
	Done          bool
	Bytes         int
	Structured    map[int]bool
	HasClientTool bool
}

func integer(v any) (int, bool) {
	switch n := v.(type) {
	case json.Number:
		i, e := n.Int64()
		return int(i), e == nil && i >= 0 && i < 100000
	case int:
		return n, n >= 0 && n < 100000
	case float64:
		return int(n), n >= 0 && n < 100000 && n == float64(int(n))
	}
	return 0, false
}
func (a *Accumulator) push(e Object, r *Request) error {
	b, _ := json.Marshal(e)
	a.Bytes += len(b)
	if a.Bytes > 64<<20 {
		return fmt.Errorf("model response exceeds 64 MiB")
	}
	if a.Done {
		return fmt.Errorf("event after message_stop")
	}
	typ := str(e, "type")
	if typ == "ping" {
		return nil
	}
	if typ == "error" {
		return fmt.Errorf("upstream stream error")
	}
	if typ == "message_start" {
		if a.Message != nil {
			return fmt.Errorf("multiple model messages")
		}
		m, ok := e["message"].(map[string]any)
		if !ok || str(m, "id") == "" || str(m, "role") != "assistant" {
			return fmt.Errorf("invalid message_start")
		}
		a.Message = Object{}
		for k, v := range m {
			a.Message[k] = v
		}
		a.Inputs = map[int]string{}
		a.Structured = map[int]bool{}
		a.Closed = map[int]bool{}
		a.Blocks = []Object{}
		return nil
	}
	if a.Message == nil {
		return fmt.Errorf("event before message_start")
	}
	switch typ {
	case "content_block_start":
		i, ok := integer(e["index"])
		block, ok2 := e["content_block"].(map[string]any)
		if !ok || !ok2 || i != len(a.Blocks) || a.Stopped {
			return fmt.Errorf("invalid block start")
		}
		if i > 0 && !a.Closed[i-1] {
			return fmt.Errorf("overlapping blocks")
		}
		if str(block, "type") == "tool_use" && structuredBlock(str(block, "name"), r) {
			a.Structured[i] = true
			block = Object{"type": "text", "text": ""}
			e["content_block"] = block
		}
		switch str(block, "type") {
		case "text", "thinking", "redacted_thinking":
		case "tool_use":
			wire := str(block, "name")
			name := ""
			if !r.NoTools {
				for _, t := range r.Tools {
					if r.wireName(t.Name) == wire {
						name = t.Name
						break
					}
				}
			}
			if name == "" {
				return fmt.Errorf("model requested an undeclared tool")
			}
			block["name"] = name
			a.HasClientTool = true
		default:
			return fmt.Errorf("unsupported response block")
		}
		copy := Object{}
		for k, v := range block {
			copy[k] = v
		}
		a.Blocks = append(a.Blocks, copy)
	case "content_block_delta":
		i, ok := integer(e["index"])
		d, ok2 := e["delta"].(map[string]any)
		if !ok || !ok2 || i >= len(a.Blocks) || a.Closed[i] || a.Stopped {
			return fmt.Errorf("invalid block delta")
		}
		block := a.Blocks[i]
		if a.Structured[i] && str(d, "type") == "input_json_delta" {
			d = Object{"type": "text_delta", "text": str(d, "partial_json")}
			e["delta"] = d
		}
		switch str(d, "type") {
		case "text_delta":
			if str(block, "type") != "text" {
				return fmt.Errorf("text delta on nontext block")
			}
			block["text"] = str(block, "text") + str(d, "text")
		case "thinking_delta":
			if str(block, "type") != "thinking" {
				return fmt.Errorf("thinking delta on wrong block")
			}
			block["thinking"] = str(block, "thinking") + str(d, "thinking")
		case "signature_delta":
			if str(block, "type") != "thinking" {
				return fmt.Errorf("signature on wrong block")
			}
			block["signature"] = str(block, "signature") + str(d, "signature")
		case "input_json_delta":
			if str(block, "type") != "tool_use" {
				return fmt.Errorf("input delta on wrong block")
			}
			a.Inputs[i] += str(d, "partial_json")
		default:
			return fmt.Errorf("unsupported response delta")
		}
	case "content_block_stop":
		i, ok := integer(e["index"])
		if !ok || i >= len(a.Blocks) || a.Closed[i] || a.Stopped {
			return fmt.Errorf("invalid block stop")
		}
		if s, exists := a.Inputs[i]; exists {
			input, err := decodeObject([]byte(s))
			if err != nil {
				return fmt.Errorf("invalid tool input JSON")
			}
			a.Blocks[i]["input"] = input
		}
		a.Closed[i] = true
	case "message_delta":
		if a.Stopped || len(a.Closed) != len(a.Blocks) {
			return fmt.Errorf("message delta before blocks closed")
		}
		d, ok := e["delta"].(map[string]any)
		if !ok || str(d, "stop_reason") == "" {
			return fmt.Errorf("missing stop reason")
		}
		if len(a.Structured) > 0 && !a.HasClientTool && str(d, "stop_reason") == "tool_use" {
			d["stop_reason"] = "end_turn"
		}
		if r.JSONSchema != nil && !a.HasClientTool && str(d, "stop_reason") == "end_turn" {
			if err := validateStructuredText(r.JSONSchema, a.Blocks); err != nil {
				return err
			}
		}
		for k, v := range d {
			a.Message[k] = v
		}
		if u, ok := e["usage"].(map[string]any); ok {
			usage, _ := a.Message["usage"].(map[string]any)
			if usage == nil {
				usage = Object{}
			}
			for k, v := range u {
				usage[k] = v
			}
			a.Message["usage"] = usage
		}
		a.Stopped = true
	case "message_stop":
		if !a.Stopped || len(a.Closed) != len(a.Blocks) {
			return fmt.Errorf("incomplete model message")
		}
		a.Message["content"] = a.Blocks
		a.Done = true
	default:
		return fmt.Errorf("unsupported stream event %q", typ)
	}
	return nil
}
