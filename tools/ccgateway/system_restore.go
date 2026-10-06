package main

import (
	"fmt"
	"strings"
)

// Claude Code renders client system messages as its own system-role
// attachments and merges every system attachment of a turn (its environment,
// date and similar context included) into one role "system" message. Within
// one record the text blocks are joined by "\n"; records are joined by "\n\n".
// Committed history writes one record per client message; the Mod attaches the
// whole final-turn group as one record. The outbound relay locates each client
// group by exact text in the right turn and restores the client's own system
// messages, so the model request keeps the client's message structure.

type systemGroup struct {
	Turn     int        // client assistants before the group
	Origin   int        // client array index of the group's first message
	Messages [][]string // text blocks of each client system message
}

func (r *Request) systemGroups() []systemGroup {
	var out []systemGroup
	turn := 0
	for i := 0; i < len(r.Messages); i++ {
		switch r.Messages[i].Role {
		case "assistant":
			turn++
		case "system":
			g := systemGroup{Turn: turn, Origin: i}
			if i < len(r.origin) {
				g.Origin = r.origin[i]
			}
			for ; i < len(r.Messages) && r.Messages[i].Role == "system"; i++ {
				g.Messages = append(g.Messages, systemTexts(r.Messages[i]))
			}
			i--
			out = append(out, g)
		}
	}
	return out
}

// The renderings Claude Code can produce for a group: one record per message
// (rebuilt history) or one record for the whole group (the Mod's context).
func (g systemGroup) renderings() []string {
	messages := make([]string, len(g.Messages))
	var all []string
	for i, blocks := range g.Messages {
		messages[i] = strings.Join(blocks, "\n")
		all = append(all, blocks...)
	}
	perMessage := strings.Join(messages, "\n\n")
	single := strings.Join(all, "\n")
	if perMessage == single {
		return []string{perMessage}
	}
	return []string{perMessage, single}
}

// Internal discovery rounds stay in native history and on the wire; they are
// not client turns.
func internalAssistant(m Object) bool {
	blocks, _ := m["content"].([]any)
	for _, value := range blocks {
		if b, ok := value.(map[string]any); ok && str(b, "type") == "tool_use" && str(b, "name") == "ToolSearch" {
			return true
		}
	}
	return false
}

type systemMatch struct {
	message, block, start, end int
}

// startsAfter reports whether m starts later than o, in wire order.
func (m systemMatch) startsAfter(o systemMatch) bool {
	if m.message != o.message {
		return m.message > o.message
	}
	if m.block != o.block {
		return m.block > o.block
	}
	return m.start > o.start
}

// Each wire turn's head: from its first message up to the first assistant
// message, where Claude Code places the turn's system messages.
func wireTurnHeads(messages []any) ([][2]int, error) {
	var heads [][2]int
	start, head := 0, -1
	for i, value := range messages {
		m, ok := value.(map[string]any)
		if !ok {
			return nil, fmt.Errorf("invalid model request message")
		}
		if str(m, "role") != "assistant" {
			continue
		}
		if head < 0 {
			head = i
		}
		if !internalAssistant(m) {
			heads = append(heads, [2]int{start, head})
			start, head = i+1, -1
		}
	}
	if head < 0 {
		head = len(messages)
	}
	return append(heads, [2]int{start, head}), nil
}

// The text of each block; other blocks (tool_addition, tool_removal) are
// never matched and stay with the CLI's remainder.
func systemBlockTexts(m Object) ([]string, []bool) {
	switch content := m["content"].(type) {
	case string:
		return []string{content}, []bool{true}
	case []any:
		out := make([]string, len(content))
		text := make([]bool, len(content))
		for i, value := range content {
			if b, ok := value.(map[string]any); ok && str(b, "type") == "text" {
				out[i], text[i] = str(b, "text"), true
			}
		}
		return out, text
	}
	return nil, nil
}

// restoreSystemMessages rewrites a model request body in place. Every client
// group must be found, as a whole attachment, among the system messages at the
// head of its turn; a group that is missing is an error, never a partial
// rewrite.
//
// The same text can occur more than once there, for instance when Claude
// Code's own context (a date, a token budget) reads exactly like a client
// message. Every occurrence is the same text, so whichever is taken, the
// client's messages and their place come out the same; only the order within
// Claude Code's remainder can differ. The last occurrence is taken, which keeps
// the result the same for the same input. (Request validation lets a turn have
// one group only: system messages must precede an assistant or end the array.)
func restoreSystemMessages(body Object, groups []systemGroup) error {
	if len(groups) == 0 {
		return nil
	}
	messages, ok := body["messages"].([]any)
	if !ok {
		return fmt.Errorf("model request has no messages")
	}
	heads, err := wireTurnHeads(messages)
	if err != nil {
		return err
	}
	matches := make([]systemMatch, len(groups))
	for gi, g := range groups {
		if g.Turn >= len(heads) {
			return fmt.Errorf("messages.%d: the system messages' turn is missing from Claude Code's model request", g.Origin)
		}
		var chosen *systemMatch
		for mi := heads[g.Turn][0]; mi < heads[g.Turn][1]; mi++ {
			m := messages[mi].(map[string]any)
			if str(m, "role") != "system" {
				continue
			}
			texts, isText := systemBlockTexts(m)
			for bi, text := range texts {
				if !isText[bi] {
					continue
				}
				for _, want := range g.renderings() {
					for from := 0; from <= len(text); {
						n := strings.Index(text[from:], want)
						if n < 0 {
							break
						}
						at := from + n
						end := at + len(want)
						found := systemMatch{mi, bi, at, end}
						whole := (at == 0 || strings.HasSuffix(text[:at], "\n\n")) && (end == len(text) || strings.HasPrefix(text[end:], "\n\n"))
						if whole && (chosen == nil || found.startsAfter(*chosen)) {
							chosen = &found
						}
						from = at + 1
					}
				}
			}
		}
		if chosen == nil {
			return fmt.Errorf("messages.%d: the system text is not an attachment of its turn's system message in Claude Code's model request", g.Origin)
		}
		matches[gi] = *chosen
	}
	// Rewrite from the back so earlier indices stay valid.
	for gi := len(groups) - 1; gi >= 0; gi-- {
		match := matches[gi]
		replacement := splitSystemMessage(messages[match.message].(map[string]any), match, groups[gi])
		messages = append(messages[:match.message], append(replacement, messages[match.message+1:]...)...)
	}
	body["messages"] = messages
	return nil
}

// The remainder (Claude Code's own context and directives) keeps its form and
// precedes the client's messages, which are restored one per client message
// with their text blocks. A cache breakpoint on the replaced text stays at the
// end of the replaced run.
func splitSystemMessage(m Object, match systemMatch, g systemGroup) []any {
	remainder := Object{}
	for k, v := range m {
		remainder[k] = v
	}
	var breakpoint any
	switch content := m["content"].(type) {
	case string:
		rest := joinRemainder(content[:match.start], content[match.end:])
		if rest == "" {
			remainder["content"] = []any{}
		} else {
			remainder["content"] = rest
		}
	case []any:
		var kept []any
		for i, value := range content {
			if i != match.block {
				kept = append(kept, value)
				continue
			}
			b := value.(map[string]any)
			text := str(b, "text")
			rest := joinRemainder(text[:match.start], text[match.end:])
			own := Object{}
			for k, v := range b {
				own[k] = v
			}
			if cc, has := own["cache_control"]; has && (rest == "" || i == len(content)-1) {
				breakpoint = cc
				delete(own, "cache_control")
			}
			if rest != "" {
				own["text"] = rest
				kept = append(kept, own)
			}
		}
		if kept == nil {
			kept = []any{}
		}
		remainder["content"] = kept
	}
	var out []any
	empty := false
	switch c := remainder["content"].(type) {
	case []any:
		empty = len(c) == 0
	case string:
		empty = c == ""
	}
	// output_config alone (content:[]) is kept; other empty remainder is dropped.
	if !empty || (len(remainder) > 2 && remainder["output_config"] != nil) {
		out = append(out, remainder)
	}
	for i, blocks := range g.Messages {
		content := make([]any, len(blocks))
		for j, text := range blocks {
			content[j] = Object{"type": "text", "text": text}
		}
		if breakpoint != nil && i == len(g.Messages)-1 {
			content[len(content)-1].(Object)["cache_control"] = breakpoint
		}
		out = append(out, Object{"role": "system", "content": content})
	}
	return out
}

func joinRemainder(before, after string) string {
	before = strings.TrimSuffix(before, "\n\n")
	after = strings.TrimPrefix(after, "\n\n")
	if before == "" || after == "" {
		return before + after
	}
	return before + "\n\n" + after
}
