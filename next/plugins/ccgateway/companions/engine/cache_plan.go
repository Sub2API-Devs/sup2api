package engine

import (
	"encoding/json"
	"fmt"
	"strings"
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

func (r *Request) applyCachePlan(body Object) error {
	if r.Plan == nil || r.Plan.cache == nil {
		return nil
	}
	if r.structuredOutput() {
		return fmt.Errorf("cache_control with legacy synthetic structured output requires formatting-continuation evidence")
	}
	if r.toolSearchEnabled() && r.internalCache == nil {
		return fmt.Errorf("internal cache evidence unavailable")
	}
	// Align everything on a detached copy before committing any mutation.
	raw, err := json.Marshal(body)
	if err != nil {
		return err
	}
	copy, err := decodeObject(raw)
	if err != nil {
		return err
	}
	if err = r.restoreCacheSystem(copy); err != nil {
		return err
	}
	alignment, err := alignClientHistory(r, copy)
	if err != nil {
		return err
	}
	if err = r.restoreCacheTools(copy); err != nil {
		return err
	}
	delete(copy, "cache_control")
	blocks, _ := historyContent(copy["system"])
	_ = visitProtocolBlocks(blocks, func(b Object) error { delete(b, "cache_control"); return nil })
	messages, _ := copy["messages"].([]any)
	for _, v := range messages {
		m, _ := v.(map[string]any)
		blocks, _ := historyContent(m["content"])
		_ = visitProtocolBlocks(blocks, func(b Object) error { delete(b, "cache_control"); return nil })
	}
	for _, pair := range alignment {
		if err = copyBlockCache(pair.expected, pair.actual); err != nil {
			return err
		}
	}
	if err = r.restoreCacheSystemMarkers(copy); err != nil {
		return err
	}
	if r.Plan.cache.RootPresent {
		copy["cache_control"] = cloneCacheValue(r.Plan.cache.Root)
	}
	if r.internalCache != nil {
		if _, err := compileCachePlan(copy); err != nil {
			return fmt.Errorf("internal cache round: %w", err)
		}
	}
	for key := range body {
		delete(body, key)
	}
	for key, value := range copy {
		body[key] = value
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

func (r *Request) restoreCacheTools(body Object) error {
	actual, _ := historyContent(body["tools"])
	byName := map[string]Object{}
	for _, b := range actual {
		delete(b, "cache_control")
		name := apiToolName(b)
		if str(b, "type") == "mcp_toolset" {
			name = "mcp:" + str(b, "mcp_server_name")
		}
		if byName[name] != nil {
			return fmt.Errorf("duplicate tools in cache prefix")
		}
		byName[name] = b
	}
	if r.internalCache == nil && len(actual) != len(r.Plan.cache.Tools) {
		return fmt.Errorf("cache tool prefix differs from client definitions")
	}
	ordered := make([]Object, 0, len(actual))
	for _, want := range r.Plan.cache.Tools {
		name := r.wireName(str(want, "name"))
		if str(want, "type") == "mcp_toolset" {
			name = "mcp:" + str(want, "mcp_server_name")
		}
		if serverToolName(str(want, "type")) != "" {
			name = str(want, "name")
		}
		if apiClientType(str(want, "type")) {
			name = apiToolName(want)
		}
		tool := byName[name]
		if tool == nil && r.internalCache != nil && want["cache_control"] == nil {
			// Deferred tools are not hoisted into the model's directory merely for caching.
			deferred := false
			for _, client := range r.Tools {
				if r.wireName(client.Name) == name && client.DeferLoading != nil && *client.DeferLoading {
					deferred = true
				}
			}
			if deferred {
				continue
			}
		}
		matches := tool != nil && digest(tool["input_schema"]) == digest(want["input_schema"])
		if apiClientType(str(want, "type")) || str(want, "type") == "mcp_toolset" {
			expected, _ := jsonCopyObject(want)
			delete(expected, "cache_control")
			matches = digest(tool) == digest(expected)
		}
		if !matches {
			return fmt.Errorf("cache tool identity or schema changed")
		}
		if value, exists := want["cache_control"]; exists {
			tool["cache_control"] = cloneCacheValue(value)
		}
		ordered = append(ordered, tool)
		delete(byName, name)
	}
	if r.internalCache != nil {
		for _, tool := range actual {
			if byName[apiToolName(tool)] == nil {
				continue
			}
			if err := r.checkInternalCacheHelper(tool); err != nil {
				return err
			}
			ordered = append(ordered, tool)
		}
	}
	if len(ordered) != 0 || body["tools"] != nil {
		body["tools"] = ordered
	}
	return nil
}

// CC joins top-level client system blocks. Split only an exact complete match.
func (r *Request) restoreCacheSystem(body Object) error {
	want := r.Plan.cache.System
	marked := false
	var texts []string
	for _, b := range want {
		texts = append(texts, str(b, "text"))
		if _, ok := b["cache_control"]; ok {
			marked = true
		}
	}
	if !marked {
		return nil
	}
	actual, err := historyContent(body["system"])
	if err != nil {
		return err
	}
	exact := 0
	for start := 0; start+len(want) <= len(actual); start++ {
		if digest(historySkeleton(actual[start:start+len(want)])) == digest(historySkeleton(want)) {
			exact++
		}
	}
	if exact == 1 {
		return nil
	}
	if exact > 1 {
		return fmt.Errorf("ambiguous cached system block sequence")
	}
	joined := strings.Join(texts, "\n\n")
	found := -1
	for i, b := range actual {
		if str(b, "type") == "text" && str(b, "text") == joined {
			if found >= 0 {
				return fmt.Errorf("ambiguous cached system block")
			}
			found = i
		}
	}
	if found < 0 {
		return fmt.Errorf("cached client system boundaries cannot be restored")
	}
	replaced := append([]Object{}, actual[:found]...)
	for _, b := range want {
		replaced = append(replaced, Object{"type": "text", "text": str(b, "text")})
	}
	replaced = append(replaced, actual[found+1:]...)
	body["system"] = replaced
	return nil
}

func (r *Request) restoreCacheSystemMarkers(body Object) error {
	want := r.Plan.cache.System
	actual, _ := historyContent(body["system"])
	marked := false
	for _, b := range want {
		if _, ok := b["cache_control"]; ok {
			marked = true
		}
	}
	if !marked {
		return nil
	}
	match := -1
	for start := 0; start+len(want) <= len(actual); start++ {
		if digest(historySkeleton(actual[start:start+len(want)])) == digest(historySkeleton(want)) {
			if match >= 0 {
				return fmt.Errorf("ambiguous cache system prefix")
			}
			match = start
		}
	}
	if match < 0 {
		return fmt.Errorf("cache system prefix missing")
	}
	return copyBlockCache(want, actual[match:match+len(want)])
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
