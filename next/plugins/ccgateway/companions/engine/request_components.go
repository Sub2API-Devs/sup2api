package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
)

func validateBuildNumbers(raw []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	var root any
	if err := decoder.Decode(&root); err != nil {
		return err
	}
	var visit func(any) error
	visit = func(value any) error {
		switch v := value.(type) {
		case json.Number:
			n, err := strconv.ParseFloat(string(v), 64)
			if err != nil || math.IsNaN(n) || math.IsInf(n, 0) || math.Trunc(n) == n && math.Abs(n) > 9007199254740991 {
				return fmt.Errorf("build cannot represent an unsafe JSON number; use direct mode")
			}
		case map[string]any:
			for _, item := range v {
				if err := visit(item); err != nil {
					return err
				}
			}
		case []any:
			for _, item := range v {
				if err := visit(item); err != nil {
					return err
				}
			}
		}
		return nil
	}
	return visit(root)
}

// These are already-rendered system carriers, not guessed CLAUDE.md/memory
// records. Slot references preserve every original role, position and field.
// No cross-request deduplication: each Messages history is replayed once.
func extractSystemComponents(messages []json.RawMessage) ([]json.RawMessage, []map[string]any, error) {
	out := make([]json.RawMessage, 0, len(messages))
	attachments := make([]map[string]any, 0)
	add := func(kind string, value json.RawMessage, origin string) string {
		id := fmt.Sprintf("ccg-context-%d", len(attachments))
		entry := map[string]any{"id": id, "kind": kind, "origin": origin}
		if kind == "system" {
			entry["message"] = value
		} else {
			entry["block"] = value
		}
		attachments = append(attachments, entry)
		return id
	}
	var extractContent func(json.RawMessage, string) (json.RawMessage, error)
	extractText := func(block map[string]json.RawMessage, text, origin string) (json.RawMessage, error) {
		spans := reminderSpans(text)
		if len(spans) == 0 {
			return json.Marshal(block)
		}
		parts := make([]map[string]string, 0, len(spans)*2+1)
		previous := 0
		for _, span := range spans {
			if span[0] > previous {
				parts = append(parts, map[string]string{"text": text[previous:span[0]]})
			}
			rendered, _ := json.Marshal(map[string]string{"type": "text", "text": text[span[0]:span[1]]})
			id := add("reminder", rendered, fmt.Sprintf("%s.text[%d:%d]", origin, span[0], span[1]))
			parts = append(parts, map[string]string{"attachment": id})
			previous = span[1]
		}
		if previous < len(text) {
			parts = append(parts, map[string]string{"text": text[previous:]})
		}
		delete(block, "text")
		return json.Marshal(map[string]any{"type": "ccgateway_text", "block": block, "parts": parts})
	}
	extractContent = func(raw json.RawMessage, origin string) (json.RawMessage, error) {
		if bytes.Equal(bytes.TrimSpace(raw), []byte("null")) {
			return nil, fmt.Errorf("%s cannot be null", origin)
		}
		var text string
		if json.Unmarshal(raw, &text) == nil {
			if len(reminderSpans(text)) == 0 {
				return raw, nil
			}
			block := map[string]json.RawMessage{"type": json.RawMessage(`"text"`), "text": raw}
			template, err := extractText(block, text, origin)
			if err != nil {
				return nil, err
			}
			return json.Marshal([]json.RawMessage{template})
		}
		var blocks []json.RawMessage
		if json.Unmarshal(raw, &blocks) != nil || blocks == nil {
			return nil, fmt.Errorf("%s must be text or a block array", origin)
		}
		for i, value := range blocks {
			var block map[string]json.RawMessage
			if json.Unmarshal(value, &block) != nil || block == nil {
				return nil, fmt.Errorf("invalid content block at %s[%d]", origin, i)
			}
			var kind string
			_ = json.Unmarshal(block["type"], &kind)
			if kind == "ccgateway_text" || kind == "ccgateway_attachment" {
				return nil, fmt.Errorf("reserved internal content type at %s[%d]", origin, i)
			}
			switch kind {
			case "text":
				if json.Unmarshal(block["text"], &text) != nil {
					return nil, fmt.Errorf("invalid text at %s[%d]", origin, i)
				}
				if len(reminderSpans(text)) > 0 {
					var err error
					blocks[i], err = extractText(block, text, fmt.Sprintf("%s[%d]", origin, i))
					if err != nil {
						return nil, err
					}
				}
			case "tool_result":
				if content, ok := block["content"]; ok {
					converted, err := extractContent(content, fmt.Sprintf("%s[%d].content", origin, i))
					if err != nil {
						return nil, err
					}
					block["content"] = converted
					blocks[i], err = json.Marshal(block)
					if err != nil {
						return nil, err
					}
				}
			}
		}
		return json.Marshal(blocks)
	}
	for i, raw := range messages {
		var message map[string]json.RawMessage
		if json.Unmarshal(raw, &message) != nil || message == nil {
			return nil, nil, fmt.Errorf("invalid messages[%d]", i)
		}
		var role string
		_ = json.Unmarshal(message["role"], &role)
		switch role {
		case "system":
			id := add("system", raw, fmt.Sprintf("messages[%d]", i))
			ref, _ := json.Marshal(map[string]string{"attachment": id})
			out = append(out, ref)
		case "user":
			content, err := extractContent(message["content"], fmt.Sprintf("messages[%d].content", i))
			if err != nil {
				return nil, nil, err
			}
			message["content"] = content
			value, err := json.Marshal(message)
			if err != nil {
				return nil, nil, err
			}
			out = append(out, value)
		case "assistant":
			out = append(out, raw)
		default:
			return nil, nil, fmt.Errorf("invalid role at messages[%d]", i)
		}
	}
	return out, attachments, nil
}

// Balanced exact markers only. Nested markers remain one opaque rendered
// span; unmatched text stays ordinary text. Offsets are UTF-8 byte offsets.
func reminderSpans(text string) [][2]int {
	const open = "<system-reminder>"
	const close = "</system-reminder>"
	var result [][2]int
	depth, start, cursor := 0, 0, 0
	for cursor < len(text) {
		a, b := strings.Index(text[cursor:], open), strings.Index(text[cursor:], close)
		if a < 0 && b < 0 {
			break
		}
		if a >= 0 && (b < 0 || a < b) {
			if depth == 0 {
				start = cursor + a
			}
			depth++
			cursor += a + len(open)
		} else {
			cursor += b + len(close)
			if depth > 0 {
				depth--
				if depth == 0 {
					result = append(result, [2]int{start, cursor})
				}
			}
		}
	}
	return result
}
