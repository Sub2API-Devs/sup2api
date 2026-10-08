package engine

import "fmt"

// ToolSearch is not an internal round when the client declared that native
// tool for interception. Nor may a mixed round discard a client tool call.
func internalHistoryAssistant(r *Request, message Object) bool {
	if !r.toolSearchEnabled() || r.forcedLoadedClientCatalog() {
		return false
	}
	for _, tool := range r.Tools {
		if r.wireName(tool.Name) == "ToolSearch" {
			return false
		}
	}
	content, _ := historyContent(message["content"])
	found := false
	for _, block := range content {
		if str(block, "type") != "tool_use" {
			continue
		}
		if r.completedClientHistoryBlock(block) || str(block, "name") != "ToolSearch" {
			return false
		}
		found = true
	}
	return found
}

// Align normalized client turns monotonically and exactly. Extra CC system
// attachments may surround client turns; other unmatched turns are rejected.
func alignClientHistory(r *Request, body Object) ([]historyBlockPair, error) {
	wire, ok := body["messages"].([]any)
	if !ok {
		return nil, fmt.Errorf("cache history has no outbound messages")
	}
	var out []historyBlockPair
	at := 0
	for ordinal, want := range r.Messages {
		expected := r.wireMessage(want).Content
		if err := copyBlockCache(want.Content, expected); err != nil {
			return nil, err
		}
		found := false
		for at < len(wire) {
			message, ok := wire[at].(map[string]any)
			if !ok {
				return nil, fmt.Errorf("invalid history message")
			}
			at++
			actual, err := historyContent(message["content"])
			if err != nil {
				return nil, err
			}
			if str(message, "role") == "system" && (want.Role != "system" || digest(historySkeleton(actual)) != digest(historySkeleton(expected))) {
				continue
			}
			matched := actual
			if want.Role == "user" {
				matched, err = alignUserHistoryBlocks(expected, actual)
				if err != nil {
					return nil, fmt.Errorf("client user turn %d: %w", ordinal, err)
				}
			}
			if str(message, "role") != want.Role || digest(historySkeleton(matched)) != digest(historySkeleton(expected)) {
				return nil, fmt.Errorf("cache history role or block identity changed")
			}
			message["content"] = actual
			out = append(out, historyBlockPair{expected, matched})
			found = true
			break
		}
		if !found {
			return nil, fmt.Errorf("cached client history turn missing")
		}
	}
	if r.internalCache != nil {
		if err := r.alignInternalCacheSuffix(wire[at:]); err != nil {
			return nil, err
		}
		return out, nil
	}
	for ; at < len(wire); at++ {
		message, _ := wire[at].(map[string]any)
		if str(message, "role") != "system" {
			return nil, fmt.Errorf("unmatched outbound history after cache alignment")
		}
	}
	return out, nil
}

// CLI may prepend its own user attachment, as observed with nested CC clients.
// Match one complete client block sequence, preserve the extra prefix, and
// reject duplicate matches or a trailing unknown suffix. Never match one text
// block independently, or move metadata to another equal-looking block.
func alignUserHistoryBlocks(expected, actual []Object) ([]Object, error) {
	if len(expected) == 0 || len(actual) < len(expected) {
		return nil, fmt.Errorf("client user block sequence missing")
	}
	target := digest(historySkeleton(expected))
	found := -1
	for start := 0; start+len(expected) <= len(actual); start++ {
		if digest(historySkeleton(actual[start:start+len(expected)])) == target {
			if found >= 0 {
				return nil, fmt.Errorf("ambiguous repeated client user block sequence")
			}
			found = start
		}
	}
	if found < 0 || found+len(expected) != len(actual) {
		return nil, fmt.Errorf("client user block sequence changed")
	}
	return actual[found:], nil
}

func historyContent(value any) ([]Object, error) {
	switch content := value.(type) {
	case string:
		return []Object{{"type": "text", "text": content}}, nil
	case []Object:
		return content, nil
	case []any:
		out := make([]Object, 0, len(content))
		for _, value := range content {
			block, ok := value.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("invalid citation history content")
			}
			out = append(out, block)
		}
		return out, nil
	case nil:
		return nil, nil
	default:
		return nil, fmt.Errorf("invalid citation history content")
	}
}

func historyDocuments(blocks []Object) []Object {
	var out []Object
	for _, block := range blocks {
		if str(block, "type") == "document" || str(block, "type") == "search_result" {
			out = append(out, block)
		}
		if str(block, "type") == "tool_result" {
			nested, _ := historyContent(block["content"])
			out = append(out, historyDocuments(nested)...)
		}
		if str(block, "type") == "web_fetch_tool_result" {
			result, _ := block["content"].(map[string]any)
			document, _ := result["content"].(map[string]any)
			if str(result, "type") == "web_fetch_result" && str(document, "type") == "document" {
				out = append(out, Object{"type": "web_fetch_source", "tool_use_id": block["tool_use_id"], "url": result["url"], "document": withoutProtocolCache([]Object{document})[0]})
			}
		}
		if str(block, "type") == "web_search_tool_result" {
			results, _ := historyContent(block["content"])
			for _, result := range results {
				if str(result, "type") == "web_search_result" {
					out = append(out, Object{"type": "web_search_source", "tool_use_id": block["tool_use_id"], "result": result})
				}
			}
		}
	}
	return out
}

func historySkeleton(blocks []Object) []Object {
	out := make([]Object, 0, len(blocks))
	for _, block := range blocks {
		copy := Object{}
		for key, value := range block {
			if key == "cache_control" || key == "citations" && str(block, "type") == "text" {
				continue
			}
			copy[key] = value
		}
		if doc := webFetchedDocument(block); doc != nil {
			result := Object{}
			for key, value := range block["content"].(map[string]any) {
				result[key] = value
			}
			result["content"] = historySkeleton([]Object{doc})[0]
			copy["content"] = result
		}
		if definition := inlineToolDefinition(block); definition != nil {
			target := Object{}
			for key, value := range block["tool"].(map[string]any) {
				target[key] = value
			}
			clean := Object{}
			for key, value := range definition {
				if key != "cache_control" {
					clean[key] = value
				}
			}
			target["definition"] = clean
			copy["tool"] = target
		}
		if str(block, "type") == "compaction" && block["tool_changes"] != nil {
			copy["tool_changes"] = historySkeleton(timelineChanges(block))
		}
		if str(block, "type") == "tool_result" || str(block, "type") == "search_result" {
			nested, _ := historyContent(block["content"])
			copy["content"] = historySkeleton(nested)
		}
		if str(block, "type") == "document" {
			source, _ := block["source"].(map[string]any)
			if str(source, "type") == "content" {
				own := Object{}
				for key, value := range source {
					own[key] = value
				}
				nested, _ := historyContent(source["content"])
				own["content"] = historySkeleton(nested)
				copy["source"] = own
			}
		}
		out = append(out, copy)
	}
	return out
}

// Compatibility helpers used by existing protocol fixtures.
func citationContent(v any) ([]Object, error) { return historyContent(v) }
func citationDocuments(v []Object) []Object   { return historyDocuments(v) }
func citationSkeleton(v []Object) []Object    { return historySkeleton(v) }
