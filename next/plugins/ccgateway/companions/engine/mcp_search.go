package engine

import "fmt"

// With no deferred MCP tools the provider searches only declared API/client
// tool definitions. References still pass the existing exact identity mapper;
// an unknown reference is never reclassified as a connector tool by prefix.
func (r *Request) validateMCPClientSearch() error {
	if r.MCP == nil {
		return nil
	}
	definitions := append([]Object{}, r.MCP.toolsets...)
	for _, message := range r.Messages {
		for _, block := range message.Content {
			for _, change := range timelineChanges(block) {
				if def := inlineToolDefinition(change); str(def, "type") == "mcp_toolset" {
					definitions = append(definitions, def)
				}
			}
		}
	}
	for _, definition := range definitions {
		if mcpMayDefer(definition) {
			return fmt.Errorf("deferred MCP with API tool search requires verified cross-server reference encoding")
		}
	}
	return r.validateMCPNamespace()
}
func (r *Request) validateMCPNamespace() error {
	if r.MCP == nil {
		return nil
	}
	if len(r.Tools) > 0 {
		for _, server := range r.MCP.servers {
			if str(server, "name") == r.customToolServer() {
				return fmt.Errorf("MCP server conflicts with the client tool transport namespace")
			}
		}
	}
	return nil
}
func mcpMayDefer(definition Object) bool {
	if pinned, ok := definition["tools"].([]any); ok {
		for _, value := range pinned {
			tool, _ := value.(Object)
			name := str(tool, "name")
			if mcpConfigFlag(definition, name, "enabled", true) && mcpConfigFlag(definition, name, "defer_loading", false) {
				return true
			}
		}
		return false
	}
	if mcpConfigFlag(definition, "", "enabled", true) && mcpConfigFlag(definition, "", "defer_loading", false) {
		return true
	}
	configs, _ := definition["configs"].(Object)
	for name := range configs {
		if mcpConfigFlag(definition, name, "enabled", true) && mcpConfigFlag(definition, name, "defer_loading", false) {
			return true
		}
	}
	return false
}
