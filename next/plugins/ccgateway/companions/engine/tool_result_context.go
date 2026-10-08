package engine

import (
	"fmt"
	"strings"
)

// The CLI may append its own session attachment inside a tool-result string.
// This request-local view is only for strict client-history alignment. The
// original suffix is restored at the same user/block location before encoding.
func normalizeToolResultContexts(req *Request, body Object, control *modControl) (func(Object) error, error) {
	noop := func(Object) error { return nil }
	if control == nil {
		return noop, nil
	}
	control.mu.Lock()
	suffixes := make(map[string]bool, len(control.sessionContexts))
	for text := range control.sessionContexts {
		suffixes["\n\n<system-reminder>\n"+text+"\n</system-reminder>"] = true
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
			original, ok := want["content"].(string)
			if !ok {
				continue
			}
			actual, ok := block["content"].(string)
			if !ok || actual == original {
				continue
			}
			if !strings.HasPrefix(actual, original) || !suffixes[strings.TrimPrefix(actual, original)] {
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
			repairs = append(repairs, toolResultContextRepair{user, index, id, original, actual[len(original):]})
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
		for i, p := range repairs {
			b, err := p.locate(target)
			if err != nil {
				return err
			}
			text, ok := b["content"].(string)
			if !ok || (text != p.original && text != p.original+p.suffix) {
				return fmt.Errorf("session attachment tool-result content changed")
			}
			blocks[i] = b
		}
		for i, p := range repairs {
			blocks[i]["content"] = p.original + p.suffix
		}
		return nil
	}, nil
}

type toolResultContextRepair struct {
	user, block          int
	id, original, suffix string
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
