package credits

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strings"
)

// MessageFromEvents assembles one completed Messages response for custody
// matching. Inputs may be JSON event payloads or complete SSE frames. It never
// repairs an incomplete stream or discards an unknown content delta.
func MessageFromEvents(events [][]byte) ([]byte, error) {
	var message map[string]any
	blocks := []any{}
	open := -1
	input := ""
	hasInput := false
	ended := false
	stopped := false
	total := 0
	fail := func() ([]byte, error) { return nil, fmt.Errorf("invalid or unsupported credit response stream") }
	for _, raw := range events {
		total += len(raw)
		if total > MaxBodyBytes {
			return fail()
		}
		payload := bytes.TrimSpace(raw)
		if !bytes.HasPrefix(payload, []byte("{")) {
			var data [][]byte
			for _, line := range bytes.Split(bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n")), []byte("\n")) {
				if value, ok := bytes.CutPrefix(line, []byte("data:")); ok {
					data = append(data, bytes.TrimSpace(value))
				}
			}
			if len(data) == 0 {
				continue
			}
			payload = bytes.Join(data, []byte("\n"))
		}
		event, err := Object(payload)
		if err != nil {
			return fail()
		}
		typ, _ := event["type"].(string)
		if typ == "ping" {
			continue
		}
		if ended {
			return fail()
		}
		switch typ {
		case "message_start":
			if message != nil {
				return fail()
			}
			message, _ = event["message"].(map[string]any)
			if message == nil || message["type"] != "message" || message["role"] != "assistant" {
				return fail()
			}
			if id, ok := message["id"].(string); !ok || id == "" {
				return fail()
			}
			initial, ok := message["content"].([]any)
			if !ok || len(initial) != 0 {
				return fail()
			}
		case "content_block_start":
			if message == nil || open != -1 || stopped {
				return fail()
			}
			index, ok := eventIndex(event)
			if !ok || index != len(blocks) {
				return fail()
			}
			block, ok := event["content_block"].(map[string]any)
			if !ok {
				return fail()
			}
			if name, ok := block["type"].(string); !ok || name == "" {
				return fail()
			}
			if block["type"] == "tool_use" || block["type"] == "server_tool_use" || block["type"] == "mcp_tool_use" {
				if input, ok := block["input"].(map[string]any); !ok || input == nil {
					return fail()
				}
			}
			blocks = append(blocks, block)
			open = index
			input = ""
			hasInput = false
		case "content_block_delta":
			index, ok := eventIndex(event)
			if !ok || index != open || open < 0 || stopped {
				return fail()
			}
			delta, ok := event["delta"].(map[string]any)
			if !ok {
				return fail()
			}
			block := blocks[open].(map[string]any)
			kind, _ := delta["type"].(string)
			switch kind {
			case "text_delta", "thinking_delta", "signature_delta", "compaction_delta":
				key := map[string]string{"text_delta": "text", "thinking_delta": "thinking", "signature_delta": "signature", "compaction_delta": "content"}[kind]
				expected := map[string]string{"text_delta": "text", "thinking_delta": "thinking", "signature_delta": "thinking", "compaction_delta": "compaction"}[kind]
				if block["type"] != expected || !validStringDeltaFields(delta, kind, key) {
					return fail()
				}
				part, ok := delta[key].(string)
				if !ok {
					return fail()
				}
				previous := ""
				if value, exists := block[key]; exists {
					previous, ok = value.(string)
					if !ok {
						return fail()
					}
				}
				if kind == "compaction_delta" {
					if sig, exists := block["signature"]; exists && sig != "" {
						return fail()
					}
				}
				if kind == "signature_delta" {
					block[key] = part
				} else {
					block[key] = previous + part
				}
			case "citations_delta":
				if block["type"] != "text" || len(delta) != 2 {
					return fail()
				}
				citation, ok := delta["citation"].(map[string]any)
				if !ok {
					return fail()
				}
				citations := []any{}
				if value, exists := block["citations"]; exists {
					citations, ok = value.([]any)
					if !ok {
						return fail()
					}
				}
				block["citations"] = append(citations, citation)
			case "input_json_delta":
				if block["type"] != "tool_use" && block["type"] != "server_tool_use" && block["type"] != "mcp_tool_use" {
					return fail()
				}
				part, ok := delta["partial_json"].(string)
				if !ok || len(delta) != 2 {
					return fail()
				}
				input += part
				hasInput = hasInput || part != ""
			default:
				return fail()
			}
		case "content_block_stop":
			index, ok := eventIndex(event)
			if !ok || index != open || open < 0 {
				return fail()
			}
			if hasInput {
				parsed, err := Object([]byte(input))
				if err != nil {
					return fail()
				}
				blocks[open].(map[string]any)["input"] = parsed
			}
			open = -1
		case "message_delta":
			if message == nil || open != -1 {
				return fail()
			}
			delta, ok := event["delta"].(map[string]any)
			if !ok {
				return fail()
			}
			if reason, exists := delta["stop_reason"]; exists && reason != nil && reason != "" {
				if stopped {
					return fail()
				}
				if _, ok := reason.(string); !ok {
					return fail()
				}
				stopped = true
			}
			if err := mergeCreditFacts(message, delta); err != nil {
				return fail()
			}
			if usage, exists := event["usage"]; exists {
				incoming, ok := usage.(map[string]any)
				if !ok {
					return fail()
				}
				current, _ := message["usage"].(map[string]any)
				if current == nil {
					current = map[string]any{}
				}
				for key, value := range incoming {
					current[key] = value
				}
				message["usage"] = current
			}
			for key, value := range event {
				if key != "type" && key != "delta" && key != "usage" {
					if err := mergeCreditFacts(message, map[string]any{key: value}); err != nil {
						return fail()
					}
				}
			}
		case "message_stop":
			if message == nil || open != -1 || !stopped {
				return fail()
			}
			ended = true
			for key, value := range event {
				if key != "type" {
					if err := mergeCreditFacts(message, map[string]any{key: value}); err != nil {
						return fail()
					}
				}
			}
		default:
			return fail()
		}
	}
	if !ended {
		return fail()
	}
	message["content"] = blocks
	return json.Marshal(message)
}

// estimated_tokens is a per-frame display hint, never response content or
// billable usage. Retain a closed field set for every other delta variant.
func validStringDeltaFields(delta map[string]any, kind, key string) bool {
	for field, value := range delta {
		if field == "type" || field == key {
			continue
		}
		if field != "estimated_tokens" || kind != "thinking_delta" {
			return false
		}
		if value == nil {
			continue
		}
		n, ok := value.(json.Number)
		if !ok || !nonnegativeInteger(n.String()) {
			return false
		}
	}
	return true
}

func nonnegativeInteger(value string) bool {
	if value == "-0" {
		return true
	}
	if value == "" {
		return false
	}
	for _, c := range value {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
func eventIndex(event map[string]any) (int, bool) {
	value, ok := event["index"].(json.Number)
	if !ok {
		return 0, false
	}
	n, err := value.Int64()
	return int(n), err == nil && n >= 0 && n <= 1<<20
}
func mergeCreditFacts(message, delta map[string]any) error {
	for key, value := range delta {
		switch key {
		case "id", "type", "model", "role", "content", "usage":
			return fmt.Errorf("response identity overwrite")
		}
		if strings.HasPrefix(key, "stop_") && value == nil {
			if message[key] != nil {
				continue
			}
		}
		message[key] = value
	}
	return nil
}
