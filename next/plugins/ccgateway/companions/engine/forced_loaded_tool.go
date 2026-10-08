package engine

import "fmt"

// A named, already-loaded client target needs no discovery round. This does
// not disable the search feature: it denies helper execution for this call.
func (r *Request) forcedLoadedClientTool() *Tool {
	if r == nil || r.Plan == nil || !r.toolSearchEnabled() || r.JSONSchema != nil || r.InlineTools != nil || len(r.ServerTools) > 0 || len(r.APIClientTools) > 0 || r.MCP != nil || len(r.Plan.fields["safeguards"]) > 0 {
		return nil
	}
	value, err := decodePlannedValue(r.Plan.fields["tool_choice"])
	if err != nil {
		return nil
	}
	choice, ok := value.(map[string]any)
	if !ok || str(choice, "type") != "tool" {
		return nil
	}
	var selected *Tool
	for i := range r.Tools {
		tool := &r.Tools[i]
		if tool.DeferLoading == nil || *tool.DeferLoading {
			return nil
		}
		if tool.Name == str(choice, "name") {
			selected = tool
		}
	}
	return selected
}
func (r *Request) verifyForcedLoadedCatalog(message Object) error {
	if r.forcedLoadedClientTool() == nil {
		return nil
	}
	actual, _ := historyContent(message["tools"])
	for _, want := range r.Tools {
		count := 0
		for _, tool := range actual {
			if str(tool, "name") != r.wireName(want.Name) {
				continue
			}
			count++
			if digest(tool["input_schema"]) != digest(want.Schema) || tool["defer_loading"] != nil && tool["defer_loading"] != false {
				return fmt.Errorf("forced loaded client tool definition changed")
			}
			tool["defer_loading"] = false // CLI omits false for an already-loaded definition; restore the explicit API value.
		}
		if count != 1 {
			names := []string{}
			for _, item := range actual {
				names = append(names, str(item, "name"))
			}
			return fmt.Errorf("forced loaded client tool missing or duplicated: expected %s, actual %v", r.wireName(want.Name), names)
		}
	}
	return nil
}
