package engine

import "fmt"

// A forced choice needs no discovery when all choices it can select are eager.
// Helper execution is denied and helper definitions are absent from the model catalog.
func (r *Request) forcedLoadedClientCatalog() bool {
	if r == nil || r.Plan == nil || !r.toolSearchEnabled() || r.structuredOutput() || r.InlineTools != nil || len(r.ServerTools) > 0 || len(r.APIClientTools) > 0 || r.MCP != nil || len(r.Plan.fields["safeguards"]) > 0 {
		return false
	}
	value, err := decodePlannedValue(r.Plan.fields["tool_choice"])
	if err != nil {
		return false
	}
	choice, ok := value.(map[string]any)
	if !ok || (str(choice, "type") != "tool" && str(choice, "type") != "any") {
		return false
	}
	selected := false
	for i := range r.Tools {
		tool := &r.Tools[i]
		if tool.DeferLoading == nil || *tool.DeferLoading && (str(choice, "type") == "any" || tool.Name == str(choice, "name")) {
			return false
		}
		if tool.Name == str(choice, "name") {
			selected = true
		}
	}
	return len(r.Tools) > 0 && (str(choice, "type") == "any" || selected)
}
func (r *Request) verifyForcedLoadedCatalog(message Object) error {
	if !r.forcedLoadedClientCatalog() {
		return nil
	}
	expected := make(map[string]Tool, len(r.Tools))
	for _, tool := range r.Tools {
		expected[r.wireName(tool.Name)] = tool
	}
	actual, _ := historyContent(message["tools"])
	seen := make(map[string]bool, len(actual))
	kept := make([]Object, 0, len(expected))
	for _, tool := range actual {
		name := str(tool, "name")
		if seen[name] {
			return fmt.Errorf("forced client catalog has duplicate tool")
		}
		seen[name] = true
		want, client := expected[name]
		if !client {
			if name != "ToolSearch" && name != "DeferredToolPlaceholder" {
				return fmt.Errorf("forced client catalog has an undeclared tool")
			}
			continue
		}
		if digest(tool["input_schema"]) != digest(want.Schema) || (tool["defer_loading"] != nil && tool["defer_loading"] != false && tool["defer_loading"] != *want.DeferLoading) {
			return fmt.Errorf("forced loaded client tool definition changed")
		}
		copy, err := jsonCopyObject(tool)
		if err != nil {
			return err
		}
		copy["defer_loading"] = *want.DeferLoading // Restore the client's explicit value, not CLI loading state.
		kept = append(kept, copy)
		delete(expected, name)
	}
	if len(expected) != 0 {
		return fmt.Errorf("forced loaded client tool missing")
	}
	if r.hasForcedDeferredBystander() {
		var err error
		kept, err = r.originalForcedCatalog()
		if err != nil {
			return err
		}
	}
	message["tools"] = kept
	return nil
}

func (r *Request) hasForcedDeferredBystander() bool {
	for _, tool := range r.Tools {
		if tool.DeferLoading != nil && *tool.DeferLoading {
			return true
		}
	}
	return false
}

// Only called after every actual client name/schema was verified. The original
// plan retains field presence, number lexemes, order and explicit deferral; CLI
// loading state is not the provider's API catalog. No missing tool is invented.
func (r *Request) originalForcedCatalog() ([]Object, error) {
	body, err := decodeObject(r.Plan.raw)
	if err != nil {
		return nil, err
	}
	tools, err := historyContent(body["tools"])
	if err != nil || len(tools) != len(r.Tools) {
		return nil, fmt.Errorf("forced original catalog unavailable")
	}
	for i, tool := range tools {
		if str(tool, "name") != r.Tools[i].Name || digest(tool["input_schema"]) != digest(r.Tools[i].Schema) {
			return nil, fmt.Errorf("forced original catalog identity changed")
		}
		tool["name"] = r.wireName(r.Tools[i].Name)
	}
	return tools, nil
}
