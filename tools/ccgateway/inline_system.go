package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"unicode/utf16"
)

// Client system messages travel as Claude Code's own system-role attachment:
// the record a mod's prompt.submit context produces. Committed history is
// written as that record at its original position; the pending turn's systems
// are attached by the Mod. Claude Code sends both as role "system" messages
// after the user turn they follow, which is where the Messages API requires
// them. Text is preserved; the block boundaries within one contiguous group of
// system messages become newlines, and the CLI joins attachments of one turn
// (its own included) into a single system message.
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
	if _, exists := m["output_config"]; exists {
		return nil, fmt.Errorf("messages.%d: system output_config is not supported through Claude Code", index)
	}
	if err := keys(m, "role", "content"); err != nil {
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
				return nil, fmt.Errorf("messages.%d: system %s blocks are not supported through Claude Code", index, str(b, "type"))
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
			// Breakpoints move between client requests; keep history hashes stable.
			content = append(content, Object{"type": "text", "text": text})
		}
	default:
		return nil, fmt.Errorf(errSystemContent, index)
	}
	if len(content) == 0 {
		return nil, fmt.Errorf(errSystemEmpty, index)
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
	return start
}
func (r *Request) pendingWireMessage() Message {
	return r.wireMessage(r.Messages[r.pendingStart()])
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
