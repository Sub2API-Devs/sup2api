package engine

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
)

// Client attachments the policy may erase, recognized by the text Claude Code
// renders for them (CLI 2.1.288–2.1.296). Each pattern covers a whole
// paragraph or line, never a mention inside other text.
var clientAttachmentPatterns = map[string][]*regexp.Regexp{
	"environment": {
		environmentSection,
		regexp.MustCompile(`(?m)^# Environment update\r?\n(?:[ \t]+-[^\r\n]*(?:\r?\n|$))+`),
	},
	"model": {regexp.MustCompile(`(?m)^You are powered by the model [^\r\n]*$`)},
	// Older CLIs render the date inside the session context under "# currentDate".
	"date":                  {regexp.MustCompile(`(?m)^(?:# currentDate\r?\n)?(?:Today's date is [^\r\n]+\.|The date has changed\. Today's date is now [^\r\n]+\.[^\r\n]*)$`)},
	"total_tokens_reminder": {regexp.MustCompile(`(?m)^<total_tokens>(?:\d+|Infinite) tokens left</total_tokens>$`)},
	// CLAUDE.md, git status and the account email: the whole context reminder.
	"session_context": {regexp.MustCompile(`(?s)<system-reminder>\r?\nAs you answer the user's questions, you can use the following context:\r?\n.*?</system-reminder>`)},
}

// erasableClientAttachments is the policy's vocabulary, shared with the core
// so both validate the same types; each has patterns above.
var erasableClientAttachments = features.ErasableClientAttachments

func validateEraseClientAttachments(types []string) error {
	return features.ValidateEraseClientAttachments(types)
}

// eraseSegments removes each match together with the blank lines separating
// it from the next paragraph, so the remaining text keeps its own layout.
func eraseSegments(text string, re *regexp.Regexp) (string, int) {
	locs := re.FindAllStringIndex(text, -1)
	for i := len(locs) - 1; i >= 0; i-- {
		s, e := locs[i][0], locs[i][1]
		tail := e
		for tail < len(text) && (text[tail] == '\n' || text[tail] == '\r') {
			tail++
		}
		if tail == len(text) {
			head := s
			for head > 0 && (text[head-1] == '\n' || text[head-1] == '\r') {
				head--
			}
			text = text[:head] + text[e:]
		} else {
			text = text[:s] + text[tail:]
		}
	}
	return text, len(locs)
}

type clientAttachmentEraser struct {
	types []string
	// replace maps a replaced type to Claude Code's own rendering on this
	// Worker (gateway_attachments.go).
	replace   map[string]string
	decisions []Object
}

// erase returns the text without the selected attachments and with the
// replaced ones in Claude Code's own rendering; "" when nothing else was in it.
func (x *clientAttachmentEraser) erase(text, where string) string {
	for _, typ := range x.types {
		for _, re := range clientAttachmentPatterns[typ] {
			before := text
			var n int
			if text, n = eraseSegments(text, re); n > 0 {
				x.decisions = append(x.decisions, Object{"source": "client", "type": typ, "where": where, "recognition": "claude_code_render", "decision": "erase", "count": n, "text_digest": digest(before)})
			}
		}
	}
	for _, typ := range features.ReplaceableClientAttachments {
		gateway, ok := x.replace[typ]
		if !ok {
			continue
		}
		for i, re := range clientAttachmentPatterns[typ] {
			before := text
			var n int
			// The environment section is replaced; an environment update (the
			// client's directory change) has no Worker counterpart and goes.
			if typ == "environment" && i > 0 {
				text, n = eraseSegments(text, re)
			} else {
				text, n = replaceSegments(text, re, gateway)
			}
			if n > 0 && text != before {
				x.decisions = append(x.decisions, Object{"source": "client", "type": typ, "where": where, "recognition": "claude_code_render", "decision": "replace_gateway", "count": n, "text_digest": digest(before)})
			}
		}
	}
	if strings.TrimSpace(text) == "" {
		return ""
	}
	return text
}

// replaceSegments puts the replacement in place of each match, keeping the
// line break that ended the match so the surrounding layout is unchanged.
func replaceSegments(text string, re *regexp.Regexp, replacement string) (string, int) {
	locs := re.FindAllStringIndex(text, -1)
	replacement = strings.TrimRight(replacement, "\r\n")
	for i := len(locs) - 1; i >= 0; i-- {
		s, e := locs[i][0], locs[i][1]
		end := ""
		switch match := text[s:e]; {
		case strings.HasSuffix(match, "\r\n"):
			end = "\r\n"
		case strings.HasSuffix(match, "\n"):
			end = "\n"
		}
		text = text[:s] + replacement + end + text[e:]
	}
	return text, len(locs)
}

// blocks erases inside text blocks and drops the ones left empty. Other block
// types (images, tool results, tool uses) are never touched.
func (x *clientAttachmentEraser) blocks(content []any, where string) ([]any, bool) {
	out := make([]any, 0, len(content))
	changed := false
	for _, value := range content {
		b, ok := value.(map[string]any)
		text, isText := b["text"].(string)
		if !ok || str(b, "type") != "text" || !isText {
			out = append(out, value)
			continue
		}
		erased := x.erase(text, where)
		if erased == text {
			out = append(out, value)
			continue
		}
		changed = true
		if erased == "" {
			continue
		}
		copied := make(map[string]any, len(b))
		for k, v := range b {
			copied[k] = v
		}
		copied["text"] = erased
		out = append(out, copied)
	}
	return out, changed
}

// eraseClientAttachments applies the policy to the client's system and
// messages before admission, so every later step (history, prompt, fallback
// attempts) sees the same erased request. The rules are fixed per policy, so
// each turn erases the same text and the prompt cache prefix stays stable.
// A user or directive message is never left empty: then it is kept as sent.
// replace (type to Claude Code's rendering on this Worker) is applied the same
// way: the same client text always becomes the same Worker text.
func eraseClientAttachments(o Object, types []string, replace map[string]string) (bool, []Object) {
	if len(types) == 0 && len(replace) == 0 {
		return false, nil
	}
	x := &clientAttachmentEraser{types: types, replace: replace}
	changed := false
	switch system := o["system"].(type) {
	case string:
		if erased := x.erase(system, "system"); erased != system {
			changed = true
			if erased == "" {
				delete(o, "system")
			} else {
				o["system"] = erased
			}
		}
	case []any:
		if blocks, ok := x.blocks(system, "system"); ok {
			changed = true
			if len(blocks) == 0 {
				delete(o, "system")
			} else {
				o["system"] = blocks
			}
		}
	}
	messages, _ := o["messages"].([]any)
	kept := make([]any, 0, len(messages))
	for i, value := range messages {
		m, ok := value.(map[string]any)
		role := str(m, "role")
		if !ok || (role != "user" && role != "system") {
			kept = append(kept, value)
			continue
		}
		where := fmt.Sprintf("messages[%d]", i)
		mark := len(x.decisions)
		var content []any
		switch v := m["content"].(type) {
		case string:
			if erased := x.erase(v, where); erased != v {
				if erased != "" {
					content = []any{erased}
				}
			} else {
				kept = append(kept, value)
				continue
			}
		case []any:
			blocks, ok := x.blocks(v, where)
			if !ok {
				kept = append(kept, value)
				continue
			}
			content = blocks
		default:
			kept = append(kept, value)
			continue
		}
		if len(content) == 0 && (role == "user" || len(m) > 2) {
			for j := mark; j < len(x.decisions); j++ {
				x.decisions[j]["decision"] = "keep_whole_message"
			}
			kept = append(kept, value)
			continue
		}
		changed = true
		if len(content) == 0 {
			continue
		}
		copied := make(map[string]any, len(m))
		for k, v := range m {
			copied[k] = v
		}
		if s, ok := content[0].(string); ok && len(content) == 1 {
			copied["content"] = s
		} else {
			copied["content"] = content
		}
		kept = append(kept, copied)
	}
	if changed && messages != nil {
		o["messages"] = kept
	}
	return changed, x.decisions
}
