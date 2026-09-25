package moderation

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/json"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Hook fields (manifest hooks[].needs, gjson queries evaluated by the core).
const (
	FieldModel         = "model"
	FieldMessages      = `messages|@reverse|#(role=="user")`
	FieldInput         = `input|@reverse|#(role=="user")`
	FieldInputString   = `[input]|#(%"*")`
	FieldGeminiContent = `contents|@reverse|#(role=="user")`
)

// textFields are tried in order; the first non-empty text wins.
var textFields = []string{FieldMessages, FieldInput, FieldInputString, FieldGeminiContent}

// extractText returns the latest user message text from the hook fields
// (CONTRACTS §20.4 step 4), with <system-reminder> blocks removed and
// trimmed.
func extractText(fields map[string]string) string {
	for _, f := range textFields {
		raw, ok := fields[f]
		if !ok || raw == "" {
			continue
		}
		var t string
		switch f {
		case FieldInputString:
			_ = json.Unmarshal([]byte(raw), &t)
		case FieldGeminiContent:
			t = geminiText([]byte(raw))
		default:
			t = messageText([]byte(raw))
		}
		if t = strings.TrimSpace(stripSystemReminders(t)); t != "" {
			return t
		}
	}
	return ""
}

type contentBlock struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// messageText reads {content: string | [{type:"text"|"input_text", text}]}
// (Anthropic messages, OpenAI chat and responses). Other blocks
// (tool_result, images, files) are skipped.
func messageText(raw []byte) string {
	var m struct {
		Content json.RawMessage `json:"content"`
	}
	if json.Unmarshal(raw, &m) != nil {
		return ""
	}
	c := trimJSON(m.Content)
	if len(c) == 0 {
		return ""
	}
	switch c[0] {
	case '"':
		var s string
		_ = json.Unmarshal(c, &s)
		return s
	case '[':
		var blocks []contentBlock
		if json.Unmarshal(c, &blocks) != nil {
			return ""
		}
		var b strings.Builder
		for _, bl := range blocks {
			if (bl.Type == "text" || bl.Type == "input_text") && bl.Text != "" {
				if b.Len() > 0 {
					b.WriteByte('\n')
				}
				b.WriteString(bl.Text)
			}
		}
		return b.String()
	}
	return ""
}

// geminiText reads {parts: [{text}]}.
func geminiText(raw []byte) string {
	var m struct {
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	}
	if json.Unmarshal(raw, &m) != nil {
		return ""
	}
	var b strings.Builder
	for _, p := range m.Parts {
		if p.Text != "" {
			if b.Len() > 0 {
				b.WriteByte('\n')
			}
			b.WriteString(p.Text)
		}
	}
	return b.String()
}

func trimJSON(b []byte) []byte {
	for len(b) > 0 && (b[0] == ' ' || b[0] == '\n' || b[0] == '\r' || b[0] == '\t') {
		b = b[1:]
	}
	return b
}

const (
	reminderOpen  = "<system-reminder>"
	reminderClose = "</system-reminder>"
)

// stripSystemReminders removes <system-reminder>…</system-reminder> blocks
// (client-injected context, not user input). An unterminated tag is kept.
func stripSystemReminders(s string) string {
	if !strings.Contains(s, reminderOpen) {
		return s
	}
	var b strings.Builder
	for {
		i := strings.Index(s, reminderOpen)
		if i < 0 {
			break
		}
		j := strings.Index(s[i+len(reminderOpen):], reminderClose)
		if j < 0 {
			break
		}
		b.WriteString(s[:i])
		s = s[i+len(reminderOpen)+j+len(reminderClose):]
	}
	b.WriteString(s)
	return b.String()
}

// truncateText keeps the first 2/3 and the last 1/3 of max runes when text
// is longer, joined by "…[省略 N 字]…".
func truncateText(text string, max int) string {
	n := utf8.RuneCountInString(text)
	if n <= max || max <= 0 {
		return text
	}
	r := []rune(text)
	head := max * 2 / 3
	tail := max - head
	return string(r[:head]) + "…[省略 " + strconv.Itoa(n-max) + " 字]…" + string(r[n-tail:])
}

// visibleChars counts the non-whitespace runes of s.
func visibleChars(s string) int {
	n := 0
	for _, r := range s {
		if !unicode.IsSpace(r) {
			n++
		}
	}
	return n
}

// textHash is the hex sha256 of text.
func textHash(text string) [32]byte { return sha256.Sum256([]byte(text)) }

// sampled decides deterministically (by text hash) whether text is
// moderated at rate percent.
func sampled(h [32]byte, rate int) bool {
	if rate >= 100 {
		return true
	}
	return binary.BigEndian.Uint64(h[:8])%100 < uint64(rate)
}

// fieldString decodes a JSON string hook field ("" when absent or not a
// string).
func fieldString(raw string) string {
	if strings.HasPrefix(raw, `"`) {
		var s string
		if json.Unmarshal([]byte(raw), &s) == nil {
			return s
		}
	}
	return ""
}
