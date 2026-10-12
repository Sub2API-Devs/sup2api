package engine

import (
	"encoding/json"
	"fmt"
	"time"
)

// CachePlan keeps API breakpoint placement separate from local transcript TTL.
type CachePlan struct {
	Root        any
	RootPresent bool
	System      []Object
	Tools       []Object
}

func compileCachePlan(body Object) (*CachePlan, error) {
	copy := body
	p := &CachePlan{}
	p.Root, p.RootPresent = copy["cache_control"]
	active := p.RootPresent
	var markers []Object
	var lastBlock Object
	visit := func(block Object) error {
		lastBlock = block
		if value, exists := block["cache_control"]; exists {
			active = true
			ttl := 5 * time.Minute
			if err := cacheTTL(value, &ttl); err != nil {
				return err
			}
			if value != nil {
				markers = append(markers, value.(map[string]any))
			}
		}
		return nil
	}
	p.Tools, _ = historyContent(copy["tools"])
	p.System, _ = historyContent(copy["system"])
	for _, blocks := range [][]Object{p.Tools, p.System} {
		for _, b := range blocks {
			if err := visit(b); err != nil {
				return nil, err
			}
		}
	}
	if messages, ok := copy["messages"].([]any); ok {
		for _, v := range messages {
			m, _ := v.(map[string]any)
			blocks, _ := historyContent(m["content"])
			if err := visitProtocolBlocks(blocks, visit); err != nil {
				return nil, err
			}
		}
	}
	if !active {
		return nil, nil
	}
	if p.RootPresent {
		ttl := 5 * time.Minute
		if err := cacheTTL(p.Root, &ttl); err != nil {
			return nil, err
		}
		if p.Root != nil {
			root := p.Root.(map[string]any)
			if lastBlock == nil || lastBlock["cache_control"] == nil {
				markers = append(markers, root)
			} else if cacheDuration(lastBlock["cache_control"].(map[string]any)) != cacheDuration(root) {
				return nil, fmt.Errorf("automatic cache_control conflicts with the final explicit breakpoint TTL")
			}
		}
	}
	if len(markers) > 4 {
		return nil, fmt.Errorf("cache_control supports at most four effective breakpoints")
	}
	previous := time.Hour
	for _, marker := range markers {
		ttl := cacheDuration(marker)
		if ttl > previous {
			return nil, fmt.Errorf("cache_control 1h breakpoints must precede 5m breakpoints")
		}
		previous = ttl
	}
	raw, err := json.Marshal(Object{"root": p.Root, "system": p.System, "tools": p.Tools})
	if err != nil {
		return nil, err
	}
	own, err := decodeObject(raw)
	if err != nil {
		return nil, err
	}
	p.Root = own["root"]
	p.System, _ = historyContent(own["system"])
	p.Tools, _ = historyContent(own["tools"])
	return p, nil
}

func cacheDuration(marker Object) time.Duration {
	if str(marker, "ttl") == "1h" {
		return time.Hour
	}
	return 5 * time.Minute
}

// Traverse only Anthropic content containers, never arbitrary tool input/schema.
func visitProtocolBlocks(blocks []Object, visit func(Object) error) error {
	for _, block := range blocks {
		if str(block, "type") == "compaction" {
			if err := visitProtocolBlocks(timelineChanges(block), visit); err != nil {
				return err
			}
		}
		if definition := inlineToolDefinition(block); definition != nil {
			if err := visit(definition); err != nil {
				return err
			}
		}
		if doc := webFetchedDocument(block); doc != nil {
			if err := visitProtocolBlocks([]Object{doc}, visit); err != nil {
				return err
			}
		}
		if err := visit(block); err != nil {
			return err
		}
		if str(block, "type") == "tool_result" || str(block, "type") == "search_result" {
			nested, err := historyContent(block["content"])
			if err != nil {
				return err
			}
			if err = visitProtocolBlocks(nested, visit); err != nil {
				return err
			}
		}
		if str(block, "type") == "document" {
			source, _ := block["source"].(map[string]any)
			if str(source, "type") == "content" {
				nested, err := historyContent(source["content"])
				if err != nil {
					return err
				}
				if err = visitProtocolBlocks(nested, visit); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

type historyBlockPair struct{ expected, actual []Object }

func copyBlockCache(expected, actual []Object) error {
	if len(expected) != len(actual) {
		return fmt.Errorf("cache block alignment changed")
	}
	for i, b := range expected {
		if str(b, "type") == "compaction" {
			if err := copyBlockCache(timelineChanges(b), timelineChanges(actual[i])); err != nil {
				return err
			}
		}
		if definition := inlineToolDefinition(b); definition != nil {
			out := inlineToolDefinition(actual[i])
			if out == nil {
				return fmt.Errorf("inline cached tool definition missing")
			}
			if value, exists := definition["cache_control"]; exists {
				out["cache_control"] = cloneCacheValue(value)
			}
		}
		if doc := webFetchedDocument(b); doc != nil {
			out := webFetchedDocument(actual[i])
			if out == nil {
				return fmt.Errorf("cached web fetch document changed")
			}
			if err := copyBlockCache([]Object{doc}, []Object{out}); err != nil {
				return err
			}
		}
		if value, exists := b["cache_control"]; exists {
			actual[i]["cache_control"] = cloneCacheValue(value)
		}
		if str(b, "type") == "tool_result" || str(b, "type") == "search_result" {
			e, _ := historyContent(b["content"])
			a, _ := historyContent(actual[i]["content"])
			if err := copyBlockCache(e, a); err != nil {
				return err
			}
			if _, ok := actual[i]["content"].(string); !ok {
				actual[i]["content"] = a
			}
		}
		if str(b, "type") == "document" {
			es, _ := b["source"].(map[string]any)
			as, _ := actual[i]["source"].(map[string]any)
			if str(es, "type") == "content" {
				e, _ := historyContent(es["content"])
				a, _ := historyContent(as["content"])
				if err := copyBlockCache(e, a); err != nil {
					return err
				}
				if _, ok := as["content"].(string); !ok {
					as["content"] = a
				}
			}
		}
	}
	return nil
}

func cloneCacheValue(value any) any {
	raw, _ := json.Marshal(value)
	copy, _ := decodePlannedValue(raw)
	return copy
}

// Cache directives belong to each HTTP request, not persisted CLI history.
// Keep unrelated fields (including citations and tool input) unchanged.
func withoutProtocolCache(blocks []Object) []Object {
	out := make([]Object, 0, len(blocks))
	for _, block := range blocks {
		copy := Object{}
		for key, value := range block {
			if key != "cache_control" {
				copy[key] = value
			}
		}
		if doc := webFetchedDocument(block); doc != nil {
			result := Object{}
			for key, value := range block["content"].(map[string]any) {
				result[key] = value
			}
			result["content"] = withoutProtocolCache([]Object{doc})[0]
			copy["content"] = result
		}
		if str(block, "type") == "tool_result" || str(block, "type") == "search_result" {
			if _, text := block["content"].(string); !text {
				nested, _ := historyContent(block["content"])
				copy["content"] = withoutProtocolCache(nested)
			}
		}
		if str(block, "type") == "document" {
			source, _ := block["source"].(map[string]any)
			if str(source, "type") == "content" {
				if _, text := source["content"].(string); !text {
					own := Object{}
					for key, value := range source {
						own[key] = value
					}
					nested, _ := historyContent(source["content"])
					own["content"] = withoutProtocolCache(nested)
					copy["source"] = own
				}
			}
		}
		out = append(out, copy)
	}
	return out
}
