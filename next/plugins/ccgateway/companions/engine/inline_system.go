package engine

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode/utf16"
)

// Client system messages travel as Claude Code's own system-role attachment:
// the record a mod's prompt.submit context produces. Committed history is
// written as one such record per client message at its original position; the
// pending turn's messages are attached by the Mod as one record (one prompt
// submission yields one record). Claude Code merges a turn's system records,
// its own context included, into one system message; the outbound relay
// (system_restore.go) restores the client's messages before the model request.
const systemContextPrefix = "prompt.submit hook additional context: "

// Claude Code shortens a prompt.submit context entry beyond these lengths
// (UTF-16 units) to a head and a file path. Refuse rather than truncate.
const (
	pendingSystemBlockLimit = 100000
	pendingSystemTotalLimit = 200000
)

// index is the message's position in the client's array, for error messages.
// Errors the Messages API also returns use its wording; the rest are gateway
// limits the API itself would accept.
func parseSystemMessage(m Object, index int, ttl *time.Duration) ([]Object, error) {
	if err := validateInlineSystemMetadata(m, index); err != nil {
		return nil, err
	}
	if err := keys(m, "role", "content", "clear_at", "output_config"); err != nil {
		return nil, err
	}
	var content []Object
	switch v := m["content"].(type) {
	case string:
		if v == "" {
			return nil, fmt.Errorf(errSystemEmpty, index)
		}
		content = []Object{{"type": "text", "text": v}}
	case []any:
		for _, value := range v {
			b, ok := value.(map[string]any)
			if !ok {
				return nil, fmt.Errorf(errSystemBlock, index)
			}
			switch str(b, "type") {
			case "text":
			case "tool_addition", "tool_removal":
				if err := checkInlineToolBlock(b); err != nil {
					return nil, err
				}
				if err := cacheTTL(b["cache_control"], ttl); err != nil {
					return nil, err
				}
				content = append(content, b)
				continue
			default:
				return nil, fmt.Errorf(errSystemBlock, index)
			}
			if err := keys(b, "type", "text", "cache_control"); err != nil {
				return nil, err
			}
			text, ok := b["text"].(string)
			if !ok {
				return nil, fmt.Errorf("invalid system text")
			}
			if text == "" {
				return nil, fmt.Errorf(errTextEmpty)
			}
			if err := cacheTTL(b["cache_control"], ttl); err != nil {
				return nil, err
			}
			block := Object{"type": "text", "text": text}
			if value, exists := b["cache_control"]; exists {
				block["cache_control"] = value
			}
			content = append(content, block)
		}
	default:
		return nil, fmt.Errorf(errSystemContent, index)
	}
	if len(content) == 0 && !validInlineDirective(m) {
		return nil, fmt.Errorf(errSystemEmpty, index)
	}
	if content == nil {
		content = []Object{}
	}
	return content, nil
}

// The pending turn is the user message after the last assistant message,
// followed by any system messages that end the request.
func (r *Request) pendingStart() int {
	start := 0
	for i, m := range r.Messages {
		if m.Role == "assistant" {
			start = i + 1
		}
	}
	for start < len(r.Messages) && r.Messages[start].Role == "system" {
		start++
	}
	return start
}
func (r *Request) pendingWireMessage() Message {
	if r.continuation != "" {
		return Message{Role: "user", Content: []Object{{"type": "text", "text": r.continuation}}}
	}
	out := Message{Role: "user"}
	for _, message := range r.Messages[r.pendingStart():] {
		if message.Role == "user" {
			out.Content = append(out.Content, r.wireMessage(message).Content...)
		}
	}
	return out
}
func (r *Request) pendingSystems() []string {
	var out []string
	for _, m := range r.Messages[r.pendingStart():] {
		if m.Role == "system" {
			out = append(out, systemTexts(m)...)
		}
	}
	return out
}
func systemTexts(m Message) []string {
	if m.toolCarrier != "" {
		return []string{m.toolCarrier}
	}
	out := make([]string, 0, len(m.Content))
	for _, b := range m.Content {
		out = append(out, str(b, "text"))
	}
	return out
}
func utf16Length(s string) int { return len(utf16.Encode([]rune(s))) }
func validatePendingSystems(r *Request) error {
	total := 0
	for _, text := range r.pendingSystems() {
		n := utf16Length(text)
		if n > pendingSystemBlockLimit {
			return fmt.Errorf("a system text block in the final turn exceeds %d characters", pendingSystemBlockLimit)
		}
		total += n
	}
	if total > pendingSystemTotalLimit {
		return fmt.Errorf("system text in the final turn exceeds %d characters", pendingSystemTotalLimit)
	}
	return nil
}

// Same record shape and rendering as the CLI writes for prompt.submit context.
func systemRow(texts []string, parent, sid, cwd, version string) (json.RawMessage, string) {
	id := uuid()
	var p any
	if parent != "" {
		p = parent
	}
	row := Object{
		"parentUuid":   p,
		"isSidechain":  false,
		"attachment":   Object{"type": "hook_additional_context", "content": texts, "hookName": "prompt.submit", "toolUseID": "hook-" + uuid(), "hookEvent": "UserPromptSubmit"},
		"type":         "attachment",
		"uuid":         id,
		"timestamp":    time.Now().UTC().Format(time.RFC3339Nano),
		"rendered":     []Object{{"content": "<system-reminder>\n" + systemContextPrefix + strings.Join(texts, "\n") + "\n</system-reminder>"}},
		"renderedRole": "system",
		"userType":     "external",
		"entrypoint":   "sdk-cli",
		"cwd":          cwd,
		"sessionId":    sid,
		"version":      version,
	}
	b, _ := json.Marshal(row)
	return b, id
}

// The Mod acknowledges the context it attached; the native transcript must
// then hold one more such record than the history this run started from.
func nativeSystemRecorded(before, after []json.RawMessage, texts []string) bool {
	return countSystemRows(after, texts) > countSystemRows(before, texts)
}
func countSystemRows(rows []json.RawMessage, texts []string) int {
	want := digest(texts)
	n := 0
	for _, raw := range rows {
		var row struct {
			Type       string `json:"type"`
			Attachment struct {
				Type     string   `json:"type"`
				HookName string   `json:"hookName"`
				Content  []string `json:"content"`
			} `json:"attachment"`
		}
		if json.Unmarshal(raw, &row) == nil && row.Type == "attachment" && row.Attachment.Type == "hook_additional_context" && row.Attachment.HookName == "prompt.submit" && digest(row.Attachment.Content) == want {
			n++
		}
	}
	return n
}
