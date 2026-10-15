package engine

import "fmt"

// A client-run tool search (Claude Code's own ToolSearch, as Claude desktop
// sends it) answers with tool_reference blocks inside its tool_result: each
// names a declared tool the model may now call. The CLI replays them in its
// own transcript, so they cross the wire with the CLI-side tool name.

func checkToolReference(block Object) error {
	if err := keys(block, "type", "tool_name"); err != nil {
		return err
	}
	if !toolName.MatchString(str(block, "tool_name")) {
		return fmt.Errorf("invalid tool_reference")
	}
	return nil
}

// validateToolReferences admits a reference only to a tool of this request.
func (r *Request) validateToolReferences() error {
	for _, m := range r.Messages {
		for _, b := range m.Content {
			if str(b, "type") != "tool_result" {
				continue
			}
			nested, _ := historyContent(b["content"])
			for _, ref := range nested {
				if str(ref, "type") == "tool_reference" && !r.declaresTool(str(ref, "tool_name")) {
					return fmt.Errorf("tool_reference names an undeclared tool")
				}
			}
		}
	}
	return nil
}

func (r *Request) declaresTool(name string) bool {
	for _, tool := range r.Tools {
		if tool.Name == name {
			return true
		}
	}
	return false
}

// wireToolReferences renames tool_reference blocks of tool_result content to
// the CLI-side tool names; other content is returned as is.
func (r *Request) wireToolReferences(content any) any {
	blocks, ok := content.([]Object)
	if !ok {
		return content
	}
	out := make([]Object, len(blocks))
	for i, b := range blocks {
		out[i] = b
		if str(b, "type") == "tool_reference" {
			out[i] = Object{"type": "tool_reference", "tool_name": r.wireName(str(b, "tool_name"))}
		}
	}
	return out
}
