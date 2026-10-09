package engine

import (
	"fmt"
	"strings"
)

// The CLI may fold its own session attachment into a tool result. Claude Code
// 2.1.292 does this when normalizing messages for the API: sibling
// <system-reminder> text blocks of a user turn go into its last tool result.
// String content becomes [content.trim(), reminder].filter(Boolean).join("\n\n")
// (both ends of the client text are trimmed); array content has every text
// block trimmed, empty ones dropped and adjacent ones joined by a blank line,
// the reminder joined to the last text block. Earlier CLIs only trimmed the
// end of string content.
//
// Only a fold of a reminder the Mod acknowledged is recognized, compared with
// the client's own tool result. This request-local view is only for strict
// client-history alignment: the client's tool result is used as sent, and the
// CLI's reminder is appended at the same user/block location before encoding
// (to a string, after a blank line; to an array, as its own last text block,
// so no client block changes).
func normalizeToolResultContexts(req *Request, body Object, control *modControl) (func(Object) error, error) {
	noop := func(Object) error { return nil }
	if control == nil {
		return noop, nil
	}
	control.mu.Lock()
	suffixes := make(map[string]bool, len(control.sessionContexts))
	reminders := make([]string, 0, len(control.sessionContexts))
	for text := range control.sessionContexts {
		reminder := "<system-reminder>\n" + text + "\n</system-reminder>"
		suffixes["\n\n"+reminder] = true
		reminders = append(reminders, reminder)
	}
	control.mu.Unlock()
	if len(suffixes) == 0 {
		return noop, nil
	}
	expected, err := clientToolResultContexts(req)
	if err != nil {
		return nil, err
	}
	var repairs []toolResultContextRepair
	seen := map[string]bool{}
	user := 0
	messages, _ := body["messages"].([]any)
	for _, raw := range messages {
		message, _ := raw.(Object)
		if str(message, "role") != "user" {
			continue
		}
		blocks, err := historyContent(message["content"])
		if err != nil {
			return nil, err
		}
		for index, block := range blocks {
			if str(block, "type") != "tool_result" {
				continue
			}
			id := str(block, "tool_use_id")
			if seen[id] {
				return nil, fmt.Errorf("duplicate outbound tool result identity")
			}
			seen[id] = true
			want, exists := expected[id]
			if !exists {
				continue
			}
			original, suffix, recognized, err := toolResultContextFold(want["content"], block["content"], suffixes, reminders)
			if err != nil {
				return nil, err
			}
			if !recognized {
				continue
			}
			view := Object{}
			for k, v := range block {
				view[k] = v
			}
			view["content"] = original
			if digest(historySkeleton([]Object{view})) != digest(historySkeleton([]Object{want})) {
				return nil, fmt.Errorf("tool result metadata changed with session attachment")
			}
			repairs = append(repairs, toolResultContextRepair{user, index, id, original, suffix})
		}
		user++
	}
	// All candidates are validated before changing the private wire view.
	blocks := make([]Object, len(repairs))
	for i, p := range repairs {
		b, err := p.locate(body)
		if err != nil {
			return nil, err
		}
		blocks[i] = b
	}
	for i, p := range repairs {
		blocks[i]["content"] = p.original
	}
	return func(target Object) error {
		blocks := make([]Object, len(repairs))
		restored := make([]any, len(repairs))
		for i, p := range repairs {
			b, err := p.locate(target)
			if err != nil {
				return err
			}
			if restored[i], err = p.restore(b["content"]); err != nil {
				return err
			}
			blocks[i] = b
		}
		for i := range repairs {
			blocks[i]["content"] = restored[i]
		}
		return nil
	}, nil
}

// The ECMAScript WhiteSpace + LineTerminator set used by trim and trimEnd,
// deliberately not unicode.IsSpace: NEL, U+180E and U+200B are not included.
// The client text is restored in full before the current authenticated suffix
// is returned.
const jsTrimCharacters = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"

// toolResultContextFold reports whether actual is the client's content with
// one trusted reminder folded in by the CLI. It returns the client's content
// for the alignment view, and what to append to it when sending: the string
// suffix, or for array content the reminder text of its own last block.
func toolResultContextFold(want, actual any, suffixes map[string]bool, reminders []string) (any, string, bool, error) {
	switch original := want.(type) {
	case string:
		text, ok := actual.(string)
		if !ok || text == original {
			return nil, "", false, nil
		}
		suffix, recognized := toolResultContextSuffix(original, text, suffixes)
		if !recognized {
			return nil, "", false, nil
		}
		return original, suffix, true, nil
	case []any, []Object:
		blocks, err := historyContent(original)
		if err != nil {
			return nil, "", false, err
		}
		folded, ok := actual.([]any)
		if !ok || len(blocks) == 0 {
			return nil, "", false, nil
		}
		got, err := historyContent(folded)
		if err != nil {
			return nil, "", false, err
		}
		target := digest(historySkeleton(got))
		if target == digest(historySkeleton(blocks)) {
			return nil, "", false, nil
		}
		for _, reminder := range reminders {
			if digest(historySkeleton(cliFoldedToolResultBlocks(blocks, reminder))) == target {
				return original, reminder, true, nil
			}
		}
	}
	return nil, "", false, nil
}

// cliFoldedToolResultBlocks is the array branch of the CLI's fold: text
// blocks are rebuilt as bare {type, text} with trimmed text, empty ones are
// dropped and adjacent ones joined by a blank line; other blocks are kept.
func cliFoldedToolResultBlocks(blocks []Object, reminder string) []Object {
	out := make([]Object, 0, len(blocks)+1)
	for _, block := range append(append([]Object{}, blocks...), Object{"type": "text", "text": reminder}) {
		if str(block, "type") != "text" {
			out = append(out, block)
			continue
		}
		text := strings.Trim(str(block, "text"), jsTrimCharacters)
		if text == "" {
			continue
		}
		if last := len(out) - 1; last >= 0 && str(out[last], "type") == "text" {
			out[last] = Object{"type": "text", "text": str(out[last], "text") + "\n\n" + text}
			continue
		}
		out = append(out, Object{"type": "text", "text": text})
	}
	return out
}

// A string result is the client text, its trimEnd (earlier CLIs) or its trim
// (2.1.292), then the reminder after a blank line. A client text that trims to
// nothing is dropped by the CLI's join, leaving the reminder alone.
func toolResultContextSuffix(original, actual string, trusted map[string]bool) (string, bool) {
	for _, prefix := range []string{original, strings.TrimRight(original, jsTrimCharacters), strings.Trim(original, jsTrimCharacters)} {
		if !strings.HasPrefix(actual, prefix) {
			continue
		}
		suffix := strings.TrimPrefix(actual, prefix)
		if trusted[suffix] {
			return suffix, true
		}
		if prefix == "" && suffix != "" && trusted["\n\n"+suffix] {
			return suffix, true
		}
	}
	return "", false
}

type toolResultContextRepair struct {
	user, block int
	id          string
	original    any
	suffix      string
}

// restore returns the content to send: the client's content, then the CLI's
// context. Array content is compared without cache fields, which the cache
// plan restores from the client in between; an already restored content is
// returned unchanged.
func (p toolResultContextRepair) restore(current any) (any, error) {
	changed := fmt.Errorf("session attachment tool-result content changed")
	if original, ok := p.original.(string); ok {
		text, ok := current.(string)
		if !ok || text != original && text != original+p.suffix {
			return nil, changed
		}
		return original + p.suffix, nil
	}
	if _, ok := current.(string); ok {
		return nil, changed
	}
	blocks, err := historyContent(current)
	if err != nil {
		return nil, err
	}
	want, _ := historyContent(p.original)
	reminder := Object{"type": "text", "text": p.suffix}
	switch digest(historySkeleton(blocks)) {
	case digest(historySkeleton(want)):
		out := make([]any, 0, len(blocks)+1)
		for _, block := range blocks {
			out = append(out, block)
		}
		return append(out, reminder), nil
	case digest(historySkeleton(append(append([]Object{}, want...), reminder))):
		return current, nil
	}
	return nil, changed
}

func (p toolResultContextRepair) locate(target Object) (Object, error) {
	ordinal := 0
	rows, _ := target["messages"].([]any)
	for _, raw := range rows {
		m, _ := raw.(Object)
		if str(m, "role") != "user" {
			continue
		}
		if ordinal != p.user {
			ordinal++
			continue
		}
		blocks, err := historyContent(m["content"])
		if err != nil {
			return nil, err
		}
		if p.block >= len(blocks) {
			break
		}
		b := blocks[p.block]
		if str(b, "type") != "tool_result" || str(b, "tool_use_id") != p.id {
			break
		}
		return b, nil
	}
	return nil, fmt.Errorf("session attachment tool-result position changed")
}

func clientToolResultContexts(req *Request) (map[string]Object, error) {
	expected := map[string]Object{}
	for _, message := range req.Messages {
		if message.Role != "user" {
			continue
		}
		for _, block := range req.wireMessage(message).Content {
			if str(block, "type") != "tool_result" {
				continue
			}
			id := str(block, "tool_use_id")
			if _, exists := expected[id]; exists {
				return nil, fmt.Errorf("duplicate client tool result identity")
			}
			expected[id] = block
		}
	}

	return expected, nil
}
