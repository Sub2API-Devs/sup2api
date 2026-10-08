package engine

import "fmt"

// Known is a history transport union. Searchable is the final timeline's
// discovery set; inactive deferred tools remain searchable, withdrawn tools do not.
func (r *Request) inlineInternalSearch() bool { return r.InlineTools != nil && r.toolSearchEnabled() }
func (r *Request) runtimeToolSearchable(name string) bool {
	return !r.inlineInternalSearch() || r.InlineTools.Searchable[name]
}
func (r *Request) validateInlineInternalSearch() error {
	if !r.inlineInternalSearch() {
		return nil
	}
	if r.MCP != nil || len(r.ServerTools) > 0 || len(r.APIClientTools) > 0 || r.JSONSchema != nil || r.Plan != nil && len(r.Plan.fields["safeguards"]) > 0 {
		return fmt.Errorf("inline internal search currently requires ordinary custom tools without execution-context extensions")
	}
	for _, m := range r.Messages {
		for _, b := range m.Content {
			if str(b, "type") == "compaction" {
				return fmt.Errorf("inline internal search compaction requires separate signed timeline evidence")
			}
		}
	}
	for _, tool := range r.Tools {
		if tool.Name == "ToolSearch" || tool.Name == "StructuredOutput" || r.Native[tool.Name] {
			return fmt.Errorf("inline internal search requires custom client identities without helper collision")
		}
	}
	return nil
}
func (r *Request) inlineSearchDiscovered(name string) bool {
	if !r.inlineInternalSearch() || !r.InlineTools.Searchable[name] || r.internalCache == nil {
		return false
	}
	r.internalCache.mu.Lock()
	defer r.internalCache.mu.Unlock()
	return r.internalCache.discovered[r.wireName(name)]
}
func (r *Request) appendInlineSearchHelpers(body Object, out []any) ([]any, error) {
	if !r.inlineInternalSearch() {
		return out, nil
	}
	actual, _ := historyContent(body["tools"])
	found := false
	for _, tool := range actual {
		if str(tool, "name") != "ToolSearch" && str(tool, "name") != "DeferredToolPlaceholder" {
			continue
		}
		if err := r.checkInternalCacheHelper(tool); err != nil {
			return nil, err
		}
		found = found || str(tool, "name") == "ToolSearch"
		out = append(out, tool)
	}
	if !found {
		return nil, fmt.Errorf("inline internal search helper missing")
	}
	return out, nil
}
