package engine

import "fmt"

// A forced choice over an entirely loaded client catalog needs no discovery.
// Helper execution is denied and helper definitions are absent from the model catalog.
func (r *Request) forcedLoadedClientCatalog() bool {
	if r == nil || r.Plan == nil || !r.toolSearchEnabled() || r.JSONSchema != nil || r.InlineTools != nil || len(r.ServerTools) > 0 || len(r.APIClientTools) > 0 || r.MCP != nil || len(r.Plan.fields["safeguards"]) > 0 {
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
		if tool.DeferLoading == nil || *tool.DeferLoading {
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
		if digest(tool["input_schema"]) != digest(want.Schema) || (tool["defer_loading"] != nil && tool["defer_loading"] != false) {
			return fmt.Errorf("forced loaded client tool definition changed")
		}
		tool["defer_loading"] = false // Restore explicit false omitted by CLI.
		kept = append(kept, tool)
		delete(expected, name)
	}
	if len(expected) != 0 {
		return fmt.Errorf("forced loaded client tool missing")
	}
	message["tools"] = kept
	return nil
}
